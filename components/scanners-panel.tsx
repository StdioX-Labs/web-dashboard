"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { CheckCircle, Copy, Download, KeyRound, Loader2, LogIn, Power, RefreshCw, ScanLine, Search, Smartphone, Ticket, X, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { api, ApiError, type GateCheckin, type GateScanner, type GateScannerEvent } from "@/lib/api-client"
import { formatPhoneNumber, isValidPhoneNumber, PHONE_NUMBER_HINT } from "@/lib/phone"
import { FieldError, FormError, errorInputClass, type FieldErrors } from "@/components/form-errors"
import { sessionManager } from "@/lib/session-manager"

/**
 * Door staff for the gate scanner app, for the signed-in owner's company.
 *
 * A scanner is a phone number and password that signs in to the gate app only
 * (never this dashboard), attached to one event at a time. Moving them to
 * another event moves every phone they're signed in on; switching them off or
 * giving them a new password signs those phones out. Check-ins show who let
 * each ticket in. Ported from the admin console's Scanners page.
 */

const GATE_APP = "soldoutafrica.com/scanner"

const CHANNEL: Record<string, string> = { H: "Live", B: "Synced after outage", S: "By SMS", L: "Found by search" }

const inputClass = "w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all"
const selectClass = cn(inputClass, "appearance-none cursor-pointer pr-10 bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:0.75rem] bg-[center_right_1rem] bg-no-repeat")
const primaryButton = "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
const quietButton = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold border border-border bg-secondary text-foreground hover:bg-secondary/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"

/** Easy to read out and type on a phone: no 0/o, 1/l/i. */
function newPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

/** 254712345678 reads back as 0712 345 678. */
function localPhone(phone: string): string {
  const p = formatPhoneNumber(phone)
  return /^254\d{9}$/.test(p) ? `0${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}` : phone
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : format(d, "d MMM yyyy")
}

