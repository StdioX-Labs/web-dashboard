/**
 * Attempt limiter with incremental backoff.
 *
 * The first `freeAttempts` attempts on a key are never limited. After that,
 * each further attempt must wait longer since the previous one — the delay
 * doubles each time, up to a cap — and the response says exactly how long.
 * Nobody is shut out for a fixed block: the worst case is one wait of
 * `maxDelayMs`, and a quiet spell of `resetAfterMs` forgets the key entirely.
 *
 * Keys should name the person as well as the network (e.g. login id + IP).
 * Keying on IP alone let one person's retries lock out everyone behind the
 * same address, which on Kenyan mobile networks — where large numbers of
 * subscribers share a NAT address — is a lot of people.
 *
 * State is in memory, per server instance (in production, use Redis or
 * similar if the app runs on more than one).
 */

import { NextResponse } from 'next/server'

interface AttemptEntry {
  attempts: number
  lastAttemptTime: number
  resetAfterMs: number
}

const attemptStore = new Map<string, AttemptEntry>()

// Forget keys that have been quiet long enough to have reset anyway
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of attemptStore.entries()) {
    if (now - entry.lastAttemptTime > entry.resetAfterMs) {
      attemptStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

export interface BackoffConfig {
  freeAttempts: number // Attempts allowed before any waiting is required
  baseDelayMs: number // Wait required before the first attempt past the free ones
  maxDelayMs: number // The wait stops doubling here
  resetAfterMs: number // Quiet time after which the count starts again
}

export interface AttemptResult {
  allowed: boolean
  attempts: number
  retryAfter?: number // Seconds until the next attempt is allowed
}

const envInt = (name: string, fallback: number) => {
  const value = parseInt(process.env[name] || '', 10)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

/** Login, signup and OTP limits, overridable through the environment. */
export function getBackoffConfig(): BackoffConfig {
  return {
    freeAttempts: envInt('AUTH_FREE_ATTEMPTS', 50),
    baseDelayMs: envInt('AUTH_BACKOFF_BASE_MS', 5 * 1000),
    maxDelayMs: envInt('AUTH_BACKOFF_MAX_MS', 15 * 60 * 1000),
    resetAfterMs: envInt('AUTH_BACKOFF_RESET_MS', 60 * 60 * 1000),
  }
}

/** Wait required before attempt number `attempts + 1`. */
function requiredDelay(attempts: number, config: BackoffConfig): number {
  const extra = attempts - config.freeAttempts
  if (extra < 0) return 0
  // Capped exponent so a long run can't overflow to Infinity
  return Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** Math.min(extra, 30))
}

/**
 * Records an attempt on `key` if it is allowed now. A refused attempt is not
 * counted, so retrying early doesn't make the wait any longer.
 */
export function checkAttempt(key: string, config: BackoffConfig): AttemptResult {
  const now = Date.now()
  let entry = attemptStore.get(key)

  if (entry && now - entry.lastAttemptTime > config.resetAfterMs) {
    attemptStore.delete(key)
    entry = undefined
  }

  if (!entry) {
    attemptStore.set(key, { attempts: 1, lastAttemptTime: now, resetAfterMs: config.resetAfterMs })
    return { allowed: true, attempts: 1 }
  }

  const waitUntil = entry.lastAttemptTime + requiredDelay(entry.attempts, config)
  if (now < waitUntil) {
    return {
      allowed: false,
      attempts: entry.attempts,
      retryAfter: Math.max(1, Math.ceil((waitUntil - now) / 1000)),
    }
  }

  entry.attempts += 1
  entry.lastAttemptTime = now
  return { allowed: true, attempts: entry.attempts }
}

/** Forget a key, e.g. once the person behind it has signed in. */
export function resetAttempts(key: string): void {
  attemptStore.delete(key)
}

/** "45 seconds", "1 minute", "2 minutes 30 seconds". */
export function formatWait(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds))
  const minutes = Math.floor(s / 60)
  const rest = s % 60
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  if (minutes === 0) return part(rest, 'second')
  return rest === 0 ? part(minutes, 'minute') : `${part(minutes, 'minute')} ${part(rest, 'second')}`
}

/** The 429 for a refused attempt, telling the person how long to wait. */
export function tooManyAttemptsResponse(result: AttemptResult): NextResponse {
  const retryAfter = result.retryAfter ?? 1
  return NextResponse.json(
    {
      status: false,
      message: `Too many attempts. Please wait ${formatWait(retryAfter)} and try again.`,
      retryAfter,
    },
    { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
  )
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
