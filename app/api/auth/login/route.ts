import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = 'https://api.soldoutafrica.com/api/v1'

// Configure route segment
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Login API Route
 *
 * Security Note:
 * - In DEVELOPMENT: Returns full API response including OTP and user data (for testing)
 * - In PRODUCTION: Returns only status and message (hides OTP and user data for security)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, method } = body

    console.log('Login proxy - Received request:', { id, method })

    if (!id || !method) {
      return NextResponse.json(
        {
          status: false,
          message: 'Missing required fields: id and method'
        },
        { status: 400 }
      )
    }

    const apiUrl = `${API_BASE_URL}/user/otp/login`
    console.log('Login proxy - Calling external API:', apiUrl)
    console.log('Login proxy - Request body:', { id, method })

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      // Build headers with Basic Authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add Basic Auth credentials
      const username = process.env.SOLDOUT_API_USERNAME
      const password = process.env.SOLDOUT_API_PASSWORD

      if (username && password) {
        const basicAuth = Buffer.from(`${username}:${password}`).toString('base64')
        headers['Authorization'] = `Basic ${basicAuth}`
        console.log('Login proxy - Using Basic Auth credentials')
      } else {
        console.error('Login proxy - Missing API credentials in environment variables')
        return NextResponse.json(
          {
            status: false,
            message: 'API credentials not configured'
          },
          { status: 500 }
        )
      }

      // Make request to external API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, method }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('Login proxy - API response status:', response.status)
      console.log('Login proxy - API response headers:', Object.fromEntries(response.headers.entries()))

      // Get the response text first to see what we're getting
      const responseText = await response.text()
      console.log('Login proxy - API response text:', responseText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Login proxy - API response data:', data)
      } catch (e) {
        console.error('Login proxy - Failed to parse response as JSON:', e)
        return NextResponse.json(
          {
            status: false,
            message: 'Invalid response from authentication service',
            rawResponse: responseText
          },
          { status: 500 }
        )
      }

      // In production, hide sensitive data (OTP and user details) for security
      if (process.env.NODE_ENV === 'production') {
        console.log('Login proxy - Sensitive data removed from response in production')
        const sanitizedResponse = {
          status: data.status || true,
          message: data.message || 'OTP sent successfully. Please check your email.'
        }
        return NextResponse.json(sanitizedResponse, { status: response.status })
      }

      // Return the full response in development mode for testing
      return NextResponse.json(data, { status: response.status })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Login proxy - Request timed out after 30 seconds')
        return NextResponse.json(
          {
            status: false,
            message: 'Request to authentication service timed out',
            error: 'Timeout after 30 seconds'
          },
          { status: 504 }
        )
      }

      throw fetchError // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('API Proxy Error - Full details:', error)
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))

    return NextResponse.json(
      {
        status: false,
        message: 'Failed to connect to authentication service',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}

