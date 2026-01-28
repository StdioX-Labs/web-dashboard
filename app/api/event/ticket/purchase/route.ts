import { NextRequest, NextResponse } from "next/server"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.soldoutafrica.com/api/v1"

export async function POST(request: NextRequest) {
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

    // Get Basic Auth credentials from environment variables
    const username = process.env.SOLDOUT_API_USERNAME
    const password = process.env.SOLDOUT_API_PASSWORD

    console.log('Using credentials:', { username: username ? 'SET' : 'NOT SET', password: password ? 'SET' : 'NOT SET' })

    if (!username || !password) {
      console.error('Missing API credentials in environment variables')
      return NextResponse.json(
        { error: "API configuration error", status: false },
        { status: 500 }
      )
    }

    // Create Basic Auth header
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64')

    // Forward the request to the backend API
    const backendUrl = `${BASE_URL}/event/ticket/purchase`
    console.log('Backend URL:', backendUrl)

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify(body),
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

