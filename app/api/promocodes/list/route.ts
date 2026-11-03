import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// GET /api/promocodes/list?companyId=&userId=
// Every promo code the company owns, newest first. The API has no per-event
// listing, so callers filter by eventId themselves.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const query = new URLSearchParams({
    // The acting user and company, from the session, never from the browser.
    companyId: String(auth.user.company_id),
    userId: String(auth.user.user_id),
  })

  return proxyToSoldOut(request, `/promocodes/list?${query}`, { accessToken: auth.accessToken })
}
