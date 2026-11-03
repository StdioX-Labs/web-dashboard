import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()

    console.log('Purchasing ticket:', {
      eventId: body.eventId,
      channel: body.channel,
      ticketCount: body.tickets?.length,
      customerEmail: body.customer?.email
    })

    // Validate required fields
    if (!body.eventId || !body.tickets || !body.customer) {
      return NextResponse.json(
        { error: "Missing required fields", status: false },
        { status: 400 }
      )
    }

    // Forward the request to the backend API
    const response = await soldoutFetch(auth.accessToken, '/event/ticket/purchase', {
      method: "POST",
      body,
    })

    console.log('Backend response status:', response.status)

    let data
    try {
      data = await response.json()
    } catch (e) {
      console.error('Failed to parse response as JSON:', e)
      data = { message: 'Invalid response from server', status: false }
    }

    if (!response.ok) {
      console.error('Backend error:', data)
      return NextResponse.json(
        { error: data.message || "Failed to purchase ticket", status: false },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error purchasing ticket:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: errorMessage, status: false },
      { status: 500 }
    )
  }
}

