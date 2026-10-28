import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// GET /api/flashsale/list?companyId=&userId=
// Every flash sale the company owns, newest first. Filter by eventId client-side.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['companyId', 'userId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    companyId: searchParams.get('companyId')!,
    userId: searchParams.get('userId')!,
  })

  return proxyToSoldOut(request, `/flashsale/list?${query}`)
}
