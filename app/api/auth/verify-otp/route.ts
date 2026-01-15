import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = 'https://api.soldoutafrica.com/api/v1'

// Configure route segment
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * OTP Verification API Route
 *
 * Verifies the OTP by calling the external API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, otp, method } = body

    console.log('OTP verification - Received request:', { id, otp: '****', method })

    if (!id || !otp || !method) {
      return NextResponse.json(
        {
          status: false,
          message: 'Missing required fields: id, otp, and method'
        },
        { status: 400 }
      )
    }

    const apiUrl = `${API_BASE_URL}/user/otp/verify`
    console.log('OTP verification - Calling external API:', apiUrl)

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
        console.log('OTP verification - Using Basic Auth credentials')
      } else {
        console.error('OTP verification - Missing API credentials in environment variables')
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
        body: JSON.stringify({ id, otp, method }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('OTP verification - API response status:', response.status)

      // Get the response text first
      const responseText = await response.text()
      console.log('OTP verification - API response text:', responseText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log('OTP verification - API response data:', data)
      } catch (e) {
        console.error('OTP verification - Failed to parse response as JSON:', e)
        return NextResponse.json(
          {
            status: false,
            message: 'Invalid response from authentication service',
          },
          { status: 500 }
        )
      }

      // Return the response from external API
      // In production, we return all user data here since this is after verification
      return NextResponse.json(data, { status: response.status })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('OTP verification - Request timed out after 30 seconds')
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
    console.error('OTP Verification Error - Full details:', error)
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))

    return NextResponse.json(
      {
        status: false,
        message: 'Failed to verify OTP',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

