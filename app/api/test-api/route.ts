import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const apiUrl = 'https://api.soldoutafrica.com/api/v1/user/otp/login'

    console.log('Test - Attempting to connect to:', apiUrl)
    console.log('Test - Environment check:', {
      hasUsername: !!process.env.SOLDOUT_API_USERNAME,
      hasPassword: !!process.env.SOLDOUT_API_PASSWORD,
      nodeEnv: process.env.NODE_ENV
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add Basic Auth credentials
    const username = process.env.SOLDOUT_API_USERNAME
    const password = process.env.SOLDOUT_API_PASSWORD

    if (username && password) {
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64')
      headers['Authorization'] = `Basic ${basicAuth}`
      console.log('Test - Using Basic Auth credentials')
    } else {
      console.warn('Test - No credentials found')
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'test@example.com',
        method: 'email'
      }),
    })

    console.log('Test - Response status:', response.status)
    console.log('Test - Response headers:', Object.fromEntries(response.headers.entries()))

    const text = await response.text()
    console.log('Test - Response text:', text)

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      return NextResponse.json({
        success: false,
        message: 'Response is not valid JSON',
        status: response.status,
        rawResponse: text,
        error: e instanceof Error ? e.message : String(e)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'API is reachable',
      status: response.status,
      data: data
    })
  } catch (error) {
    console.error('Test - Error:', error)

    return NextResponse.json({
      success: false,
      message: 'Failed to connect',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

