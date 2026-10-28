import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// POST /api/flashsale/update?id=
// Changes name, price, window and quantity. The event and ticket are fixed
// at creation.
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['id'])
  if (invalid) return invalid

  const body = await request.json()

  const missing = ['userId', 'flashSaleName', 'salePrice', 'startTime', 'endTime', 'maxQuantity'].filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  )

  if (missing.length > 0) {
    return NextResponse.json(
      { status: false, message: `Missing required field(s): ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  const query = new URLSearchParams({ id: searchParams.get('id')! })

  return proxyToSoldOut(request, `/flashsale/update?${query}`, {
    method: 'POST',
    body,
  })
}
