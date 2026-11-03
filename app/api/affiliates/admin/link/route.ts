import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// GET /api/affiliates/admin/link?userId=&affiliateId=&eventId=
// Issues a selling link for an existing affiliate on another event. Returns the
// existing link if one is already held for that event.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['affiliateId', 'eventId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    // The acting user, from the session, never from the browser.
    userId: String(auth.user.user_id),
    affiliateId: searchParams.get('affiliateId')!,
    eventId: searchParams.get('eventId')!,
  })

  return proxyToSoldOut(request, `/affiliates/admin/link?${query}`, { accessToken: auth.accessToken })
}
