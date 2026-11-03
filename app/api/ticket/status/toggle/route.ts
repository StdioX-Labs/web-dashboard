import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const ticketId = searchParams.get('ticketId')
    // The acting user, from the session; core checks the OTP against them.
    const userId = auth.user.user_id

    if (!ticketId) {
      return NextResponse.json(
        { status: false, message: 'ticketId is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const response = await soldoutFetch(
      auth.accessToken,
      `/ticket/status/toggle?ticketId=${encodeURIComponent(ticketId)}&userId=${userId}`,
      { method: 'POST', body }
    )

    const contentType = response.headers.get('content-type')
    const text = await response.text()

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: `API returned non-JSON response (${response.status})`, details: text },
        { status: response.status || 500 }
      )
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { status: false, message: 'Failed to parse API response', details: text },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to toggle ticket status' },
      { status: 500 }
    )
  }
}
