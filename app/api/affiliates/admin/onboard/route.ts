import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// POST /api/affiliates/admin/onboard
// Creates the affiliate, generates their code, and returns a selling link for
// the event. Safe to call again — an existing affiliate/link is reused.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  // The acting organizer comes from the session, never from the browser.
  const body = { ...(await request.json()), userId: auth.user.user_id }

  const missing = ['fullName', 'mobileNumber', 'eventId'].filter(
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
    accessToken: auth.accessToken,
  })
}
