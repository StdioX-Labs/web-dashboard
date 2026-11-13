import crypto from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * A signed, httpOnly record of who proved their sign-in code, set by the
 * verify-otp route next to the browser's localStorage session.
 *
 * The localStorage session drives the UI, but anything in it can be edited in
 * the browser. Routes that act with the service login on behalf of one
 * company (scanner accounts, whose core endpoints are SUPER_ADMIN-only) read
 * the company from this cookie instead, so an organiser can only ever reach
 * their own.
 *
 * Signed with DASHBOARD_SESSION_SECRET when set; otherwise with a key derived
 * from the service password, so deploying needs no new setting. Changing
 * either signs everyone out of these routes until they sign in again.
 */
export const SESSION_COOKIE = 'soa_session'

/** The same 24 hours as the browser session (lib/session-manager). */
const MAX_AGE_SECONDS = 24 * 60 * 60

export interface DashboardSession {
  userId: number
  companyId: number
  /** Unix seconds */
  exp: number
}

function signingKey(): Buffer | null {
  const explicit = process.env.DASHBOARD_SESSION_SECRET
  if (explicit) return Buffer.from(explicit)
  const servicePassword = process.env.SOLDOUT_API_PASSWORD
  if (!servicePassword) return null
  return crypto.createHmac('sha256', servicePassword).update('web-dashboard session v1').digest()
}

function sign(body: string, key: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(body).digest()
}

/** Sets the session cookie on a response. Returns false when there is no key to sign with. */
export function setSessionCookie(response: NextResponse, userId: number, companyId: number): boolean {
  const key = signingKey()
  if (!key || !Number.isInteger(userId) || !Number.isInteger(companyId)) return false
  const session: DashboardSession = {
    userId,
    companyId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  }
  const body = Buffer.from(JSON.stringify(session)).toString('base64url')
  response.cookies.set(SESSION_COOKIE, `${body}.${sign(body, key).toString('base64url')}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  return true
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/** The verified session on a request, or null when it is missing, tampered with or expired. */
export function readSession(request: NextRequest): DashboardSession | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const key = signingKey()
  if (!token || !key) return null

  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = sign(body, key)
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null

  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as DashboardSession
    if (!Number.isInteger(session.userId) || !Number.isInteger(session.companyId)) return null
    if (typeof session.exp !== 'number' || session.exp * 1000 <= Date.now()) return null
    return session
  } catch {
    return null
  }
}
