"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginPage from "@/components/login-page"
import { sessionManager } from "@/lib/session-manager"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const session = sessionManager.getSession()
    if (session) {
      // Redirect to dashboard if already logged in
      router.push('/dashboard')
    }
  }, [router])

  return <LoginPage />
}

