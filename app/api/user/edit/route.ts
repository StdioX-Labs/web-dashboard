import { NextRequest, NextResponse } from "next/server"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.soldoutafrica.com/api/v1"

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const requesterUserId = searchParams.get('requesterUserId')

    console.log('Editing user:', {
      userId,
      requesterUserId,
      fullName: body.fullName,
      emailAddress: body.emailAddress,
      roles: body.roles
    })

    // Validate required fields
    if (!userId || !requesterUserId) {
      return NextResponse.json(
        { error: "Missing userId or requesterUserId", status: false },
        { status: 400 }
      )
    }

    if (!body.fullName || !body.mobileNumber || !body.emailAddress || !body.roles) {
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
    const backendUrl = `${BASE_URL}/company/user/edit?userId=${userId}&requesterUserId=${requesterUserId}`
    console.log('Backend URL:', backendUrl)

    const response = await fetch(backendUrl, {
      method: "PUT",
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
        { error: data.message || "Failed to edit user", status: false },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error editing user:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: errorMessage, status: false },
      { status: 500 }
    )
  }
}

