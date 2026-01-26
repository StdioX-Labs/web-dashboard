import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.soldoutafrica.com/api/v1'
const SOLDOUT_API_USERNAME = process.env.SOLDOUT_API_USERNAME
const SOLDOUT_API_PASSWORD = process.env.SOLDOUT_API_PASSWORD

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { status: false, message: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Get auth token from headers
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

    console.log('Fetching attendees for event:', eventId)

    const response = await fetch(`${BASE_URL}/gl/event/attendees/list?eventId=${eventId}`, {
      method: 'GET',
      headers,
    })

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

