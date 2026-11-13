import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { idFrom, requireOwnEvent, scannerAccess } from '@/lib/scanner-access'

/** Every ticket let in at one of the owner's events: when, at which gate, and who scanned it. */
export async function GET(request: NextRequest) {
  const eventId = idFrom(request.nextUrl.searchParams.get('eventId'))
  if (!eventId) {
    return NextResponse.json({ status: false, message: 'Choose an event.' }, { status: 400 })
  }

  const access = await scannerAccess(request)
  if (access instanceof NextResponse) return access
  const notOwn = await requireOwnEvent(access.companyId, eventId)
  if (notOwn) return notOwn

  return proxyToSoldOut(request, `/gate/admin/checkins?eventId=${eventId}`)
}
