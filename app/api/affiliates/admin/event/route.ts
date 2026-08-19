import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// GET /api/affiliates/admin/event?userId=&eventId=
// Every affiliate selling this event, with their links and attributed sales.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['userId', 'eventId'])
  if (invalid) return invalid

  const query = new URLSearchParams({
    userId: searchParams.get('userId')!,
    eventId: searchParams.get('eventId')!,
  })

  return proxyToSoldOut(request, `/affiliates/admin/event?${query}`)
}
