import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/dashboard-session'

/** Drops the signed session cookie; the browser clears its own session itself. */
export async function POST() {
  const response = NextResponse.json({ status: true })
  clearSessionCookie(response)
  return response
}
