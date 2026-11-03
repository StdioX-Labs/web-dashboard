import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// GET /api/promocodes/toggle?id=&userId=
// Flips the code between active and inactive. Codes are never deleted, so
// their usage history survives.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['id'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    id: searchParams.get('id')!,
    // The acting user, from the session, never from the browser.
    userId: String(auth.user.user_id),
  })

  return proxyToSoldOut(request, `/promocodes/toggle?${query}`, { accessToken: auth.accessToken })
}
