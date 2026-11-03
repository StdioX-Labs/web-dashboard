import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { message: 'Event ID is required', status: false },
        { status: 400 }
      )
    }

    const response = await soldoutFetch(auth.accessToken, `/gl/event/attendees/list?eventId=${encodeURIComponent(eventId)}`)

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to fetch attendees', status: false },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Attendees fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error', status: false },
      { status: 500 }
    )
  }
}

