import { NextRequest, NextResponse } from "next/server"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.soldoutafrica.com/api/v1"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get("companyId")

    console.log('Fetching users for company:', companyId)

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required", status: false },
        { status: 400 }
      )
    }

    // Get Basic Auth credentials from environment variables
    const username = process.env.SOLDOUT_API_USERNAME
    const password = process.env.SOLDOUT_API_PASSWORD

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
    const backendUrl = `${BASE_URL}/company/fetch/users?companyId=${companyId}`
    console.log('Backend URL:', backendUrl)

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
    })

    console.log('Backend response status:', response.status)

    const data = await response.json()

    if (!response.ok) {
      console.error('Backend error:', data)
      return NextResponse.json(
        { error: data.message || "Failed to fetch users", status: false },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching company users:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: errorMessage, status: false },
      { status: 500 }
    )
  }
}

