import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    // The signed-in user's company, never one named by the browser.
    const companyId = auth.user.company_id || searchParams.get("companyId")

    console.log('Fetching users for company:', companyId)

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required", status: false },
        { status: 400 }
      )
    }

    // Forward the request to the backend API
    const backendPath = `/company/fetch/users?companyId=${encodeURIComponent(String(companyId))}`
    console.log('Backend path:', backendPath)

    const response = await soldoutFetch(auth.accessToken, backendPath)

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

