import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// DELETE /api/affiliates/admin/remove?userId=&affiliateId=[&eventId=]
// With eventId: deactivates that event's links only. Without: deactivates all
// their links and the affiliate. Always a deactivation — never a hard delete,
// so historical sales and earned commission survive.
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['affiliateId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    // The acting user, from the session, never from the browser.
    userId: String(auth.user.user_id),
    affiliateId: searchParams.get('affiliateId')!,
  })

  const eventId = searchParams.get('eventId')
  if (eventId) {
    query.set('eventId', eventId)
  }

  return proxyToSoldOut(request, `/affiliates/admin/remove?${query}`, { method: 'DELETE', accessToken: auth.accessToken })
}
