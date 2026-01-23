import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, getRateLimitConfig } from '@/lib/rate-limiter'

const API_BASE_URL = 'https://api.soldoutafrica.com/api/v1'

// Configure route segment
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * OTP Verification API Route with IP-based Rate Limiting
 *
 * Security Features:
 * - IP-based rate limiting (works across tabs and browsers)
 * - Validates OTP against backend service
 * - Request logging for security auditing
 *
 * Rate Limiting:
 * - Configurable via environment variables
 * - Default: 5 attempts per 5 minutes
 * - Block duration: 15 minutes after exceeding limit
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request)
    console.log('Verify OTP proxy - Client IP:', clientIp)

    // Check rate limit (use stricter limits for OTP verification)
    const rateLimitConfig = {
      maxRequests: parseInt(process.env.OTP_VERIFY_RATE_LIMIT_MAX_REQUESTS || '5', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000', 10), // 5 minutes default
      blockDurationMs: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION_MS || '900000', 10) // 15 minutes default
    }

    const rateLimitResult = checkRateLimit(`${clientIp}:verify`, rateLimitConfig)

    // If rate limit exceeded, return 429 response
    if (!rateLimitResult.allowed) {
      console.warn(`Verify OTP proxy - Rate limit exceeded for IP: ${clientIp}`)
      return NextResponse.json(
        {
          status: false,
          message: 'Too many verification attempts. Please request a new code.',
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
    const { id, otp, method } = body

    console.log('Verify OTP proxy - Received request:', { id, method, ip: clientIp, remaining: rateLimitResult.remaining })

    if (!id || !otp || !method) {
      return NextResponse.json(
        {
          status: false,
          message: 'Missing required fields: id, otp, and method'
        },
        { status: 400 }
      )
    }

    // Validate OTP format
    if (!/^\d{4}$/.test(otp)) {
      return NextResponse.json(
        {
          status: false,
          message: 'Invalid OTP format. Must be 4 digits.'
        },
        { status: 400 }
      )
    }

    const apiUrl = `${API_BASE_URL}/user/otp/verify`
    console.log('Verify OTP proxy - Calling external API:', apiUrl)

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
        console.log('Verify OTP proxy - Using Basic Auth credentials')
      } else {
        console.error('Verify OTP proxy - Missing API credentials in environment variables')
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

      console.log('Verify OTP proxy - API response status:', response.status)

      // Get the response text first
      const responseText = await response.text()
      console.log('Verify OTP proxy - API response text:', responseText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Verify OTP proxy - API response data:', data)
      } catch (e) {
        console.error('Verify OTP proxy - Failed to parse response as JSON:', e)
        return NextResponse.json(
          {
            status: false,
            message: 'Invalid response from authentication service',
          },
          { status: 500 }
        )
      }

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
        console.error('Verify OTP proxy - Request timed out after 30 seconds')
        return NextResponse.json(
          {
            status: false,
            message: 'Request to authentication service timed out',
          },
          { status: 504 }
        )
      }

      throw fetchError
    }
  } catch (error) {
    console.error('Verify OTP Proxy Error - Full details:', error)
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

