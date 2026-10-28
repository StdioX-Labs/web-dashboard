import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// GET /api/promocodes/toggle?id=&userId=
// Flips the code between active and inactive. Codes are never deleted, so
// their usage history survives.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['id', 'userId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    id: searchParams.get('id')!,
    userId: searchParams.get('userId')!,
  })

  return proxyToSoldOut(request, `/promocodes/toggle?${query}`)
}
