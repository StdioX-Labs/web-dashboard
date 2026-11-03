import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const ticketGroup = searchParams.get('ticketGroup')

    if (!ticketGroup) {
      return NextResponse.json(
        { error: 'Ticket group code is required', status: false },
        { status: 400 }
      )
    }

    const response = await soldoutFetch(
      auth.accessToken,
      `/event/ticket/group/get?ticketGroup=${encodeURIComponent(ticketGroup)}`
    )

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Group ticket fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group tickets', status: false },
      { status: 500 }
    )
  }
}

