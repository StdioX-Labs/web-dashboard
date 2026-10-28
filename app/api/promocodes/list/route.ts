import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// GET /api/promocodes/list?companyId=&userId=
// Every promo code the company owns, newest first. The API has no per-event
// listing, so callers filter by eventId themselves.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['companyId', 'userId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    companyId: searchParams.get('companyId')!,
    userId: searchParams.get('userId')!,
  })

  return proxyToSoldOut(request, `/promocodes/list?${query}`)
}
