
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
        {
          status: false,
          message: 'Event ID is required'
        },
        { status: 400 }
      )
    }

    console.log('Fetching event details for eventId:', eventId)

    const response = await soldoutFetch(auth.accessToken, `/event/get?eventId=${encodeURIComponent(eventId)}`)

    console.log('API Response status:', response.status, response.statusText)

    // Check if response has content
    const contentType = response.headers.get('content-type')
    console.log('Response content-type:', contentType)

    // Get response text first
    const text = await response.text()
    console.log('Response text:', text)

    if (!contentType || !contentType.includes('application/json')) {
      console.error('Non-JSON response:', text)
      return NextResponse.json(
        {
          status: false,
          message: `API returned non-JSON response (${response.status})`,
          details: text,
          statusCode: response.status
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
          statusCode: response.status
        },
        { status: 500 }
      )
    }

    console.log('API Response data:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      {
        status: false,
        message: error instanceof Error ? error.message : 'Failed to fetch event',
        error: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}
