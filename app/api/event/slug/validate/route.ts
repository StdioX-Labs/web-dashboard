import { NextRequest } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const missing = requireParams(searchParams, ['slug'])
  if (missing) return missing

  const slug = encodeURIComponent(searchParams.get('slug')!.trim())
  return proxyToSoldOut(request, `/event/slug/validate?slug=${slug}`)
}
