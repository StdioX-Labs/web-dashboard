import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'API proxy is working',
    timestamp: new Date().toISOString()
  })
}

