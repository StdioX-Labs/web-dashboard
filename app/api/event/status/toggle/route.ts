import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')
    // The acting user, from the session; core checks the OTP against them.
    const userId = auth.user.user_id

    if (!eventId) {
      return NextResponse.json(
        { status: false, message: 'eventId is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const response = await soldoutFetch(
      auth.accessToken,
      `/event/status/toggle?eventId=${encodeURIComponent(eventId)}&userId=${userId}`,
      { method: 'POST', body }
    )

    const contentType = response.headers.get('content-type')
    const text = await response.text()

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: `API returned non-JSON response (${response.status})`, details: text },
        { status: response.status || 500 }
      )
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { status: false, message: 'Failed to parse API response', details: text },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to toggle event status' },
      { status: 500 }
    )
  }
}
