import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { idFrom, requireOwnScanner, scannerAccess } from '@/lib/scanner-access'

/**
 * attach: move to another event (or detach with null); their phones follow.
 * password: set a new one, which signs their phones out.
 * active: switch on or off.
 * Only for a scanner of the signed-in owner's company.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id: rawId, action } = await params
  const id = idFrom(rawId)
  if (!id || !['attach', 'password', 'active'].includes(action)) {
    return NextResponse.json({ status: false, message: 'Unknown scanner action' }, { status: 404 })
  }

  const access = await scannerAccess(request)
  if (access instanceof NextResponse) return access
  const notOwn = await requireOwnScanner(access, id)
  if (notOwn) return notOwn

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  let upstream: Record<string, unknown>
  if (action === 'attach') {
    const eventId = body.eventId == null || body.eventId === '' ? null : idFrom(String(body.eventId))
    if (body.eventId != null && body.eventId !== '' && eventId === null) {
      return NextResponse.json({ status: false, message: 'Choose an event from the list.' }, { status: 400 })
    }
    upstream = { eventId }
  } else if (action === 'password') {
    upstream = { password: typeof body.password === 'string' ? body.password : '' }
  } else {
    upstream = { active: body.active === true }
  }

  return proxyToSoldOut(request, `/gate/admin/scanners/${id}/${action}`, { method: 'POST', body: upstream })
}
