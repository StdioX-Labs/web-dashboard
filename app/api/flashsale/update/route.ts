import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// POST /api/flashsale/update?id=
// Changes name, price, window and quantity. The event and ticket are fixed
// at creation.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['id'])
  if (invalid) return invalid

  // The acting organizer comes from the session, never from the browser.
  const body = { ...(await request.json()), userId: auth.user.user_id }

  const missing = ['flashSaleName', 'salePrice', 'startTime', 'endTime', 'maxQuantity'].filter(
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
    accessToken: auth.accessToken,
  })
}
