import { hkdfSync } from 'node:crypto'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { CompactEncrypt, compactDecrypt } from 'jose'
import type { NextResponse } from 'next/server'
import { authEnv, secureCookies } from './env'
import { refreshTokens } from './oidc'
import type { UserSession } from './user'

// The whole session (tokens + profile) lives in an encrypted, httpOnly cookie:
// JSON -> deflate -> JWE (dir, A256GCM) with a key derived from AUTH_SECRET.
// Keycloak tokens together exceed one cookie's 4 KB, so the value is split
// across soa_session.0, soa_session.1, ... and joined again on read.

export const SESSION_COOKIE = 'soa_session'
export const LOGIN_COOKIE = 'soa_oidc'
const CHUNK_SIZE = 3800
const MAX_CHUNKS = 8
/** Refresh this many seconds before the access token expires. */
const REFRESH_MARGIN_SECONDS = 60

export interface AuthSession {
  accessToken: string
  refreshToken?: string
  idToken?: string
  /** Access token expiry, epoch seconds. */
  expiresAt: number
  /** Refresh token expiry (Keycloak's SSO session limit), epoch seconds. */
  refreshExpiresAt?: number
  user: UserSession
}

interface CookieReader {
  get(name: string): { value: string } | undefined
}

const now = () => Math.floor(Date.now() / 1000)

function key(purpose: string): Uint8Array {
  return new Uint8Array(hkdfSync('sha256', authEnv.secret, '', `soa-dashboard ${purpose}`, 32))
}

export async function seal(value: unknown, purpose: string): Promise<string> {
  const plaintext = deflateRawSync(Buffer.from(JSON.stringify(value), 'utf8'))
  return new CompactEncrypt(plaintext)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(key(purpose))
}

export async function unseal<T>(jwe: string | undefined, purpose: string): Promise<T | null> {
  if (!jwe) return null
  try {
    const { plaintext } = await compactDecrypt(jwe, key(purpose))
    return JSON.parse(inflateRawSync(plaintext).toString('utf8')) as T
  } catch {
    return null
  }
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export async function readSession(cookies: CookieReader): Promise<AuthSession | null> {
  let joined = ''
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const part = cookies.get(`${SESSION_COOKIE}.${i}`)?.value
    if (!part) break
    joined += part
  }
  const session = await unseal<AuthSession>(joined || undefined, 'session')
  if (!session?.accessToken) return null
  if (session.refreshExpiresAt && session.refreshExpiresAt <= now()) return null
  return session
}

/** The cookies that carry this session, as [name, value] pairs, chunk 0 first. */
export async function sessionCookies(session: AuthSession): Promise<Array<[string, string]>> {
  const sealed = await seal(session, 'session')
  const chunks: Array<[string, string]> = []
  for (let i = 0; i * CHUNK_SIZE < sealed.length; i++) {
    chunks.push([`${SESSION_COOKIE}.${i}`, sealed.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)])
  }
  if (chunks.length > MAX_CHUNKS) throw new Error('Session too large for its cookies')
  return chunks
}

function sessionMaxAge(session: AuthSession): number {
  const fallback = 12 * 60 * 60
  return session.refreshExpiresAt ? Math.max(60, session.refreshExpiresAt - now()) : fallback
}

export async function writeSession(
  response: NextResponse,
  session: AuthSession,
  chunks?: Array<[string, string]>
): Promise<Array<[string, string]>> {
  chunks ??= await sessionCookies(session)
  const options = cookieOptions(sessionMaxAge(session))
  for (const [name, value] of chunks) response.cookies.set(name, value, options)
  // Drop chunks a previous, larger session left behind.
  for (let i = chunks.length; i < MAX_CHUNKS; i++) {
    response.cookies.set(`${SESSION_COOKIE}.${i}`, '', { ...options, maxAge: 0 })
  }
  return chunks
}

export function clearSession(response: NextResponse) {
  const options = cookieOptions(0)
  for (let i = 0; i < MAX_CHUNKS; i++) {
    response.cookies.set(`${SESSION_COOKIE}.${i}`, '', options)
  }
}

export function needsRefresh(session: AuthSession): boolean {
  return session.expiresAt - REFRESH_MARGIN_SECONDS <= now()
}

export function isAccessTokenValid(session: AuthSession): boolean {
  return session.expiresAt > now() + 5
}

type TokenResponse = Awaited<ReturnType<typeof refreshTokens>>

export function tokensToSession(tokens: TokenResponse, user: UserSession, previous?: AuthSession): AuthSession {
  const issuedAt = now()
  const refreshExpiresIn = Number((tokens as Record<string, unknown>).refresh_expires_in)
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? previous?.refreshToken,
    idToken: tokens.id_token ?? previous?.idToken,
    expiresAt: issuedAt + (tokens.expiresIn() ?? 300),
    // Keycloak reports 0 for offline tokens; treat that as "no fixed limit".
    refreshExpiresAt: Number.isFinite(refreshExpiresIn) && refreshExpiresIn > 0
      ? issuedAt + refreshExpiresIn
      : previous?.refreshExpiresAt,
    user,
  }
}

// Concurrent requests holding the same refresh token share one refresh, so a
// burst of API calls at expiry doesn't spend the token several times over.
const inFlight = new Map<string, Promise<AuthSession | null>>()

/** A session with fresh tokens, or null when Keycloak refused the refresh. */
export function refreshSession(session: AuthSession): Promise<AuthSession | null> {
  const refreshToken = session.refreshToken
  if (!refreshToken) return Promise.resolve(null)

  const existing = inFlight.get(refreshToken)
  if (existing) return existing

  const pending = refreshTokens(refreshToken)
    .then((tokens) => tokensToSession(tokens, session.user, session))
    .catch((error) => {
      console.warn('[auth] token refresh failed:', error instanceof Error ? error.message : error)
      return null
    })
    .finally(() => {
      setTimeout(() => inFlight.delete(refreshToken), 10_000)
    })
  inFlight.set(refreshToken, pending)
  return pending
}
