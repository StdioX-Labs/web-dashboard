"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sessionManager, UserSession } from '@/lib/session-manager'

export function useAuth(redirectTo = '/') {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = () => {
      const session = sessionManager.getSession()
      
      if (!session) {
        // No valid session, redirect to login
        router.push(redirectTo)
        return
      }

      setUser(session.user)
      setIsLoading(false)
    }

    checkSession()
  }, [router, redirectTo])

  return { user, isLoading }
}

export function useSession() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const session = sessionManager.getSession()
    setUser(session?.user || null)
    setIsLoading(false)
  }, [])

  const logout = () => {
    sessionManager.clearSession()
    setUser(null)
  }

  return { user, isLoading, logout }
}

