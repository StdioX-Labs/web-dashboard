import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.soldoutafrica.com/api/v1'
const SOLDOUT_API_USERNAME = process.env.SOLDOUT_API_USERNAME
const SOLDOUT_API_PASSWORD = process.env.SOLDOUT_API_PASSWORD

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ticketId = searchParams.get('ticketId')

    if (!ticketId) {
      return NextResponse.json(
        {
          status: false,
          message: 'Ticket ID is required'
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('=== Ticket Update Request ===')
    console.log('Ticket ID:', ticketId)
    console.log('Request body:', JSON.stringify(body, null, 2))

    // Get auth token from headers
    const authHeader = request.headers.get('Authorization')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add basic auth if credentials are available
    if (SOLDOUT_API_USERNAME && SOLDOUT_API_PASSWORD) {
      const credentials = Buffer.from(`${SOLDOUT_API_USERNAME}:${SOLDOUT_API_PASSWORD}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
      console.log('Using Basic Auth')
    } else if (authHeader) {
      headers['Authorization'] = authHeader
      console.log('Using provided Authorization header')
    } else {
      console.warn('No authentication credentials available!')
    }

    const apiUrl = `${BASE_URL}/ticket/update?ticketId=${ticketId}`
    console.log('Making request to:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    console.log('=== API Response ===')
    console.log('Status:', response.status, response.statusText)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))

    const contentType = response.headers.get('content-type')
    const text = await response.text()

    console.log('Response body:', text)

    if (!contentType || !contentType.includes('application/json')) {
      console.error('Non-JSON response received')
      return NextResponse.json(
        {
          status: false,
          message: `API returned non-JSON response (${response.status}): ${response.statusText}`,
          details: text,
        },
        { status: response.status || 500 }
      )
    }

    let data
    try {
      data = JSON.parse(text)
      console.log('Parsed response data:', JSON.stringify(data, null, 2))
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

    // Return the response even if not ok, so the client can see the error message
    if (!response.ok) {
      console.error('API returned error status:', response.status)
      console.error('Error details:', data)
      return NextResponse.json(
        {
          ...data,
          _httpStatus: response.status,
          _statusText: response.statusText
        },
        { status: response.status }
      )
    }

    console.log('=== Request successful ===')
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      {
        status: false,
        message: error instanceof Error ? error.message : 'Failed to update ticket',
        error: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}

