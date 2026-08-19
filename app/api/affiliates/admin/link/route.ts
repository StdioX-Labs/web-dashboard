import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// GET /api/affiliates/admin/link?userId=&affiliateId=&eventId=
// Issues a selling link for an existing affiliate on another event. Returns the
// existing link if one is already held for that event.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['userId', 'affiliateId', 'eventId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    userId: searchParams.get('userId')!,
    affiliateId: searchParams.get('affiliateId')!,
    eventId: searchParams.get('eventId')!,
  })

  return proxyToSoldOut(request, `/affiliates/admin/link?${query}`)
}
