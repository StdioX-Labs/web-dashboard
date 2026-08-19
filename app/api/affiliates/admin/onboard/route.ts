import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'

// POST /api/affiliates/admin/onboard
// Creates the affiliate, generates their code, and returns a selling link for
// the event. Safe to call again — an existing affiliate/link is reused.
export async function POST(request: NextRequest) {
  const body = await request.json()

  const missing = ['userId', 'fullName', 'mobileNumber', 'eventId'].filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  )

  if (missing.length > 0) {
    return NextResponse.json(
      { status: false, message: `Missing required field(s): ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  return proxyToSoldOut(request, '/affiliates/admin/onboard', {
    method: 'POST',
    body,
  })
}
