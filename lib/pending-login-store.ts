import crypto from 'crypto'

interface PendingLogin {
  otp: string
  user: {
    phoneNumber: string
    role: string
    is_active: boolean
    kycStatus: string
    profile_type: string | null
    company_id: number
    user_id: number
    company_name: string
    currency: string
    email: string
  }
  createdAt: number
  attempts: number
}

// In-memory store for pending login sessions
// In production, consider using Redis or a similar store
const pendingLogins = new Map<string, PendingLogin>()

// OTP validity duration: 5 minutes
const OTP_VALIDITY_MS = 5 * 60 * 1000

// Maximum OTP verification attempts before invalidation
const MAX_ATTEMPTS = 5

// Cleanup interval: run every 2 minutes
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000

/**
 * Generate a secure random login token
 */
function generateLoginToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Store a pending login with OTP and user data server-side.
 * Returns a login token that the client uses to reference this session.
 */
export function storePendingLogin(otp: string, user: PendingLogin['user']): string {
  const token = generateLoginToken()

  pendingLogins.set(token, {
    otp,
    user,
    createdAt: Date.now(),
    attempts: 0,
  })

  return token
}

/**
 * Verify OTP against a pending login session.
 * Returns the user data if OTP is correct, null otherwise.
 * Removes the pending login on success or after max attempts.
 */
export function verifyPendingLogin(token: string, otp: string): { success: boolean; user?: PendingLogin['user']; error?: string } {
  const pending = pendingLogins.get(token)

  if (!pending) {
    return { success: false, error: 'Invalid or expired session. Please request a new code.' }
  }

  // Check if OTP has expired
  if (Date.now() - pending.createdAt > OTP_VALIDITY_MS) {
    pendingLogins.delete(token)
    return { success: false, error: 'Verification code has expired. Please request a new one.' }
  }

  // Increment attempt counter
  pending.attempts += 1

  // Check if max attempts exceeded
  if (pending.attempts > MAX_ATTEMPTS) {
    pendingLogins.delete(token)
    return { success: false, error: 'Too many failed attempts. Please request a new code.' }
  }

  // Validate OTP using timing-safe comparison
  const otpBuffer = Buffer.from(otp.padEnd(8, '\0'))
  const storedBuffer = Buffer.from(pending.otp.padEnd(8, '\0'))

  if (!crypto.timingSafeEqual(otpBuffer, storedBuffer)) {
    return { success: false, error: 'Invalid verification code. Please try again.' }
  }

  // OTP is valid — extract user data and remove pending login
  const user = pending.user
  pendingLogins.delete(token)

  return { success: true, user }
}

/**
 * Remove a pending login (e.g., when user requests a new OTP)
 */
export function removePendingLogin(token: string): void {
  pendingLogins.delete(token)
}

/**
 * Cleanup expired pending logins
 */
function cleanupExpiredLogins(): void {
  const now = Date.now()
  for (const [token, pending] of pendingLogins.entries()) {
    if (now - pending.createdAt > OTP_VALIDITY_MS) {
      pendingLogins.delete(token)
    }
  }
}

// Run cleanup periodically
if (typeof globalThis !== 'undefined') {
  // Avoid duplicate intervals in dev mode with hot reload
  const globalAny = globalThis as any
  if (!globalAny.__pendingLoginCleanupInterval) {
    globalAny.__pendingLoginCleanupInterval = setInterval(cleanupExpiredLogins, CLEANUP_INTERVAL_MS)
  }
}

