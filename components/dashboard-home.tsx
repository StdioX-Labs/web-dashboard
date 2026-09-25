"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { TrendingUp, Calendar, Wallet, Plus, Eye, EyeOff, Send, Megaphone, ArrowUpRight, Ticket, ScanLine, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"
import { eventCache } from "@/lib/event-cache"
import { getEventRevenue, getEventTicketsIssued } from "@/lib/event-stats"

/**
 * FEATURE FLAGS: Quick Actions
 *
 * Set to `true` to enable specific quick action items on the dashboard.
 *
 * @default false
 */
const ENABLE_PROMOTIONS = false

/** Withdrawals aren't integrated yet, so the button raises a request by email. */
const WITHDRAWAL_EMAIL = "info@soldoutafrica.com"


interface CompanySummary {
  totalFees: number
  totalTicketsSold: number
  totalEvents: number
  activeEvents: number
  totalRevenue: number
}

interface CompanyEvent {
  id: number
  eventName: string
  eventStartDate: string
  eventLocation: string
  tickets: Array<{
    ticketPrice: number
    soldQuantity: number
    totalTicketSaleBalance?: number
    /** Paid plus complimentary. */
    uniqueTicketCount?: number
    paidTicketsSold?: number
  }>
  /** Reported by the platform; the authority for what this event took. */
  totalRevenue?: number
  /** Reported by the platform. Paid tickets, not admissions. */
  totalTicketsSold?: number
  companyId: number
  currency: string
}

/**
 * Guilloche — the interference line-work printed on banknotes and struck into
 * metal payment cards. Two families of curve, because real security engraving
 * is never just one.
 *
 * `rosettePath` traces a hypotrochoid: a point at distance `d` from the centre
 * of a circle of radius `r` rolling inside one of radius `R`. Keeping r an exact
 * divisor of R closes the curve in a single revolution, which keeps the path
 * short enough to inline. The medallion layers pairs of rosettes that share R
 * and r but differ in `d` — same closure, different petal amplitude — so they
 * interfere and shimmer the way a rose engine's work does. Detuning `r` instead
 * would give the same shimmer but break the closure, leaving a visible seam
 * where the path snaps shut.
 *
 * `lathePath` is the straight lathe work filling the field behind it: two sine
 * terms of different frequency per line, so the ground never resolves into an
 * obviously repeating wave.
 *
 * Both are built once at module scope — neither ever changes.
 */
function rosettePath(R: number, r: number, d: number, stepsPerPetal = 16): string {
  const petals = Math.round(R / r)
  const steps = petals * stepsPerPetal
  const k = (R - r) / r
  const points: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t)
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t)
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return "M" + points.join("L") + "Z"
}

function lathePath(baseY: number, amp: number, phase: number, width = 400, steps = 72): string {
  const points: string[] = []
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width
    const y =
      baseY +
      amp * Math.sin((x / width) * Math.PI * 4 + phase) +
      amp * 0.42 * Math.sin((x / width) * Math.PI * 9 - phase * 1.7)
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return "M" + points.join("L")
}

/** Rows drift in phase rather than marching in step — that drift is what makes
 *  the field read as watered silk instead of as ruled lines. */
const LATHE_LINES = Array.from({ length: 30 }, (_, i) =>
  lathePath(-12 + i * 9.5, 5.5 + (i % 3) * 0.9, i * 0.38)
)

const GUILLOCHE_ROSETTES = [
  // R/r is a whole number in every pair, so every curve closes cleanly.
  { d: rosettePath(128, 12.8, 12.8), opacity: 0.55, rotate: 0, width: 0.6 },
  { d: rosettePath(128, 12.8, 10.2), opacity: 0.3, rotate: 5, width: 0.45 },
  { d: rosettePath(92, 11.5, 11.5), opacity: 0.5, rotate: 4, width: 0.55 },
  { d: rosettePath(92, 11.5, 8.8), opacity: 0.26, rotate: -4, width: 0.4 },
  { d: rosettePath(57.6, 9.6, 9.6), opacity: 0.42, rotate: 0, width: 0.6 },
]

/** The lathe ground: full-bleed, stretched, and faded out across the diagonal so
 *  coverage is never uniform — real cards concentrate their engraving. */
