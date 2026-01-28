import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.soldoutafrica.com/api/v1'
const SOLDOUT_API_USERNAME = process.env.SOLDOUT_API_USERNAME
const SOLDOUT_API_PASSWORD = process.env.SOLDOUT_API_PASSWORD

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    console.log('Updating event with ID:', eventId, 'Data:', body)

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

    const response = await fetch(`${BASE_URL}/event/update?eventId=${eventId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    console.log('API Response status:', response.status, response.statusText)

    const contentType = response.headers.get('content-type')
    const text = await response.text()

    if (!contentType || !contentType.includes('application/json')) {
      console.error('Non-JSON response:', text)
      return NextResponse.json(
        {
          status: false,
          message: `API returned non-JSON response (${response.status})`,
          details: text,
        },
        { status: response.status || 500 }
      )
    }

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

    console.log('API Response data:', data)

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      {
        status: false,
        message: error instanceof Error ? error.message : 'Failed to update event',
        error: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}

