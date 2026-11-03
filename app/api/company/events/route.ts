import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {

    const response = await soldoutFetch(auth.accessToken, '/company/events/get')

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to fetch company events', status: false },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Company events error:', error)
    return NextResponse.json(
      { message: 'Internal server error', status: false },
      { status: 500 }
    )
  }
}

