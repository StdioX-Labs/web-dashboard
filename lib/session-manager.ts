export interface UserSession {
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

export interface SessionData {
  user: UserSession
  expiresAt: number
  createdAt: number
}

const SESSION_KEY = 'user_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export const sessionManager = {
  // Create a new session
  createSession: (user: UserSession): void => {
    const now = Date.now()
    const sessionData: SessionData = {
      user,
      expiresAt: now + SESSION_DURATION,
      createdAt: now,
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
      localStorage.setItem('authToken', `session_${user.user_id}_${now}`)
    }
  },

  // Get current session
  getSession: (): SessionData | null => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const sessionStr = localStorage.getItem(SESSION_KEY)
      if (!sessionStr) {
        return null
      }

      const session: SessionData = JSON.parse(sessionStr)

      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        sessionManager.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error('Error reading session:', error)
      return null
    }
  },

  // Get user from session
  getUser: (): UserSession | null => {
    const session = sessionManager.getSession()
    return session?.user || null
  },

  // Check if session is valid
  isSessionValid: (): boolean => {
    const session = sessionManager.getSession()
    if (!session) {
      return false
    }

    return Date.now() < session.expiresAt
  },

  // Clear session
  clearSession: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      sessionStorage.clear()
    }
  },

  // Extend session (reset expiration to 24 hours from now)
  extendSession: (): boolean => {
    const session = sessionManager.getSession()
    if (!session) {
      return false
    }

    session.expiresAt = Date.now() + SESSION_DURATION

    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }

    return true
  },

  // Get time until session expires (in milliseconds)
  getTimeUntilExpiry: (): number => {
    const session = sessionManager.getSession()
    if (!session) {
      return 0
    }

    return Math.max(0, session.expiresAt - Date.now())
  },
}

