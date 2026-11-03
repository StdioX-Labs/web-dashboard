// Browser-side view of the signed-in organizer.
//
// The session itself is an encrypted httpOnly cookie that JavaScript cannot
// read (see lib/auth/session.ts). Pages get the user's details from
// GET /api/auth/me, loaded once by the dashboard layout (lib/hooks/use-auth)
// before any page renders, and cached here so the existing synchronous
// `sessionManager.getUser()` calls keep working. Nothing is kept in
// localStorage.

import type { UserSession } from '@/lib/auth/user'

export type { UserSession }

export interface SessionData {
  user: UserSession
  /** Access token expiry, epoch milliseconds. Refreshed server-side. */
  expiresAt: number
}

let current: SessionData | null = null
let loading: Promise<SessionData | null> | null = null

function signInUrl(returnTo?: string) {
  const target = returnTo ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/dashboard')
  return `/api/auth/login?returnTo=${encodeURIComponent(target)}`
}

export const sessionManager = {
  /** Fetches the signed-in user from the server; null when signed out. */
  load: (force = false): Promise<SessionData | null> => {
    if (typeof window === 'undefined') return Promise.resolve(null)
    if (current && !force) return Promise.resolve(current)
    // Left behind by the old OTP login; never read any more.
    try {
      localStorage.removeItem('user_session')
      localStorage.removeItem('authToken')
    } catch {
      // storage unavailable (private mode); nothing to clean
    }
    loading ??= fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) return null
        const data = (await response.json()) as { user?: UserSession; expiresAt?: number }
        if (!data.user || data.user.is_active === false) return null
        return { user: data.user, expiresAt: (data.expiresAt ?? 0) * 1000 }
      })
      .catch(() => null)
      .then((session) => {
        current = session
        loading = null
        return session
      })
    return loading
  },

  /** The cached session. Available once load() has resolved (the dashboard layout waits for it). */
  getSession: (): SessionData | null => current,

  getUser: (): UserSession | null => current?.user ?? null,

  isSessionValid: (): boolean => current !== null,

  /** Sends the browser through Keycloak sign-in, returning to `returnTo` afterwards. */
  signIn: (returnTo?: string): void => {
    if (typeof window !== 'undefined') window.location.assign(signInUrl(returnTo))
  },

  /** Ends the session here and at Keycloak (RP-initiated logout). */
  clearSession: (): void => {
    current = null
    if (typeof window !== 'undefined') {
      sessionStorage.clear()
      window.location.assign('/api/auth/logout')
    }
  },
}
