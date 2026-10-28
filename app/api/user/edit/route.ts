import { NextRequest, NextResponse } from "next/server"
import { normalizeEmail } from "@/lib/email"
import { proxyToSoldOut, requireParams } from "@/lib/soldout-proxy"

export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const missing = requireParams(searchParams, ["userId", "requesterUserId"])
  if (missing) return missing

  const body = await request.json()

  if (!body.fullName || !body.mobileNumber || !body.emailAddress || !body.roles) {
    return NextResponse.json(
      { status: false, message: "Name, email, phone number and role are all required" },
      { status: 400 }
    )
  }
  body.emailAddress = normalizeEmail(body.emailAddress)

  const userId = encodeURIComponent(searchParams.get("userId")!)
  const requesterUserId = encodeURIComponent(searchParams.get("requesterUserId")!)
  return proxyToSoldOut(
    request,
    `/company/user/edit?userId=${userId}&requesterUserId=${requesterUserId}`,
    { method: "PUT", body }
  )
}
