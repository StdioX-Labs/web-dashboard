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
        { status: false, message: 'Event ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching attendees for event:', eventId)

    const response = await soldoutFetch(auth.accessToken, `/gl/event/attendees/list?eventId=${encodeURIComponent(eventId)}`)

    console.log('Attendees API Response status:', response.status, response.statusText)

    // Get response text first
    const text = await response.text()
    console.log('Attendees Response text:', text)

    if (!response.ok) {
      console.error('Non-OK response:', text)
      return NextResponse.json(
        {
          status: false,
          message: `API returned non-OK response (${response.status})`,
          details: text,
        },
        { status: response.status || 500 }
      )
    }

    // Parse the JSON
    let data
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      return NextResponse.json(
        {
          status: false,
          message: 'Failed to parse API response',
          details: text,
        },
        { status: 500 }
      )
    }

    console.log('Attendees data:', JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching attendees:', error)
    return NextResponse.json(
      {
        status: false,
        message: error instanceof Error ? error.message : 'Failed to fetch attendees',
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    )
  }
}

