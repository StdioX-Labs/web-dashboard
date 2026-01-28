import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.soldoutafrica.com/api/v1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== Scanner API Proxy ===')
    console.log('Request body:', JSON.stringify(body, null, 2))

    // Build headers with Basic Authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add Basic Auth credentials from environment variables
    const username = process.env.SOLDOUT_API_USERNAME
    const password = process.env.SOLDOUT_API_PASSWORD

    if (username && password) {
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64')
      headers['Authorization'] = `Basic ${basicAuth}`
      console.log('Using Basic Auth credentials')
    } else {
      console.error('Missing API credentials in environment variables')
      return NextResponse.json(
        {
          status: false,
          error: 'API credentials not configured'
        },
        { status: 500 }
      )
    }

    console.log('Calling backend API:', `${BASE_URL}/scanner/scan`)

    const response = await fetch(`${BASE_URL}/scanner/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    console.log('Backend response status:', response.status)
    console.log('Backend response ok:', response.ok)

    // Get the response text first to handle non-JSON responses
    const responseText = await response.text()
    console.log('Backend response text:', responseText)

    // Try to parse as JSON
    let data
    try {
      data = responseText ? JSON.parse(responseText) : {}
      console.log('Backend response data (parsed):', JSON.stringify(data, null, 2))
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError)
      console.error('Response was:', responseText)

      // If it's a 401, return auth error
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'Authentication failed',
            status: false,
            details: 'Invalid API credentials'
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        {
          error: 'Invalid response from backend',
          status: false,
          details: `Backend returned non-JSON response: ${responseText.substring(0, 200)}`,
          backendStatus: response.status
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Scanner scan error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', errorMessage)
    console.error('Error stack:', errorStack)

    return NextResponse.json(
      { error: 'Failed to scan ticket', status: false, details: errorMessage },
      { status: 500 }
    )
  }
}

