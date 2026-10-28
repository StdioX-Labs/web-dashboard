import { NextRequest, NextResponse } from 'next/server'
import { checkAttempt, getBackoffConfig, getClientIp, tooManyAttemptsResponse } from '@/lib/rate-limiter'
import { storePendingLogin } from '@/lib/pending-login-store'
import { normalizeLoginId } from '@/lib/email'

const API_BASE_URL = 'https://api.soldoutafrica.com/api/v1'

// Configure route segment
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Login API Route with per-person attempt limiting
 *
 * Security Features:
 * - Attempts limited per login id + IP, so one person can't lock out others
 * - OTP and user data stored server-side only, never exposed to client
 * - Client receives an opaque loginToken to reference the pending session
 * - Request logging for security auditing
 *
 * Rate Limiting (see lib/rate-limiter):
 * - The first 50 requests are never limited
 * - After that each request waits longer than the last, doubling to a cap,
 *   and the response says how long
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const body = await request.json()
    const { method } = body

    console.log('Login proxy - Received request:', { id: body.id, method, ip: clientIp })

    if (!body.id || !method) {
      return NextResponse.json(
        {
          status: false,
          message: 'Missing required fields: id and method'
        },
        { status: 400 }
      )
    }

    // Normalise here too, not just in the API client: this route is reachable
    // directly, so the client's version is a convenience and this one is the
    // guarantee. Without it, Foo@x.com and foo@x.com are two different
    // accounts to the upstream service.
    const id = normalizeLoginId(body.id, method)

    const attempt = checkAttempt(`login:${id}:${clientIp}`, getBackoffConfig())
    if (!attempt.allowed) {
      console.warn(`Login proxy - Backing off ${id} from ${clientIp} for ${attempt.retryAfter}s`)
      return tooManyAttemptsResponse(attempt)
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

      // Get the response text first to see what we're getting
      const responseText = await response.text()
      console.log('Login proxy - API response received, length:', responseText.length)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Login proxy - API response data parsed successfully')
      } catch (e) {
        console.error('Login proxy - Failed to parse response as JSON:', e)
        return NextResponse.json(
          {
            status: false,
            message: 'Invalid response from authentication service',
          },
          { status: 500 }
        )
      }

      // If the backend returned an error, forward the message only (no sensitive data).
      // Not `error`: it says whether the account exists ("User not found for email: …").
      if (!data.status) {
        return NextResponse.json(
          { status: false, message: data.message || 'Login failed' },
          { status: response.status }
        )
      }

      // SECURITY: Store OTP and user data server-side, never expose to client
      // The client receives a loginToken to reference this pending login session
      if (data.otp && data.user) {
        const loginToken = storePendingLogin(data.otp, data.user)
        console.log('Login proxy - OTP and user data stored server-side, loginToken issued')

        return NextResponse.json(
          {
            status: true,
            message: data.message || 'OTP sent successfully',
            loginToken, // Opaque token for the client to use during OTP verification
          },
          { status: 200 }
        )
      }

      // Fallback: return only safe fields
      return NextResponse.json(
        {
          status: data.status,
          message: data.message || 'OTP sent successfully',
        },
        { status: response.status }
      )
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
      },
      { status: 500 }
    )
  }
}

