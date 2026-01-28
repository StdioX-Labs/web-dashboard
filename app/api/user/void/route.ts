import { NextRequest, NextResponse } from "next/server"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.soldoutafrica.com/api/v1"

async function handleSuspendUser(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const requesterUserId = searchParams.get("requesterUserId")

    console.log('Suspending/activating user:', { userId, requesterUserId })

    if (!userId || !requesterUserId) {
      return NextResponse.json(
        { error: "userId and requesterUserId are required", status: false },
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
    console.log('Basic Auth created (first 20 chars):', basicAuth.substring(0, 20))

    // Forward the request to the backend API
    const backendUrl = `${BASE_URL}/company/user/suspend?userId=${userId}&requesterUserId=${requesterUserId}`
    console.log('Backend URL:', backendUrl)

    const response = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
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
        { error: data.message || "Failed to suspend/activate user", status: false },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error suspending/activating user:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: errorMessage, status: false },
      { status: 500 }
    )
  }
}

// Export both POST and PUT handlers
export async function POST(request: NextRequest) {
  return handleSuspendUser(request)
}

export async function PUT(request: NextRequest) {
  return handleSuspendUser(request)
}

