import { createHash, randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter"
import { formatPhoneNumber } from "@/lib/phone"
import { isQualified } from "@/lib/lead-qualification"
import { META_PIXEL_ID } from "@/lib/meta-pixel"

const BASE_URL = "https://api.soldoutafrica.com/api/v1"
const META_API = "https://graph.facebook.com/v21.0"

const sha256 = (value: string) =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("hex")

/**
 * Server-side Lead event for Meta. Browser pixels lose a large share of
 * events to iOS and ad blockers; CAPI is the copy that actually arrives.
 * Silently skipped when the pixel isn't configured yet.
 */
async function sendMetaLead(
  lead: { email: string; mobileNumber: string; fullName: string },
  eventId: string,
  sourceUrl: string,
  fbclid: string | undefined,
  clientIp: string,
  userAgent: string | null,
) {
  // Only the token is configurable: the pixel ID is public and shared with
  // the browser snippet, so there is nothing to get out of sync.
  const token = process.env.META_CAPI_TOKEN
  if (!token) {
    console.warn("META_CAPI_TOKEN not set — server-side Lead event skipped")
    return
  }

  // Set META_TEST_EVENT_CODE temporarily to make server events show up in
  // the Test Events tab in Events Manager. Unset it once verified: events
  // carrying a test code are excluded from optimisation and reporting.
  const testEventCode = process.env.META_TEST_EVENT_CODE

  try {
    const res = await fetch(`${META_API}/${META_PIXEL_ID}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Lead",
            // Shared with the browser pixel so Meta counts one Lead, not two.
            event_id: eventId,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_source_url: sourceUrl,
            user_data: {
              em: [sha256(lead.email)],
              ph: [sha256(lead.mobileNumber)],
              fn: [sha256(lead.fullName)],
              ...(fbclid ? { fbc: `fb.1.${Date.now()}.${fbclid}` } : {}),
              ...(clientIp && clientIp !== "unknown"
                ? { client_ip_address: clientIp }
                : {}),
              ...(userAgent ? { client_user_agent: userAgent } : {}),
            },
          },
        ],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }),
    })
    const payload = await res.text()
    if (res.ok) {
      // events_received should be 1. Logged so a bad token or a rejected
      // payload is visible in the deploy logs instead of failing silently.
      console.log("Meta CAPI Lead accepted:", payload)
    } else {
      console.error("Meta CAPI rejected the Lead event:", payload)
    }
  } catch (error) {
    // Never fail the form because the pixel is down.
    console.error("Meta CAPI Lead failed:", error)
  }
}

// Deliberately looser than the auth routes' 3-per-5-minutes. Safaricom and
// Airtel put large numbers of subscribers behind the same NAT address, so a
// tight per-IP cap here would reject real organisers, not just spam. The bar
// only needs to stop a script: every qualified lead SMSes the admin pool.
const LEAD_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 10 * 60 * 1000,
  blockDurationMs: 10 * 60 * 1000,
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    if (!checkRateLimit(clientIp, LEAD_RATE_LIMIT).allowed) {
      console.warn("Organizer lead - rate limit exceeded for IP:", clientIp)
      return NextResponse.json(
        { status: false, message: "Too many attempts. Please try again shortly." },
        { status: 429 },
      )
    }

    const body = await request.json()
    const fullName = String(body.fullName || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const rawPhone = String(body.mobileNumber || "").trim()

    if (!fullName || !email || !rawPhone) {
      return NextResponse.json(
        { status: false, message: "Name, email and mobile number are required" },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { status: false, message: "Please enter a valid email address" },
        { status: 400 },
      )
    }

    const mobileNumber = formatPhoneNumber(rawPhone)
    if (mobileNumber.length < 12) {
      return NextResponse.json(
        { status: false, message: "Please enter a valid mobile number" },
        { status: 400 },
      )
    }

    const lastEventGross = String(body.lastEventGross || "")
    // Recomputed here, never taken from the client: this flag decides whether
    // a human gets paged.
    const qualified = isQualified(lastEventGross)

    const lead = {
      fullName,
      email,
      mobileNumber,
      companyName: String(body.companyName || "").trim() || null,
      lastEventGross,
      nextEventWindow: String(body.nextEventWindow || ""),
      qualified,
      gclid: body.gclid || null,
      fbclid: body.fbclid || null,
      utmSource: body.utm_source || null,
      utmMedium: body.utm_medium || null,
      utmCampaign: body.utm_campaign || null,
    }

    const username = process.env.SOLDOUT_API_USERNAME
    const password = process.env.SOLDOUT_API_PASSWORD
    if (!username || !password) {
      console.error("Missing API credentials in environment variables")
      return NextResponse.json(
        { status: false, message: "API credentials not configured" },
        { status: 500 },
      )
    }

    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64")
    const response = await fetch(`${BASE_URL}/organizer-lead/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(lead),
    })

    const responseText = await response.text()
    if (!response.ok) {
      console.error("Lead create failed:", response.status, responseText)
      return NextResponse.json(
        { status: false, message: "Could not save your details. Please try again." },
        { status: 502 },
      )
    }

    const eventId = randomUUID()
    // Derived, not hardcoded: the portal answers on both organiser. and
    // dashboard. hostnames, and Meta matches this against the verified
    // domain for Aggregated Event Measurement.
    const host = request.headers.get("host") || "organiser.soldoutafrica.com"
    await sendMetaLead(
      lead,
      eventId,
      `https://${host}/get-started`,
      body.fbclid,
      // Reuses the proxy-header handling in getClientIp: behind Coolify's
      // reverse proxy x-forwarded-for is a chain, and Meta rejects
      // "ip1, ip2" as a client_ip_address.
      clientIp,
      request.headers.get("user-agent"),
    )

    return NextResponse.json({ status: true, qualified, eventId })
  } catch (error) {
    console.error("Organizer lead error:", error)
    return NextResponse.json(
      { status: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    )
  }
}
