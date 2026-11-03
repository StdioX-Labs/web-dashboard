import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// GET /api/affiliates/admin/event?userId=&eventId=
// Every affiliate selling this event, with their links and attributed sales.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['eventId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    // The acting user, from the session, never from the browser.
    userId: String(auth.user.user_id),
    eventId: searchParams.get('eventId')!,
  })

  return proxyToSoldOut(request, `/affiliates/admin/event?${query}`, { accessToken: auth.accessToken })
}