function LatheGround({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 250" fill="none" preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="latheFalloff" x1="400" y1="0" x2="40" y2="250" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="latheFade">
          <rect x="0" y="0" width="400" height="250" fill="url(#latheFalloff)" />
        </mask>
      </defs>
      <g mask="url(#latheFade)">
        {LATHE_LINES.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="currentColor"
            strokeWidth={i % 2 === 0 ? 0.5 : 0.35}
            opacity={i % 2 === 0 ? 0.5 : 0.26}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  )
}

function Guilloche({ className }: { className?: string }) {
  return (
    <svg viewBox="-140 -140 280 280" fill="none" className={className} aria-hidden="true">
      <defs>
        {/* Foil banding. The lines catch light across the medallion rather than
            sitting at one flat tone, which is what sells them as struck metal. */}
        <linearGradient id="foilStroke" x1="-140" y1="-140" x2="140" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6E5A32" />
          <stop offset="0.3" stopColor="#D8C48C" />
          <stop offset="0.48" stopColor="#F6EDD3" />
          <stop offset="0.62" stopColor="#B99C5E" />
          <stop offset="0.82" stopColor="#E3D2A2" />
          <stop offset="1" stopColor="#5E4D2B" />
        </linearGradient>
        <radialGradient id="medallionFalloff">
          <stop offset="0.3" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.72" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="medallionFade">
          <rect x="-140" y="-140" width="280" height="280" fill="url(#medallionFalloff)" />
        </mask>
      </defs>
      <g mask="url(#medallionFade)" fill="none">
        {GUILLOCHE_ROSETTES.map((ring, i) => (
          <path
            key={i}
            d={ring.d}
            stroke="url(#foilStroke)"
            strokeWidth={ring.width}
            opacity={ring.opacity}
            transform={`rotate(${ring.rotate})`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Engine-turned rings framing the medallion, alternating weight the way
            a rose engine steps through its index plate. */}
        {[136, 132, 129, 98, 94, 62, 28, 22, 19].map((r, i) => (
          <circle
            key={r}
            cx="0"
            cy="0"
            r={r}
            stroke="url(#foilStroke)"
            strokeWidth={i % 3 === 0 ? 0.65 : 0.4}
            opacity={i % 2 === 0 ? 0.42 : 0.2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  )
}

/** The EMV contact plate. Drawn rather than imported so it inherits the card's scale. */
function CardChip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 36" fill="none" className={className} aria-hidden="true">
      <rect x="0.5" y="0.5" width="47" height="35" rx="5.5" fill="url(#chipPlate)" stroke="rgba(255,255,255,0.35)" />
      <g stroke="rgba(60,60,66,0.7)" strokeWidth="1.2">
        <path d="M0 12h13M0 24h13M35 12h13M35 24h13M17 0v6M31 0v6M17 30v6M31 30v6" />
        <rect x="13" y="6" width="22" height="24" rx="3.5" fill="none" />
        <path d="M13 18h22" />
      </g>
      <defs>
        <linearGradient id="chipPlate" x1="0" y1="0" x2="48" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8E8EC" />
          <stop offset="0.5" stopColor="#B4B4BD" />
          <stop offset="1" stopColor="#8A8A93" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** The contactless-payment mark, sitting beside the chip as it does on a real card. */
function ContactlessMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55">
        <path d="M6.5 8.5a5 5 0 0 1 0 7" />
        <path d="M10 6a8.5 8.5 0 0 1 0 12" />
        <path d="M13.5 3.5a12 12 0 0 1 0 17" />
      </g>
    </svg>
  )
}

export default function DashboardHome() {
  const [showBalance, setShowBalance] = useState(true)
  const [summary, setSummary] = useState<CompanySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currency, setCurrency] = useState("KES")
  const [companyName, setCompanyName] = useState("")
  const [upcomingEvents, setUpcomingEvents] = useState<CompanyEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [calculatedRevenue, setCalculatedRevenue] = useState(0)
  const [calculatedFees, setCalculatedFees] = useState(0)
  const [isPreparingRequest, setIsPreparingRequest] = useState(false)

  useEffect(() => {
    const user = sessionManager.getUser()
    if (!user || !user.company_id) {
      setIsLoading(false)
      setEventsLoading(false)
      return
    }

    setCurrency(user.currency || "KES")
    setCompanyName(user.company_name || "")

    // Stage 1: Fetch summary (critical data) - loads first to show main dashboard
    const fetchSummary = async () => {
      try {
        const summaryResponse = await api.company.getSummary(user.company_id)
        if (summaryResponse.status && summaryResponse.summary) {
          setSummary(summaryResponse.summary)
        }
      } catch (error) {
        console.error("Failed to fetch summary:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Stage 2: Fetch upcoming events (background) - loads independently
    const fetchUpcomingEvents = async () => {
      try {
        const eventsResponse = await api.company.getAllEvents(user.company_id, 0, 300)
        // Same request, same key as the events page: hand it this fresher copy
        // so it doesn't go on showing a cached one with older figures.
        eventCache.set('all-events-300', user.company_id, eventsResponse)
        if (eventsResponse.events) {
          // Calculate total revenue and fees from all company events
          let totalRev = 0
          let totalFee = 0

          eventsResponse.events.forEach(event => {
            if (event.companyId === user.company_id) {
              totalRev += getEventRevenue(event)
              totalFee += event.totalPlatformFee || 0
            }
          })

          setCalculatedRevenue(totalRev)
          setCalculatedFees(totalFee)

          // Filter events for the current user's company
          const companyEvents = eventsResponse.events.filter(
            (event) => event.companyId === user.company_id && event.isActive
          )

          // Filter upcoming events (events that haven't started yet)
          const now = new Date()
          const upcoming = companyEvents
            .filter((event) => new Date(event.eventStartDate) > now)
            .sort((a, b) => new Date(a.eventStartDate).getTime() - new Date(b.eventStartDate).getTime())
            .slice(0, 5) // Get top 5 upcoming events

          setUpcomingEvents(upcoming)
        }
      } catch (error) {
        console.error("Failed to fetch events:", error)
      } finally {
        setEventsLoading(false)
      }
    }

    // Execute: Summary first (shows main dashboard), then events in the background
    fetchSummary()
    fetchUpcomingEvents()
  }, [])

  // Use calculated values from events API (accurate), fallback to summary API
  const totalRevenue = calculatedRevenue || summary?.totalRevenue || 0
  const commissionAndFees = calculatedFees || summary?.totalFees || 0
  const availableBalance = totalRevenue - commissionAndFees

  // Helper function to format large numbers for mobile
  const formatCurrency = (amount: number, compact = false): string => {
    if (!compact || amount < 100000) {
      return Math.round(amount).toLocaleString()
    }

    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 100000) {
      return `${(amount / 1000).toFixed(0)}K`
    }

    return Math.round(amount).toLocaleString()
  }

  /**
   * Withdrawals have no integration yet, so this raises one by email instead.
   *
   * The session carries no person's name — only company, email and phone — so
   * the requester's name is looked up from the company's user list and matched
   * on user id, then email, then phone. The mail still opens if that lookup
   * fails; it just says the name wasn't on file.
   */
  const requestWithdrawal = async () => {
    const user = sessionManager.getUser()
    if (!user) return

    setIsPreparingRequest(true)
    let requesterName = ""

    // No company on the session means there is no user list to match against.
    if (user.company_id) {
      try {
        const response = await api.company.getUsers(user.company_id)
        const users = response.users || []
        const match =
          users.find((u) => u.id === user.user_id) ||
          users.find((u) => u.emailAddress?.toLowerCase() === user.email?.toLowerCase()) ||
          users.find((u) => u.mobileNumber === user.phoneNumber)
        requesterName = match?.fullName || ""
      } catch (error) {
        console.error("Could not resolve the requester's name:", error)
      }
    }

    setIsPreparingRequest(false)

    const body = [
      "Hello SoldOutAfrica team,",
      "",
      "I would like to request a withdrawal of my available balance.",
      "",
      `Name: ${requesterName || "Not on file"}`,
      `Company: ${user.company_name || "—"}`,
      `Email: ${user.email || "—"}`,
      `Phone: ${user.phoneNumber || "—"}`,
      `Available balance: ${currency} ${formatCurrency(availableBalance)}`,
      "",
      "Please advise on the next steps.",
      "",
      "Thank you.",
    ].join("\n")

    const subject = `Withdrawal request - ${user.company_name || "SoldOutAfrica"}`
    window.location.href = `mailto:${WITHDRAWAL_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const stats = [
    {
      label: "Total Events",
      value: isLoading ? "—" : (summary?.totalEvents || 0).toLocaleString(),
      hint: "All time",
      icon: Calendar,
      tint: "bg-zinc-500/10 text-zinc-300",
    },
    {
      label: "Active Events",
      value: isLoading ? "—" : (summary?.activeEvents || 0).toLocaleString(),
      hint: "On sale now",
      icon: TrendingUp,
      tint: "bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "Tickets Sold",
      value: isLoading ? "—" : (summary?.totalTicketsSold || 0).toLocaleString(),
      hint: "All time",
      icon: Ticket,
      tint: "bg-zinc-500/10 text-zinc-300",
    },
    {
      label: "Total Revenue",
      value: isLoading ? "—" : `${currency} ${formatCurrency(totalRevenue, true)}`,
      hint: "Gross, before fees",
      icon: Wallet,
      tint: "bg-brand/15 text-brand-soft",
    },
  ]

  const quickActions = [
    { label: "Create Event", description: "Set up a new event", icon: Plus, href: "/dashboard/events/create" },
    { label: "View Events", description: "Manage what's live", icon: Calendar, href: "/dashboard/events" },
    { label: "Scan Tickets", description: "Check people in", icon: ScanLine, href: "/dashboard/scan" },
    { label: "Add Users", description: "Manage your team", icon: UserPlus, href: "/dashboard/users" },
    { label: "Promotions", description: "Run a campaign", icon: Megaphone, href: "/dashboard/promotions", enabled: ENABLE_PROMOTIONS },
  ].filter(action => action.enabled !== false)

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening with your events.</p>
      </motion.div>

      {/* Balance, as a payment card. The card keeps a real card's proportions at
          every breakpoint — stretching it to the full width of a desktop screen
          is what makes this kind of panel stop reading as a card — so on wide
          screens it sits beside the breakdown rather than growing. */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 sm:mb-10 grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center"
      >
        <div className="relative w-full max-w-[420px] mx-auto lg:mx-0">
          <div className="relative aspect-[1.586/1] w-full overflow-hidden rounded-[1.25rem] sm:rounded-[1.5rem] bg-gradient-to-br from-[#232A2D] via-[#15171A] to-[#0B0B0D] p-4 sm:p-6 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
            {/* Brushed metal: fine vertical grain, then a soft sheen across it. */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{ backgroundImage: "repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px 3px)" }}
            />
            <LatheGround className="pointer-events-none absolute inset-0 h-full w-full text-white opacity-[0.09]" />
            <Guilloche className="pointer-events-none absolute -right-[22%] top-1/2 h-[215%] w-auto -translate-y-1/2 opacity-[0.5]" />
            <div className="pointer-events-none absolute -inset-x-1/4 -top-1/2 h-[200%] rotate-[24deg] bg-gradient-to-b from-white/12 via-white/[0.03] to-transparent" />
            <motion.div
              animate={{ opacity: [0.18, 0.3, 0.18] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-zinc-300/20 blur-3xl"
            />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CardChip className="h-7 w-9 sm:h-9 sm:w-12 drop-shadow" />
                  <ContactlessMark className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-white/60">Available</span>
                  <button
                    type="button"
                    onClick={() => setShowBalance(!showBalance)}
                    aria-label={showBalance ? "Hide balance" : "Show balance"}
                    aria-pressed={!showBalance}
                    className="rounded-lg border border-white/15 bg-white/10 p-1.5 backdrop-blur-sm transition-colors hover:bg-white/20 cursor-pointer"
                  >
                    {showBalance ? <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </button>
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate text-[26px] leading-none font-bold tabular-nums tracking-tight sm:text-4xl">
                  {isLoading ? (
                    <span className="inline-block h-[0.8em] w-40 animate-pulse rounded-md bg-white/20 align-middle" />
                  ) : showBalance ? (
                    <>
                      <span className="sm:hidden">{currency} {formatCurrency(availableBalance, true)}</span>
                      <span className="hidden sm:inline">{currency} {formatCurrency(availableBalance)}</span>
                    </>
                  ) : (
                    "•••• ••••"
                  )}
                </p>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-white/50 sm:text-xs">Available balance</p>
              </div>

              <div>
                <div className="flex items-end justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 sm:text-sm">
                    {companyName || " "}
                  </p>
                  <span className="shrink-0 text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-white/60 sm:text-[11px]">
                    SoldOutAfrica
                  </span>
                </div>
                <p className="mt-1.5 truncate text-[10px] text-white/45 sm:text-xs">
                  {isLoading ? (
                    " "
                  ) : showBalance ? (
                    <>Revenue {formatCurrency(totalRevenue, true)} · Fees {formatCurrency(commissionAndFees, true)}</>
                  ) : (
                    "Revenue •••• · Fees ••••"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown + action. Under the card on mobile, beside it on desktop. */}
        <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:max-w-none">
          <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {[
              { label: "Total revenue", value: totalRevenue, sign: "" },
              { label: "Commission & fees", value: commissionAndFees, sign: "- " },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-semibold tabular-nums sm:text-base">
                  {isLoading ? "—" : showBalance ? `${row.sign}${currency} ${formatCurrency(row.value)}` : `${row.sign}••••••`}
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 bg-emerald-500/5 px-4 py-3 sm:px-5 sm:py-3.5">
              <dt className="text-sm font-medium text-emerald-400">Available balance</dt>
              <dd className="text-base font-bold tabular-nums text-emerald-400 sm:text-lg">
                {isLoading ? "—" : showBalance ? `${currency} ${formatCurrency(availableBalance)}` : "••••••"}
              </dd>
            </div>
          </dl>

          <button
            onClick={requestWithdrawal}
            disabled={isPreparingRequest}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 text-sm font-bold text-zinc-900 transition-colors hover:bg-white disabled:opacity-60 cursor-pointer"
          >
            <Send className="h-4 w-4 shrink-0" />
            <span className="truncate">{isPreparingRequest ? "Preparing request..." : "Request withdrawal"}</span>
          </button>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 sm:mb-10"
      >
        <h2 className="mb-4 text-lg font-bold sm:text-xl">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="relative overflow-hidden rounded-xl bg-secondary/25 p-4 ring-1 ring-inset ring-white/5 sm:p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4">
                <p className="min-h-[2.2em] text-[11px] font-medium uppercase leading-tight tracking-wider text-muted-foreground sm:text-xs">{stat.label}</p>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9", stat.tint)}>
                  <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </div>
              </div>
              <p className="truncate text-xl font-bold tabular-nums tracking-tight sm:text-2xl lg:text-3xl">{stat.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{stat.hint}</p>
            </motion.div>
          )
        })}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8 sm:mb-10">
        <h2 className="mb-4 text-lg font-bold sm:text-xl">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.label} href={action.href} className="h-full">
                <motion.div
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative h-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-lg shadow-black/40 transition-colors hover:border-zinc-500 hover:bg-zinc-800 active:bg-zinc-800 sm:p-5"
                >
                  <div className="relative flex h-full flex-col">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 ring-1 ring-white/10 transition-colors group-hover:bg-zinc-100 sm:mb-4 sm:h-12 sm:w-12">
                      <Icon className="h-5 w-5 text-zinc-200 transition-colors group-hover:text-zinc-900 sm:h-6 sm:w-6" />
                    </div>
                    <p className="text-sm font-bold sm:text-base">{action.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{action.description}</p>
                    <ArrowUpRight className="absolute right-0 top-0 h-4 w-4 text-zinc-500 transition-colors group-hover:text-white" />
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <h2 className="text-lg font-bold sm:text-xl">Upcoming Events</h2>
          <Link href="/dashboard/events" className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-soft hover:text-white">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {eventsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading events...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No upcoming events</div>
          ) : (
            upcomingEvents.map((event) => {
              // Shared with the events page so one event reads the same on both:
              // ledger revenue, and every ticket issued including comps.
              const eventRevenue = getEventRevenue(event)
              const totalTickets = getEventTicketsIssued(event)

              return (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/30 p-3 transition-colors hover:bg-secondary/50 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 truncate font-semibold">{event.eventName}</h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {new Date(event.eventStartDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{event.eventLocation}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold tabular-nums">{event.currency} {eventRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground sm:text-sm">{totalTickets} tickets</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}
