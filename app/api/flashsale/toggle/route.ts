import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// GET /api/flashsale/toggle?id=&userId=
// Pauses or resumes the sale.
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

  return proxyToSoldOut(request, `/flashsale/toggle?${query}`, { accessToken: auth.accessToken })
}
