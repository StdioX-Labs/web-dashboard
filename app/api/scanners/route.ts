import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { idFrom, scannerAccess } from '@/lib/scanner-access'

/**
 * Scanner accounts of the signed-in owner's company: door staff who sign in
 * to the gate app with a phone number and password. GET lists them; POST
 * creates one, optionally attached to an event (core checks the event is the
 * company's).
 */
export async function GET(request: NextRequest) {
  const access = await scannerAccess(request)
  if (access instanceof NextResponse) return access
  return proxyToSoldOut(request, `/gate/admin/scanners?companyId=${access.companyId}`)
}

export async function POST(request: NextRequest) {
  const access = await scannerAccess(request)
  if (access instanceof NextResponse) return access

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const eventId = body.eventId == null || body.eventId === '' ? null : idFrom(String(body.eventId))
  if (body.eventId != null && body.eventId !== '' && eventId === null) {
    return NextResponse.json({ status: false, message: 'Choose an event from the list.' }, { status: 400 })
  }

  return proxyToSoldOut(request, '/gate/admin/scanners', {
    method: 'POST',
    body: {
      companyId: access.companyId,
      name: typeof body.name === 'string' ? body.name : '',
      phone: typeof body.phone === 'string' ? body.phone : '',
      password: typeof body.password === 'string' ? body.password : '',
      eventId,
    },
  })
}
