import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

async function handleSuspendUser(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    // The requester is the signed-in user, never an id from the browser.
    const requesterUserId = auth.user.user_id

    console.log('Suspending/activating user:', { userId, requesterUserId })

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required", status: false },
        { status: 400 }
      )
    }

    // Forward the request to the backend API
    const backendPath = `/company/user/suspend?userId=${encodeURIComponent(userId)}&requesterUserId=${requesterUserId}`
    console.log('Backend path:', backendPath)

    const response = await soldoutFetch(auth.accessToken, backendPath, { method: "PUT" })

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

