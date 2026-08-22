"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowRight,
  Building,
  CalendarDays,
  CheckCircle,
  Loader2,
  Mail,
  Phone,
  TrendingUp,
  User,
} from "lucide-react"
import { captureAttribution, type Attribution } from "@/lib/attribution"
import { formatPhoneNumber } from "@/lib/phone"
import {
  LAST_EVENT_GROSS_OPTIONS,
  NEXT_EVENT_OPTIONS,
} from "@/lib/lead-qualification"

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

const PROOF_POINTS = [
  "Withdraw to M-Pesa as tickets sell — no waiting for the event to end",
  "Event funding and prefinancing before a single ticket goes on sale",
  "Help securing event equipment — sound, staging, screens and more",
  "Deep customer analytics: who your buyers are, and which post, link or promoter sold each ticket",
  "Free gate scanners and a team on site for your first event",
]

export default function GetStartedPage() {
  const router = useRouter()
  const [attribution, setAttribution] = useState<Attribution>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [fullName, setFullName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [lastEventGross, setLastEventGross] = useState("")
  const [nextEventWindow, setNextEventWindow] = useState("")

  useEffect(() => {
    setAttribution(captureAttribution())
  }, [])

  const validate = (): boolean => {
    if (!fullName.trim()) {
      toast.error("Please enter your name")
      return false
    }
    if (formatPhoneNumber(mobileNumber).length < 12) {
      toast.error("Please enter a valid WhatsApp number")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address")
      return false
    }
    if (!lastEventGross) {
      toast.error("Please tell us about your last event")
      return false
    }
    if (!nextEventWindow) {
      toast.error("Please tell us when your next event is")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/organizer-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          mobileNumber,
          email,
          companyName,
          lastEventGross,
          nextEventWindow,
          ...attribution,
        }),
      })
      const data = await res.json()

      if (!data.status) {
        toast.error(data.message || "Something went wrong. Please try again.")
        setIsSubmitting(false)
        return
      }

      // Browser-side conversion signals. The server has already sent the Meta
      // CAPI copy; Meta de-duplicates, and Google only has this one.
      const gadsLeadLabel = process.env.NEXT_PUBLIC_GADS_LEAD_LABEL
      if (gadsLeadLabel && window.gtag) {
        window.gtag("event", "conversion", { send_to: gadsLeadLabel })
      }
      // Same eventID the server sent to the Conversions API, so Meta
      // de-duplicates the browser and server copies into one Lead.
      window.fbq?.("track", "Lead", {}, { eventID: data.eventId })

      if (data.qualified) {
        setSubmitted(true)
        setIsSubmitting(false)
        return
      }

      // Below the bar for a sales call, so send them to self-serve signup
      // rather than dropping them. Prefilled so they only retype a password.
      toast.success("Let us get your account set up")
      const prefill = new URLSearchParams({
        name: fullName,
        email,
        phone: formatPhoneNumber(mobileNumber),
        company: companyName,
      })
      router.push("/signup?" + prefill.toString())
    } catch (error) {
      console.error("Lead submit failed:", error)
      toast.error("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 max-w-md text-center shadow-xl"
        >
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-5" />
          <h1 className="text-2xl font-bold mb-3">We will call you shortly</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Thanks {fullName.split(" ")[0]} — someone from our team will reach you
            on WhatsApp within the hour to walk through live payouts, funding and
            equipment for your next event.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold hover:bg-[#7c3aed] transition-colors"
          >
            Set up my account now
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </main>
    )
  }

  const fieldClass =
    "w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
  const iconClass =
    "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"

  return (
    <main className="min-h-screen px-4 py-8 md:py-16">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <div className="lg:pt-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            For organisers selling 100+ tickets
          </span>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-[1.1]">
            Access your ticket money as it sells
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 lg:mb-10">
            Withdraw your ticket sales to M-Pesa live, as the money comes in —
            no waiting for the event to end. We also fund events, help secure
            equipment, and show you exactly who your buyers are.
          </p>

          <ul className="hidden lg:block space-y-3">
            {PROOF_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-xl font-bold mb-1">Talk to us about your event</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Takes under a minute. No card, no commitment.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className={iconClass} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className={fieldClass}
              />
            </div>

            <div className="relative">
              <Phone className={iconClass} />
              <input
                type="tel"
                inputMode="numeric"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="WhatsApp number (0712345678)"
                autoComplete="tel"
                className={fieldClass}
              />
            </div>

            <div className="relative">
              <Mail className={iconClass} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className={fieldClass}
              />
            </div>

            <div className="relative">
              <Building className={iconClass} />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Event or company name"
                autoComplete="organization"
                className={fieldClass}
              />
            </div>

            <div className="relative">
              <TrendingUp className={iconClass} />
              <select
                value={lastEventGross}
                onChange={(e) => setLastEventGross(e.target.value)}
                className={fieldClass + " appearance-none"}
              >
                <option value="">Ticket sales at your last event</option>
                {LAST_EVENT_GROSS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <CalendarDays className={iconClass} />
              <select
                value={nextEventWindow}
                onChange={(e) => setNextEventWindow(e.target.value)}
                className={fieldClass + " appearance-none"}
              >
                <option value="">When is your next event?</option>
                {NEXT_EVENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#7c3aed] disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Request a callback
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              Already have an account?{" "}
              <a href="/" className="text-[#8b5cf6] font-medium hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </motion.div>

        <ul className="lg:hidden space-y-3">
          {PROOF_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