/** An event's full name with its date, so two events with similar names can be told apart. */
function eventLabel(e: GateScannerEvent): string {
  const when = e.startDate ? ` · ${shortDate(e.startDate)}` : ""
  const state = e.status && e.status !== "ACTIVE" ? ` (${e.status.toLowerCase()})` : ""
  return `${e.eventName}${when}${state}`
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

/** The API says the signed session cookie is missing or stale: only signing in again fixes it. */
function needsSignIn(error: unknown): boolean {
  return error instanceof ApiError && (error.response as { signIn?: unknown } | null)?.signIn === true
}

/** Where a create error belongs in the form. */
function fieldFor(message: string): string {
  if (/phone/i.test(message)) return "phone"
  if (/password/i.test(message)) return "password"
  if (/name/i.test(message)) return "name"
  if (/event/i.test(message)) return "eventId"
  return "form"
}

interface Credentials {
  name: string
  phone: string
  password: string
  eventName: string | null
  reset: boolean
}

type Confirm = { kind: "password" | "off"; scanner: GateScanner } | null

export default function ScannersPanel({ addOpen, onAddOpenChange }: { addOpen: boolean; onAddOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [scanners, setScanners] = useState<GateScanner[]>([])
  const [events, setEvents] = useState<GateScannerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<{ message: string; signIn: boolean } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  // New scanner form
  const [form, setForm] = useState({ name: "", phone: "", password: newPassword(), eventId: "" })
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [creating, setCreating] = useState(false)

  // Check-ins
  const [checkinEvent, setCheckinEvent] = useState("")
  const [checkins, setCheckins] = useState<GateCheckin[] | null>(null)
  const [loadingCheckins, setLoadingCheckins] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, e] = await Promise.all([api.scanners.list(), api.scanners.events()])
      const list = e.events ?? []
      setScanners(s.scanners ?? [])
      setEvents(list)
      setLoadError(null)
      setForm((f) => (f.eventId || !list[0] ? f : { ...f, eventId: String(list[0].id) }))
      setCheckinEvent((prev) => prev || (list[0] ? String(list[0].id) : ""))
    } catch (error) {
      setLoadError({ message: errorText(error, "Couldn't load your scanners."), signIn: needsSignIn(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const eventNames = useMemo(() => new Map(events.map((e) => [e.id, e.eventName])), [events])

  const filtered = scanners.filter((s) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const digits = q.replace(/\D/g, "")
    const phoneMatch = digits.length > 0 && (s.phone.includes(digits) || localPhone(s.phone).replace(/\s/g, "").includes(digits))
    return s.name.toLowerCase().includes(q) || phoneMatch || (s.eventName ?? "").toLowerCase().includes(q)
  })

  const signInAgain = () => {
    sessionManager.clearSession()
    router.push("/")
  }

  const closeAdd = () => {
    if (creating) return
    onAddOpenChange(false)
    setFormErrors({})
  }

  const clearFormError = (key: string) =>
    setFormErrors((prev) => {
      if (!prev[key] && !prev.form) return prev
      const next = { ...prev }
      delete next[key]
      delete next.form
      return next
    })

  const create = async () => {
    if (creating) return
    const errors: FieldErrors = {}
    const name = form.name.trim().replace(/\s+/g, " ")
    if (name.length < 2 || name.length > 60) errors.name = "Give the scanner a name (2 to 60 characters)"
    if (!form.phone.trim()) errors.phone = "Enter the scanner's phone number"
    else if (!isValidPhoneNumber(form.phone)) errors.phone = PHONE_NUMBER_HINT
    if (form.password.length < 6) errors.password = "The password needs at least 6 characters"
    else if (form.password.length > 72) errors.password = "The password is too long (72 characters at most)"
    setFormErrors(errors)
    if (Object.keys(errors).length) return

    setCreating(true)
    try {
      const s = await api.scanners.create({
        name,
        phone: formatPhoneNumber(form.phone),
        password: form.password,
        eventId: form.eventId ? Number(form.eventId) : null,
      })
      setCredentials({ name: s.name, phone: s.phone, password: form.password, eventName: s.eventName, reset: false })
      toast.success(`${s.name} can now sign in to the gate app`)
      onAddOpenChange(false)
      setForm((f) => ({ name: "", phone: "", password: newPassword(), eventId: f.eventId }))
      setFormErrors({})
      await load()
    } catch (error) {
      const message = errorText(error, "Couldn't create the scanner. Please try again.")
      if (needsSignIn(error)) setLoadError({ message, signIn: true })
      setFormErrors({ [fieldFor(message)]: message })
    } finally {
      setCreating(false)
    }
  }

  const act = async (s: GateScanner, run: () => Promise<unknown>, done: string) => {
    setBusyId(s.id)
    try {
      await run()
      toast.success(done)
      await load()
      return true
    } catch (error) {
      if (needsSignIn(error)) setLoadError({ message: errorText(error, "Sign in again to manage scanners."), signIn: true })
      toast.error(errorText(error, "Couldn't update the scanner. Please try again."))
      return false
    } finally {
      setBusyId(null)
    }
  }

  const reattach = (s: GateScanner, value: string) => {
    const target = value ? Number(value) : null
    const label = target ? eventNames.get(target) ?? "the event" : null
    return act(s, () => api.scanners.attach(s.id, target),
      label ? `${s.name} now scans ${label}. Their phones switch over within a minute.` : `${s.name} is no longer attached to an event.`)
  }

  const confirmAction = async () => {
    if (!confirm) return
    const { kind, scanner: s } = confirm
    setConfirm(null)
    if (kind === "password") {
      const password = newPassword()
      const ok = await act(s, () => api.scanners.setPassword(s.id, password), `${s.name} has a new password. Their phones were signed out.`)
      if (ok) setCredentials({ name: s.name, phone: s.phone, password, eventName: s.eventName, reset: true })
    } else {
      await act(s, () => api.scanners.setActive(s.id, false), `${s.name} is switched off.`)
    }
  }

  const switchOn = (s: GateScanner) => act(s, () => api.scanners.setActive(s.id, true), `${s.name} is switched on.`)

  const copyCredentials = async (c: Credentials) => {
    const text = [
      "SoldOut gate scanner",
      `App: ${GATE_APP} (choose "Scanner login")`,
      `Phone: ${localPhone(c.phone)}`,
      `Password: ${c.password}`,
      c.eventName ? `Event: ${c.eventName}` : null,
    ].filter(Boolean).join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Sign-in details copied")
    } catch {
      toast.error("Couldn't copy. Select the details and copy them instead.")
    }
  }

  const loadCheckins = async () => {
    if (!checkinEvent) return
    setLoadingCheckins(true)
    try {
      const r = await api.scanners.checkins(Number(checkinEvent))
      setCheckins(r.checkins ?? [])
    } catch (error) {
      if (needsSignIn(error)) setLoadError({ message: errorText(error, "Sign in again to manage scanners."), signIn: true })
      toast.error(errorText(error, "Couldn't load check-ins. Please try again."))
    } finally {
      setLoadingCheckins(false)
    }
  }

  const downloadCheckins = () => {
    if (!checkins?.length) return
    const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const rows = checkins.map((c) => [
      new Date(c.scannedAt).toLocaleString(),
      c.ticketName,
      c.barcode,
      c.orderCode,
      c.holderName ?? "",
      c.holderPhone ?? "",
      c.scannedByName ?? "",
      c.scannedByPhone ?? "",
      c.gate ?? "",
      CHANNEL[c.channel ?? ""] ?? "",
    ])
    const csv = [
      ["Scanned at", "Ticket", "Barcode", "Order", "Holder", "Holder phone", "Scanned by", "Scanned by phone", "Gate", "How"].join(","),
      ...rows.map((r) => r.map((v) => esc(String(v))).join(",")),
    ].join("\r\n")
    const label = (eventNames.get(Number(checkinEvent)) ?? checkinEvent).toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `checkins-${label}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const photoUrl = (c: GateCheckin) =>
    `/api/scanners/photo/${c.photoId}?eventId=${checkinEvent}&barcode=${encodeURIComponent(c.barcode)}`

  const active = scanners.filter((s) => s.active).length
  const attached = scanners.filter((s) => s.active && s.eventId).length
  const phones = scanners.reduce((sum, s) => sum + (s.phones || 0), 0)

  if (loadError?.signIn) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
        <LogIn className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-bold text-lg mb-1">Sign in again to manage scanners</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">{loadError.message === "Sign in again to manage scanners." ? "Scanner accounts need a fresh sign-in on this device. It only takes a moment." : loadError.message}</p>
        <button onClick={signInAgain} className={primaryButton}><LogIn className="w-4 h-4" />Sign in again</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Scanners", value: scanners.length, icon: ScanLine, color: "text-zinc-300", bg: "bg-zinc-800 dark:bg-zinc-800/50" },
          { label: "Active", value: active, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Attached to an event", value: attached, icon: Ticket, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Phones signed in", value: phones, icon: Smartphone, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className={cn("p-1.5 sm:p-2 rounded-lg inline-flex mb-2", stat.bg)}><Icon className={cn("w-3 h-3 sm:w-4 sm:h-4", stat.color)} /></div>
              <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
              <p className="text-lg sm:text-xl font-bold">{loading && !scanners.length ? "–" : stat.value}</p>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {credentials && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50/60 dark:bg-green-950/20 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold mb-1">{credentials.reset ? `${credentials.name}'s new sign-in details` : `${credentials.name} is ready to scan`}</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Share these with them now — the password isn&apos;t shown again.{" "}
                  {credentials.eventName ? `They scan ${credentials.eventName}.` : "Attach them to an event before they can scan."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-background/70 border border-border px-3 py-2 min-w-0"><p className="text-xs text-muted-foreground">Gate app</p><p className="font-medium break-all">{GATE_APP}</p></div>
                  <div className="rounded-lg bg-background/70 border border-border px-3 py-2"><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium tabular-nums">{localPhone(credentials.phone)}</p></div>
                  <div className="rounded-lg bg-background/70 border border-border px-3 py-2"><p className="text-xs text-muted-foreground">Password</p><p className="font-mono font-semibold tracking-wide">{credentials.password}</p></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">In the app, they choose “Scanner login”.</p>
                <button onClick={() => copyCredentials(credentials)} className={cn(quietButton, "mt-3")}><Copy className="w-4 h-4" />Copy sign-in details</button>
              </div>
              <button onClick={() => setCredentials(null)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors flex-shrink-0" aria-label="Dismiss"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Search scanners by name, phone or event..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all" />
          </div>
          <button onClick={() => load()} disabled={loading} className={quietButton}><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />Refresh</button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Scanners sign in to the gate app at {GATE_APP} with a phone number and password. They can only scan tickets for the event they&apos;re attached to and never see this dashboard.
        </p>
      </div>

      {loadError && <FormError message={loadError.message} />}

      {loading && !scanners.length ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
            <p className="text-muted-foreground">Loading scanners...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        !loadError && (
          <div className="text-center py-12 text-muted-foreground">
            <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-50" />
            {scanners.length === 0 ? (
              <>
                <p className="mb-4">No scanners yet. Add one for each person working your gates.</p>
                <button onClick={() => onAddOpenChange(true)} className={primaryButton}>Add a scanner</button>
              </>
            ) : (
              <p>No scanners match “{search.trim()}”</p>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
            const busy = busyId === s.id
            return (
              <div key={s.id} className={cn("rounded-xl border bg-card p-4 sm:p-6 transition-all", s.active ? "border-border hover:border-zinc-500/30" : "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10", busy && "opacity-60")}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-950/30"><ScanLine className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-base sm:text-lg break-words">{s.name}</h3>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", s.active ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400")}>
                          {s.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {s.active ? "Active" : "Switched off"}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground tabular-nums mb-2">{localPhone(s.phone)}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span><span className="font-medium text-foreground tabular-nums">{s.phones}</span> phone{s.phones === 1 ? "" : "s"} signed in</span>
                        <span><span className="font-medium text-foreground tabular-nums">{s.admitted.toLocaleString()}</span> let in</span>
                        <span>Last sign-in: {s.lastLoginAt ? formatDistanceToNow(new Date(s.lastLoginAt), { addSuffix: true }) : "never"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:w-auto">
                    <label className="flex-1 lg:w-80 min-w-0">
                      <span className="sr-only">Event for {s.name}</span>
                      <select value={s.eventId ?? ""} disabled={busy} onChange={(e) => reattach(s, e.target.value)} title={s.eventName ?? "Not attached"} className={cn(selectClass, "h-10 text-sm")}>
                        <option value="">Not attached to an event</option>
                        {s.eventId && !eventNames.has(s.eventId) && <option value={s.eventId}>{s.eventName ?? `Event ${s.eventId}`} (over)</option>}
                        {events.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirm({ kind: "password", scanner: s })} disabled={busy} className={cn(quietButton, "flex-1 sm:flex-initial")}><KeyRound className="w-4 h-4" />New password</button>
                      {s.active ? (
                        <button onClick={() => setConfirm({ kind: "off", scanner: s })} disabled={busy} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900 disabled:opacity-50"><Power className="w-4 h-4" />Switch off</button>
                      ) : (
                        <button onClick={() => switchOn(s)} disabled={busy} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-950/50 border-green-200 dark:border-green-900 disabled:opacity-50"><Power className="w-4 h-4" />Switch on</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Check-ins */}
      {!loadError && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h3 className="font-bold text-lg mb-1">Check-ins</h3>
          <p className="text-sm text-muted-foreground mb-4">Every ticket let in at an event: when, at which gate, and who scanned it.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 min-w-0">
              <span className="sr-only">Event for check-ins</span>
              <select value={checkinEvent} onChange={(e) => { setCheckinEvent(e.target.value); setCheckins(null) }} title={eventNames.get(Number(checkinEvent)) ?? "Choose an event"} className={selectClass}>
                <option value="">Choose an event</option>
                {events.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}
              </select>
            </label>
            <button onClick={loadCheckins} disabled={!checkinEvent || loadingCheckins} className={primaryButton}>
              {loadingCheckins ? <><Loader2 className="w-4 h-4 animate-spin" />Loading...</> : "Show who scanned"}
            </button>
          </div>
          {!loading && events.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">You have no current events. Check-ins are listed here while an event is on and for 12 hours after it ends.</p>
          )}

          {checkins && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{checkins.length.toLocaleString()}</span> let in</p>
                {checkins.length > 0 && <button onClick={downloadCheckins} className={quietButton}><Download className="w-4 h-4" />CSV</button>}
              </div>
              {checkins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody has been scanned in at this event yet.</p>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Scanned</th>
                          <th className="px-3 py-2 font-medium">Ticket</th>
                          <th className="px-3 py-2 font-medium">Holder</th>
                          <th className="px-3 py-2 font-medium">Scanned by</th>
                          <th className="px-3 py-2 font-medium">Gate</th>
                          <th className="px-3 py-2 font-medium">How</th>
                          <th className="px-3 py-2 font-medium">Photo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {checkins.slice(0, 500).map((c) => (
                          <tr key={c.ticketId}>
                            <td className="px-3 py-2 whitespace-nowrap tabular-nums text-xs">{format(new Date(c.scannedAt), "d MMM, HH:mm")}</td>
                            <td className="px-3 py-2"><div className="font-medium">{c.ticketName}</div><div className="text-xs text-muted-foreground tabular-nums">{c.barcode}</div></td>
                            <td className="px-3 py-2"><div>{c.holderName || "—"}</div>{c.holderPhone && <div className="text-xs text-muted-foreground tabular-nums">{localPhone(c.holderPhone)}</div>}</td>
                            <td className="px-3 py-2"><div className="font-medium">{c.scannedByName || "—"}</div>{c.scannedByPhone && <div className="text-xs text-muted-foreground tabular-nums">{localPhone(c.scannedByPhone)}</div>}</td>
                            <td className="px-3 py-2">{c.gate || "—"}</td>
                            <td className="px-3 py-2 text-xs">{CHANNEL[c.channel ?? ""] ?? "Older scanner"}</td>
                            <td className="px-3 py-2 text-xs">{c.photoId ? <a href={photoUrl(c)} target="_blank" rel="noreferrer" className="underline">View</a> : <span className="text-muted-foreground">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {checkins.slice(0, 500).map((c) => (
                      <div key={c.ticketId} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><div className="font-medium break-words">{c.ticketName}</div><div className="text-xs text-muted-foreground tabular-nums break-all">{c.barcode}</div></div>
                          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{format(new Date(c.scannedAt), "d MMM, HH:mm")}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                          <div>Holder: <span className="text-foreground">{c.holderName || "—"}</span></div>
                          <div>Scanned by: <span className="text-foreground">{c.scannedByName || "—"}</span>{c.gate ? ` · ${c.gate}` : ""} · {CHANNEL[c.channel ?? ""] ?? "Older scanner"}</div>
                          {c.photoId && <a href={photoUrl(c)} target="_blank" rel="noreferrer" className="underline">View photo</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {checkins.length > 500 && <p className="text-xs text-muted-foreground mt-2">Showing the latest 500. The CSV has all {checkins.length.toLocaleString()}.</p>}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add scanner */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeAdd} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} role="dialog" aria-modal="true" aria-label="Add a scanner" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={closeAdd} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors" aria-label="Close"><X className="w-5 h-5" /></button>
              <h3 className="text-xl font-bold mb-1">Add a scanner</h3>
              <p className="text-sm text-muted-foreground mb-6">They sign in to the gate app with this phone number and password, and can only scan the event you attach them to.</p>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void create() }}>
                <div>
                  <label htmlFor="scanner-name" className="text-sm font-medium mb-2 block">Name *</label>
                  <input id="scanner-name" type="text" value={form.name} autoFocus autoComplete="off" onChange={(e) => { setForm({ ...form, name: e.target.value }); clearFormError("name") }} placeholder="Jane Wanjiku" className={cn(inputClass, formErrors.name && errorInputClass)} />
                  <FieldError message={formErrors.name} />
                </div>
                <div>
                  <label htmlFor="scanner-phone" className="text-sm font-medium mb-2 block">Phone number *</label>
                  <input id="scanner-phone" type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); clearFormError("phone") }} placeholder="0712 345 678" className={cn(inputClass, formErrors.phone && errorInputClass)} />
                  <FieldError message={formErrors.phone} />
                  <p className="text-xs text-muted-foreground mt-1">The number they type to sign in. Each scanner needs their own.</p>
                </div>
                <div>
                  <label htmlFor="scanner-password" className="text-sm font-medium mb-2 block">Password *</label>
                  <div className="flex gap-2">
                    <input id="scanner-password" type="text" autoComplete="off" spellCheck={false} value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); clearFormError("password") }} className={cn(inputClass, "font-mono", formErrors.password && errorInputClass)} />
                    <button type="button" onClick={() => { setForm({ ...form, password: newPassword() }); clearFormError("password") }} className={cn(quietButton, "h-12 px-4 rounded-xl")} title="Make a new password"><RefreshCw className="w-4 h-4" />New</button>
                  </div>
                  <FieldError message={formErrors.password} />
                  <p className="text-xs text-muted-foreground mt-1">Made easy to type on a phone. You&apos;ll see it again once you create the scanner.</p>
                </div>
                <div>
                  <label htmlFor="scanner-event" className="text-sm font-medium mb-2 block">Event</label>
                  <select id="scanner-event" value={form.eventId} onChange={(e) => { setForm({ ...form, eventId: e.target.value }); clearFormError("eventId") }} title={eventNames.get(Number(form.eventId)) ?? "Not attached yet"} className={cn(selectClass, formErrors.eventId && errorInputClass)}>
                    <option value="">Not attached yet</option>
                    {events.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}
                  </select>
                  <FieldError message={formErrors.eventId} />
                  <p className="text-xs text-muted-foreground mt-1">You can move them to another event later.</p>
                </div>
                <FormError message={formErrors.form} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeAdd} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Cancel</button>
                  <button type="submit" disabled={creating} className="flex-1 px-4 py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-zinc-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{creating ? "Creating..." : "Create scanner"}</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm new password / switch off */}
      <AnimatePresence>
        {confirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} role="dialog" aria-modal="true" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl">
              <button onClick={() => setConfirm(null)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors" aria-label="Close"><X className="w-5 h-5" /></button>
              <h3 className="text-xl font-bold mb-4">{confirm.kind === "password" ? `New password for ${confirm.scanner.name}?` : `Switch off ${confirm.scanner.name}?`}</h3>
              <p className="text-muted-foreground mb-6">
                {confirm.kind === "password"
                  ? "Phones signed in with the old password are signed out. You'll see the new one to share with them."
                  : "Their phones stop scanning straight away. You can switch them back on at any time."}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirm(null)} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Cancel</button>
                <button onClick={confirmAction} className={cn("flex-1 px-4 py-3 rounded-xl font-semibold transition-all text-white",
                  confirm.kind === "off" ? "bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-600/30" : "bg-gradient-to-r from-zinc-700 to-zinc-900 hover:shadow-lg hover:shadow-zinc-500/30")}>
                  {confirm.kind === "off" ? "Switch off" : "Make new password"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
