/**
 * IP-based Rate Limiter
 *
 * This implements a token bucket algorithm for rate limiting API requests
 * based on IP address. It works across different tabs and browsers because
 * it tracks the IP address server-side.
 */

interface RateLimitEntry {
  count: number
  firstRequestTime: number
  lastRequestTime: number
  blockedUntil?: number
  violationCount: number // Track how many times user has been blocked
  lastViolationTime?: number // Track when last violation occurred
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  const tenMinutesAgo = now - 10 * 60 * 1000

  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.lastRequestTime < tenMinutesAgo) {
      rateLimitStore.delete(ip)
    }
  }
}, 10 * 60 * 1000)

export interface RateLimitConfig {
  maxRequests: number // Max requests per window
  windowMs: number // Time window in milliseconds
  blockDurationMs: number // Base block duration (not used with progressive blocking)
  useProgressiveBlocking?: boolean // Enable progressive blocking
}

/**
 * Calculate progressive block duration based on violation count
 * 1st violation: 1 minute
 * 2nd violation: 15 minutes
 * 3rd violation: 30 minutes
 * 4th+ violation: 60 minutes
 */
function getProgressiveBlockDuration(violationCount: number): number {
  const durations = [
    1 * 60 * 1000,      // 1 minute
    15 * 60 * 1000,     // 15 minutes
    30 * 60 * 1000,     // 30 minutes
    60 * 60 * 1000,     // 60 minutes (1 hour)
  ]

  // Use the last duration for all subsequent violations
  const index = Math.min(violationCount - 1, durations.length - 1)
  return durations[index]
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number // Seconds until the user can try again
}

/**
 * Get the real IP address from the request
 * Checks multiple headers to get the real IP behind proxies
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers)

  // Check various proxy headers
  const forwardedFor = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip') // Cloudflare
  const trueClientIp = headers.get('true-client-ip')

  // Return the first valid IP found
  if (cfConnectingIp) return cfConnectingIp
  if (trueClientIp) return trueClientIp
  if (realIp) return realIp
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim()
  }

  // Fallback to a default (should not happen in production)
  return 'unknown'
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  // If IP is currently blocked, check if block period has expired
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter
    }
  }

  // If block period has expired, reset violation count after 1 hour of good behavior
  if (entry?.blockedUntil && now >= entry.blockedUntil) {
    const oneHourAgo = now - 60 * 60 * 1000
    if (entry.lastViolationTime && entry.lastViolationTime < oneHourAgo) {
      // Reset violation count after 1 hour of no violations
      entry.violationCount = 0
    }
    // Clear the block
    entry.blockedUntil = undefined
  }

  // If no entry or window has expired, create new entry
  if (!entry || (now - entry.firstRequestTime) > config.windowMs) {
    const newEntry: RateLimitEntry = {
      count: 1,
      firstRequestTime: now,
      lastRequestTime: now,
      violationCount: entry?.violationCount || 0, // Preserve violation count
      lastViolationTime: entry?.lastViolationTime
    }
    rateLimitStore.set(ip, newEntry)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    }
  }

  // Increment count
  entry.count++
  entry.lastRequestTime = now

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    // Increment violation count
    entry.violationCount++
    entry.lastViolationTime = now

    // Calculate block duration based on progressive blocking setting
    let blockDuration: number
    if (config.useProgressiveBlocking !== false) {
      blockDuration = getProgressiveBlockDuration(entry.violationCount)
    } else {
      blockDuration = config.blockDurationMs
    }

    entry.blockedUntil = now + blockDuration
    rateLimitStore.set(ip, entry)

    const retryAfter = Math.ceil(blockDuration / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter
    }
  }

  rateLimitStore.set(ip, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.firstRequestTime + config.windowMs
  }
}

/**
 * Get rate limit configuration from environment variables
 */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '3', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000', 10), // 5 minutes default
    blockDurationMs: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION_MS || '900000', 10), // 15 minutes default (fallback for non-progressive)
    useProgressiveBlocking: process.env.USE_PROGRESSIVE_BLOCKING !== 'false', // Enabled by default
  }
}

/**
 * Clear rate limit for an IP (useful for testing)
 */
export function clearRateLimit(ip: string): void {
  rateLimitStore.delete(ip)
}

/**
 * Get current rate limit stats for an IP (useful for debugging)
 */
export function getRateLimitStats(ip: string): RateLimitEntry | null {
  return rateLimitStore.get(ip) || null
}

