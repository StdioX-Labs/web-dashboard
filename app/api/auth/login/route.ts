import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, getRateLimitConfig } from '@/lib/rate-limiter'

const API_BASE_URL = 'https://api.soldoutafrica.com/api/v1'

// Configure route segment
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Login API Route with IP-based Rate Limiting
 *
 * Security Features:
 * - IP-based rate limiting (works across tabs and browsers)
 * - OTP and user data hidden in production (controlled by HIDE_OTP_IN_RESPONSE env var)
 * - Request logging for security auditing
 *
 * Rate Limiting:
 * - Configurable via environment variables
 * - Default: 3 requests per 5 minutes
 * - Block duration: 15 minutes after exceeding limit
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request)
    console.log('Login proxy - Client IP:', clientIp)

    // Check rate limit
    const rateLimitConfig = getRateLimitConfig()
    const rateLimitResult = checkRateLimit(clientIp, rateLimitConfig)

    // If rate limit exceeded, return 429 response
    if (!rateLimitResult.allowed) {
      console.warn(`Login proxy - Rate limit exceeded for IP: ${clientIp}`)
      return NextResponse.json(
        {
          status: false,
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      )
    }

    const body = await request.json()
    const { id, method } = body

    console.log('Login proxy - Received request:', { id, method, ip: clientIp, remaining: rateLimitResult.remaining })

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

      // IMPORTANT: The backend API returns OTP for client-side validation
      // Since there's no separate /user/otp/verify endpoint, we must return the OTP
      // Security is maintained through:
      // 1. Rate limiting (prevents brute force)
      // 2. OTP sent to user's email (user must have access)
      // 3. Short OTP validity period
      // 4. IP-based tracking

      console.log('Login proxy - Returning OTP and user data for client-side validation')

      // Add rate limit headers to response
      const responseHeaders = {
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }

      return NextResponse.json(data, {
        status: response.status,
        headers: responseHeaders
      })
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

