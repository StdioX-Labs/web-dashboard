import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'

// POST /api/flashsale/create
// A flash sale drops one ticket type to salePrice between startTime and
// endTime, for up to maxQuantity tickets. Times are Nairobi wall-clock
// without an offset — the API stores them as LocalDateTime.
export async function POST(request: NextRequest) {
  const body = await request.json()

  const missing = ['userId', 'flashSaleName', 'eventId', 'ticketId', 'salePrice', 'startTime', 'endTime', 'maxQuantity'].filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  )

  if (missing.length > 0) {
    return NextResponse.json(
      { status: false, message: `Missing required field(s): ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  return proxyToSoldOut(request, '/flashsale/create', {
    method: 'POST',
    body,
  })
}
