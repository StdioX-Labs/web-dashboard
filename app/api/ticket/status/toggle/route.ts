import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.soldoutafrica.com/api/v1'
const SOLDOUT_API_USERNAME = process.env.SOLDOUT_API_USERNAME
const SOLDOUT_API_PASSWORD = process.env.SOLDOUT_API_PASSWORD

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ticketId = searchParams.get('ticketId')
    const userId = searchParams.get('userId')

    if (!ticketId || !userId) {
      return NextResponse.json(
        { status: false, message: 'ticketId and userId are required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (SOLDOUT_API_USERNAME && SOLDOUT_API_PASSWORD) {
      const credentials = Buffer.from(`${SOLDOUT_API_USERNAME}:${SOLDOUT_API_PASSWORD}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    }

    const response = await fetch(`${BASE_URL}/ticket/status/toggle?ticketId=${ticketId}&userId=${userId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const contentType = response.headers.get('content-type')
    const text = await response.text()

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: `API returned non-JSON response (${response.status})`, details: text },
        { status: response.status || 500 }
      )
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { status: false, message: 'Failed to parse API response', details: text },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to toggle ticket status' },
      { status: 500 }
    )
  }
}
