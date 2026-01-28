import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.soldoutafrica.com/api/v1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')

    const response = await fetch(`${BASE_URL}/scanner/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Scanner scan error:', error)
    return NextResponse.json(
      { error: 'Failed to scan ticket', status: false },
      { status: 500 }
    )
  }
}

