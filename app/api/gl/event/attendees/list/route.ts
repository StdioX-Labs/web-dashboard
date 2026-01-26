import { NextRequest, NextResponse } from 'next/server'

const SOLDOUT_API_BASE = 'https://api.soldoutafrica.com/api/v1'
const SOLDOUT_API_USERNAME = process.env.SOLDOUT_API_USERNAME
const SOLDOUT_API_PASSWORD = process.env.SOLDOUT_API_PASSWORD

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { message: 'Event ID is required', status: false },
        { status: 400 }
      )
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('Authorization')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add basic auth if credentials are available
    if (SOLDOUT_API_USERNAME && SOLDOUT_API_PASSWORD) {
      const credentials = Buffer.from(`${SOLDOUT_API_USERNAME}:${SOLDOUT_API_PASSWORD}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    } else if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(
      `${SOLDOUT_API_BASE}/gl/event/attendees/list?eventId=${eventId}`,
      {
        method: 'GET',
        headers,
      }
    )

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

