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

  const response = await proxyToSoldOut(request, '/affiliates/admin/onboard', {
    method: 'POST',
    body,
  })

  if (response.ok) return response

  const data = await response.clone().json().catch(() => null)
  if (typeof data?.message !== 'string' || data.message.trim().toLowerCase() !== 'insufficient permissions') {
    return response
  }

  // Core answers two different problems with the same "Insufficient Permissions":
  // the organiser not managing this event, and the number already being an
  // affiliate of another organiser (a number can belong to one organiser only).
  // The event check is the one the affiliates list runs, so if the list loads
  // for this organiser, the number is what was refused.
  const check = await proxyToSoldOut(
    request,
    `/affiliates/admin/event?${new URLSearchParams({
      userId: String(body.userId),
      eventId: String(body.eventId),
    })}`
  )

  if (check.ok) {
    return NextResponse.json(
      {
        ...data,
        // So the form shows the reason under the phone input (see apiErrorField).
        field: 'mobileNumber',
        message:
          'This number is already an affiliate for another organiser on SoldOut, and a number can only sell for one organiser. Add them with a different number.',
      },
      { status: response.status }
    )
  }

  return NextResponse.json(
    { ...data, message: "Your account can't manage affiliates for this event." },
    { status: response.status }
  )
}
