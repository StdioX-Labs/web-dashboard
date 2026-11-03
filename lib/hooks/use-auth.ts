"use client"

import { useEffect, useState } from 'react'
import { sessionManager, UserSession } from '@/lib/session-manager'

/**
 * Loads the signed-in user from /api/auth/me. Without a session the browser is
 * sent through Keycloak sign-in and returns to the current page afterwards.
 * proxy.ts already redirects signed-out page loads, so this only triggers
 * when the session ends while a page is open.
 */
export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(sessionManager.getUser())
  const [isLoading, setIsLoading] = useState(user === null)

  useEffect(() => {
    let cancelled = false
    sessionManager.load().then((session) => {
      if (cancelled) return
      if (!session) {
        sessionManager.signIn()
        return
      }
      setUser(session.user)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { user, isLoading }
}

export function useSession() {
  const [user, setUser] = useState<UserSession | null>(sessionManager.getUser())
  const [isLoading, setIsLoading] = useState(user === null)

  useEffect(() => {
    sessionManager.load().then((session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })
  }, [])

  const logout = () => {
    setUser(null)
    sessionManager.clearSession()
  }

  return { user, isLoading, logout }
}
