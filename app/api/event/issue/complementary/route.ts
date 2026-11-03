import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()

    console.log('Issuing complementary ticket with data:', JSON.stringify(body, null, 2))

    // The issuing organizer comes from the session, never from the browser.
    body.userId = auth.user.user_id

    const response = await soldoutFetch(auth.accessToken, '/event/issue/complementary', {
      method: 'POST',
      body,
    })

    console.log('API Response status:', response.status, response.statusText)

    // Check if response has content
    const contentType = response.headers.get('content-type')
    console.log('Response content-type:', contentType)

    // Get response text first
    const text = await response.text()
    console.log('Response text:', text)

    if (!contentType || !contentType.includes('application/json')) {
      console.error('Non-JSON response:', text)
      // The API answers an empty 200 when it refuses (it swallows its own error).
      if (response.ok && !text.trim()) {
        return NextResponse.json(
          {
            status: false,
            message: "SoldOut didn't issue the tickets. Usually the ticket type doesn't have enough complimentary tickets set aside, or the event isn't accepting sales.",
            statusCode: response.status,
          },
          { status: 502 }
        )
      }
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
    console.error('Error issuing complementary ticket:', error)
    return NextResponse.json(
      {
        status: false,
        message: error instanceof Error ? error.message : 'Failed to issue complementary ticket',
        error: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}
