import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const missing = requireParams(searchParams, ['eventId'])
  if (missing) return missing

  const body = await request.json()
  const eventId = encodeURIComponent(searchParams.get('eventId')!)
  return proxyToSoldOut(request, `/event/update?eventId=${eventId}`, { method: 'POST', body })
}
