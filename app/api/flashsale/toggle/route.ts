import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// GET /api/flashsale/toggle?id=&userId=
// Pauses or resumes the sale.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['id', 'userId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    id: searchParams.get('id')!,
    userId: searchParams.get('userId')!,
  })

  return proxyToSoldOut(request, `/flashsale/toggle?${query}`)
}
