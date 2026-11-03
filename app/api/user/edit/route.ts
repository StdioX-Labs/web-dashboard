import { NextRequest, NextResponse } from "next/server"
import { normalizeEmail } from "@/lib/email"
import { proxyToSoldOut, requireParams } from "@/lib/soldout-proxy"
import { requireAuth } from "@/lib/auth/server"

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const searchParams = request.nextUrl.searchParams
  const missing = requireParams(searchParams, ["userId"])
  if (missing) return missing

  const body = await request.json()

  if (!body.fullName || !body.mobileNumber || !body.emailAddress || !body.roles) {
    return NextResponse.json(
      { status: false, message: "Name, email, phone number and role are all required" },
      { status: 400 }
    )
  }
  body.emailAddress = normalizeEmail(body.emailAddress)

  // userId is the teammate being edited; the requester is the signed-in user.
  const userId = encodeURIComponent(searchParams.get("userId")!)
  return proxyToSoldOut(
    request,
    `/company/user/edit?userId=${userId}&requesterUserId=${auth.user.user_id}`,
    { method: "PUT", body, accessToken: auth.accessToken }
  )
}
