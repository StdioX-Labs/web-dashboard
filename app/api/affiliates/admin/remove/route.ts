import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// DELETE /api/affiliates/admin/remove?userId=&affiliateId=[&eventId=]
// With eventId: deactivates that event's links only. Without: deactivates all
// their links and the affiliate. Always a deactivation — never a hard delete,
// so historical sales and earned commission survive.
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['userId', 'affiliateId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    userId: searchParams.get('userId')!,
    affiliateId: searchParams.get('affiliateId')!,
  })

  const eventId = searchParams.get('eventId')
  if (eventId) {
    query.set('eventId', eventId)
  }

  return proxyToSoldOut(request, `/affiliates/admin/remove?${query}`, { method: 'DELETE' })
}
