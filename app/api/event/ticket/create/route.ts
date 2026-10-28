import { NextRequest } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyToSoldOut(request, '/event/ticket/create', { method: 'POST', body })
}
