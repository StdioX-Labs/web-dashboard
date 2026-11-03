import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    // The scanning user comes from the session, never from the browser.
    body.userId = auth.user.user_id
    
    console.log('=== Scanner API Proxy ===')
    console.log('Request body:', JSON.stringify(body, null, 2))

    console.log('Calling backend API: /scanner/scan')

    const response = await soldoutFetch(auth.accessToken, '/scanner/scan', {
      method: 'POST',
      body,
    })

    console.log('Backend response status:', response.status)
    console.log('Backend response ok:', response.ok)

    // Get the response text first to handle non-JSON responses
    const responseText = await response.text()
    console.log('Backend response text:', responseText)

    // Try to parse as JSON
    let data
    try {
      data = responseText ? JSON.parse(responseText) : {}
      console.log('Backend response data (parsed):', JSON.stringify(data, null, 2))
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError)
      console.error('Response was:', responseText)

      // If it's a 401, return auth error
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'Authentication failed',
            status: false,
            details: 'Your session was not accepted. Please sign in again.'
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        {
          error: 'Invalid response from backend',
          status: false,
          details: `Backend returned non-JSON response: ${responseText.substring(0, 200)}`,
          backendStatus: response.status
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Scanner scan error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', errorMessage)
    console.error('Error stack:', errorStack)

    return NextResponse.json(
      { error: 'Failed to scan ticket', status: false, details: errorMessage },
      { status: 500 }
    )
  }
}

