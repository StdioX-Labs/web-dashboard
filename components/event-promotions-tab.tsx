"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Tag,
  Zap,
  Plus,
  Search,
  Copy,
  CheckCircle,
  Loader2,
  X,
  Info,
  Pause,
  Play,
  Edit,
  Percent,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { api, DiscountType, FlashSale, PromoCode } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"

interface PromotionTicket {
  id: number
  name: string
  price: number
}

interface EventPromotionsTabProps {
  eventId: number
  eventName: string
  currency: string
  tickets: PromotionTicket[]
  /** Defaults the end of new promotions to when the event ends. */
  eventEndDate?: string
}

// The API stores promotion windows as zone-less LocalDateTime and compares
// them against its own clock, which runs in Africa/Nairobi. Send and read
// Nairobi wall-clock time so a code starts when the organizer meant it to,
// whatever timezone their browser is in.
const NAIROBI_OFFSET = "+03:00"

function toNairobiLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`
}

function fromNairobiLocal(value: string): Date {
  return new Date(`${value.slice(0, 19)}${NAIROBI_OFFSET}`)
}

function formatWindowDate(value: string) {
  return fromNairobiLocal(value).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type PromotionStatus = "active" | "scheduled" | "expired" | "used-up" | "paused"

function statusOf(isActive: boolean, start: string, end: string, used: number, limit: number): PromotionStatus {
  if (!isActive) return "paused"
  const now = Date.now()
  if (fromNairobiLocal(end).getTime() < now) return "expired"
  if (used >= limit) return "used-up"
  if (fromNairobiLocal(start).getTime() > now) return "scheduled"
  return "active"
}

const STATUS_STYLES: Record<PromotionStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  expired: { label: "Expired", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  "used-up": { label: "Used up", className: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
  paused: { label: "Inactive", className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
}

function StatusBadge({ status }: { status: PromotionStatus }) {
  const style = STATUS_STYLES[status]
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", style.className)}>
      {style.label}
    </span>
  )
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  return (
    <div>
      <p className="text-sm">
        {used.toLocaleString()} <span className="text-muted-foreground">/ {limit.toLocaleString()}</span>
      </p>
      <div className="w-24 h-1.5 rounded-full bg-secondary mt-1.5 overflow-hidden">
        <div className="h-full bg-zinc-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const inputClass =
  "w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all"
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 h-11 px-4 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"

function Modal({ title, subtitle, onClose, children, footer }: {
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
  /** Stays below the scrolling body so the actions are always in reach. */
  footer?: React.ReactNode
}) {
  // Portalled: the tab content animates with a transform, which would make
  // these fixed layers position against it instead of the viewport.
  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-border">{footer}</div>}
      </motion.div>
    </>,
    document.body
  )
}

function ModalActions({ onCancel, onSubmit, busy, busyLabel, label }: {
  onCancel: () => void
  onSubmit: () => void
  busy: boolean
  busyLabel: string
  label: string
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onCancel}
        className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={busy}
        className="flex-1 px-4 py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {busyLabel}
          </>
        ) : (
          label
        )}
      </button>
    </div>
  )
}

function StatCards({ stats }: { stats: { label: string; value: string; icon: React.ElementType; bg: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", stat.bg)}>
              <Icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p className="text-lg sm:text-xl font-bold break-words">{stat.value}</p>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ icon: Icon, title, body, action }: {
  icon: React.ElementType
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/50">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{body}</p>
      {action}
    </div>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <Loader2 className="w-12 h-12 animate-spin text-zinc-300" />
      <p className="text-base font-medium text-foreground">{label}</p>
    </div>
  )
}

export function EventPromotionsTab({ eventId, eventName, currency, tickets, eventEndDate }: EventPromotionsTabProps) {
  const [section, setSection] = useState<"codes" | "flash">("codes")

  // Promo codes
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [codesLoading, setCodesLoading] = useState(true)
  const [codeSearch, setCodeSearch] = useState("")
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [codeMode, setCodeMode] = useState<"single" | "batch">("single")
  const [codeValue, setCodeValue] = useState("")
  const [codeCount, setCodeCount] = useState("10")
  const [codeScope, setCodeScope] = useState<"EVENT" | "TICKET" | "COMPANY">("EVENT")
  const [codeTicketId, setCodeTicketId] = useState("")
  const [codeDiscountType, setCodeDiscountType] = useState<DiscountType>("PERCENTAGE")
  const [codeDiscountValue, setCodeDiscountValue] = useState("10")
  const [codeMaxUses, setCodeMaxUses] = useState("100")
  const [codeValidFrom, setCodeValidFrom] = useState<Date | undefined>(undefined)
  const [codeValidUntil, setCodeValidUntil] = useState<Date | undefined>(undefined)
  const [isCreatingCode, setIsCreatingCode] = useState(false)
  const [createdCodes, setCreatedCodes] = useState<string[] | null>(null)
  const [togglingCodeId, setTogglingCodeId] = useState<number | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Flash sales
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [flashLoading, setFlashLoading] = useState(true)
  const [showFlashModal, setShowFlashModal] = useState(false)
  const [editingFlash, setEditingFlash] = useState<FlashSale | null>(null)
  const [flashName, setFlashName] = useState("")
  const [flashTicketId, setFlashTicketId] = useState("")
  const [flashPrice, setFlashPrice] = useState("")
  const [flashQuantity, setFlashQuantity] = useState("50")
  const [flashStart, setFlashStart] = useState<Date | undefined>(undefined)
  const [flashEnd, setFlashEnd] = useState<Date | undefined>(undefined)
  const [isSavingFlash, setIsSavingFlash] = useState(false)
  const [togglingFlashId, setTogglingFlashId] = useState<number | null>(null)

  const ticketName = (id: number | null | undefined) => tickets.find((t) => t.id === id)?.name

  const loadPromoCodes = async () => {
    const user = sessionManager.getUser()
    if (!user) return
    setCodesLoading(true)
    try {
      const response = await api.promoCodes.list(user.user_id, user.company_id)
      // The API lists by company; keep this event's codes and the company-wide ones.
      setPromoCodes(
        (response.promocodes || []).filter((code) => code.eventId === eventId || code.scope === "COMPANY")
      )
    } catch (error) {
      console.error("Failed to fetch promo codes:", error)
      toast.error("Failed to load promo codes", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setPromoCodes([])
    } finally {
      setCodesLoading(false)
    }
  }

  const loadFlashSales = async () => {
    const user = sessionManager.getUser()
    if (!user) return
    setFlashLoading(true)
    try {
      const response = await api.flashSales.list(user.user_id, user.company_id)
      // Older API builds have no eventId on flash sales — fall back to the name.
      setFlashSales(
        (response.flashSales || []).filter((sale) =>
          sale.eventId != null ? sale.eventId === eventId : sale.eventName === eventName
        )
      )
    } catch (error) {
      console.error("Failed to fetch flash sales:", error)
      toast.error("Failed to load flash sales", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setFlashSales([])
    } finally {
      setFlashLoading(false)
    }
  }

  useEffect(() => {
    loadPromoCodes()
    loadFlashSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const defaultEnd = () => {
    const end = eventEndDate ? new Date(eventEndDate) : null
    return end && end.getTime() > Date.now() ? end : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }

  const handleCopy = async (text: string, label = text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(label)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopiedCode((current) => (current === label ? null : current)), 2000)
    } catch {
      toast.error("Could not copy — select it and copy manually")
    }
  }

  // ---------------------------------------------------------------- promo codes

  const openCodeModal = () => {
    setCodeMode("single")
    setCodeValue("")
    setCodeCount("10")
    setCodeScope("EVENT")
    setCodeTicketId(tickets[0] ? String(tickets[0].id) : "")
    setCodeDiscountType("PERCENTAGE")
    setCodeDiscountValue("10")
    setCodeMaxUses("100")
    setCodeValidFrom(new Date())
    setCodeValidUntil(defaultEnd())
    setCreatedCodes(null)
    setShowCodeModal(true)
  }

  const handleCreateCode = async () => {
    const user = sessionManager.getUser()
    if (!user) {
      toast.error("Your session has expired. Please sign in again.")
      return
    }

    const code = codeValue.trim().toUpperCase()
    const discountValue = Number(codeDiscountValue)
    const maxUses = parseInt(codeMaxUses, 10)
    const count = parseInt(codeCount, 10)

    if (codeMode === "single" && code && !/^[A-Z0-9_-]{3,30}$/.test(code)) {
      toast.error("Codes are 3–30 letters, numbers, - or _")
      return
    }
    if (codeMode === "batch" && (!count || count < 1 || count > 250)) {
      toast.error("Generate between 1 and 250 codes at a time")
      return
    }
    if (!discountValue || discountValue <= 0) {
      toast.error("Enter a discount greater than zero")
      return
    }
    if (codeDiscountType === "PERCENTAGE" && discountValue > 100) {
      toast.error("A percentage discount cannot exceed 100%")
      return
    }
    if (!maxUses || maxUses < 1) {
      toast.error("Max uses must be at least 1")
      return
    }
    if (codeScope === "TICKET" && !codeTicketId) {
      toast.error("Pick the ticket this code applies to")
      return
    }
    if (!codeValidFrom || !codeValidUntil) {
      toast.error("Set when the code starts and ends")
      return
    }
    if (codeValidUntil.getTime() <= codeValidFrom.getTime()) {
      toast.error("The end must be after the start")
      return
    }

    setIsCreatingCode(true)
    try {
      const response = await api.promoCodes.create({
        userId: user.user_id,
        companyId: user.company_id,
        scope: codeScope,
        ...(codeScope !== "COMPANY" ? { eventId } : {}),
        ...(codeScope === "TICKET" ? { ticketId: Number(codeTicketId) } : {}),
        discountType: codeDiscountType,
        discountValue,
        validFrom: toNairobiLocal(codeValidFrom),
        validUntil: toNairobiLocal(codeValidUntil),
        maxUses,
        ...(codeMode === "single" && code ? { promoCode: code } : { numberOfPromoCodes: codeMode === "batch" ? count : 1 }),
      })

      if (!response.status) {
        throw new Error(response.message || "Failed to create promo code")
      }

      await loadPromoCodes()
      if (response.codes && response.codes.length > 0) {
        toast.success(response.message || "Promo code created")
        setCreatedCodes(response.codes)
      } else {
        // API builds that predate `codes` also ignore a custom code and
        // generate one instead — say so rather than imply it was kept.
        toast.success(response.message || "Promo code created", {
          description: codeMode === "single" && code ? "Check the list for the code that was issued." : undefined,
        })
        setShowCodeModal(false)
      }
    } catch (error) {
      console.error("Error creating promo code:", error)
      toast.error("Failed to create promo code", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsCreatingCode(false)
    }
  }

  const handleToggleCode = async (code: PromoCode) => {
    const user = sessionManager.getUser()
    if (!user) return
    setTogglingCodeId(code.id)
    try {
      const response = await api.promoCodes.toggle(user.user_id, code.id)
      if (!response.status) throw new Error(response.message || "Failed to update promo code")
      toast.success(code.isActive ? `${code.code} deactivated` : `${code.code} activated`)
      setPromoCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, isActive: !c.isActive } : c)))
    } catch (error) {
      console.error("Error toggling promo code:", error)
      toast.error("Failed to update promo code", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setTogglingCodeId(null)
    }
  }

  const formatDiscount = (type: DiscountType, value: number) =>
    type === "PERCENTAGE" ? `${value}% off` : `${currency} ${value.toLocaleString()} off`

  const appliesTo = (code: PromoCode) =>
    code.scope === "COMPANY" ? "All your events" : code.scope === "TICKET" ? ticketName(code.ticketId) || "One ticket type" : "Every ticket"

  const filteredCodes = promoCodes.filter((code) => {
    const query = codeSearch.trim().toLowerCase()
    return !query || code.code.toLowerCase().includes(query)
  })

  const liveCodes = promoCodes.filter(
    (c) => statusOf(c.isActive, c.validFrom, c.validUntil, c.currentUses, c.maxUses) === "active"
  ).length
  const totalUses = promoCodes.reduce((sum, c) => sum + c.currentUses, 0)
  const totalCapacity = promoCodes.reduce((sum, c) => sum + c.maxUses, 0)

  // ---------------------------------------------------------------- flash sales

  const openFlashModal = (sale?: FlashSale) => {
    if (sale) {
      setEditingFlash(sale)
      setFlashName(sale.name || "")
      setFlashTicketId(String(sale.ticketId ?? tickets.find((t) => t.name === sale.ticketName)?.id ?? ""))
      setFlashPrice(String(sale.salePrice))
      setFlashQuantity(String(sale.maxQuantity))
      setFlashStart(fromNairobiLocal(sale.startTime))
      setFlashEnd(fromNairobiLocal(sale.validUntil))
    } else {
      setEditingFlash(null)
      setFlashName("")
      setFlashTicketId(tickets.find((t) => t.price > 0) ? String(tickets.find((t) => t.price > 0)!.id) : "")
      setFlashPrice("")
      setFlashQuantity("50")
      setFlashStart(new Date())
      setFlashEnd(new Date(Date.now() + 24 * 60 * 60 * 1000))
    }
    setShowFlashModal(true)
  }

  const flashTicket = tickets.find((t) => String(t.id) === flashTicketId)
  const flashOriginalPrice = editingFlash ? flashTicket?.price ?? editingFlash.originalPrice : flashTicket?.price
  const flashPercentOff =
    flashOriginalPrice && Number(flashPrice) > 0 && Number(flashPrice) < flashOriginalPrice
      ? Math.round((1 - Number(flashPrice) / flashOriginalPrice) * 100)
      : null

  const handleSaveFlash = async () => {
    const user = sessionManager.getUser()
    if (!user) {
      toast.error("Your session has expired. Please sign in again.")
      return
    }

    const salePrice = Number(flashPrice)
    const maxQuantity = parseInt(flashQuantity, 10)

    if (!flashName.trim()) {
      toast.error("Give the flash sale a name")
      return
    }
    if (!editingFlash && !flashTicket) {
      toast.error("Pick the ticket to put on sale")
      return
    }
    if (!salePrice || salePrice <= 0) {
      toast.error("Enter a sale price greater than zero")
      return
    }
    if (flashOriginalPrice !== undefined && salePrice >= flashOriginalPrice) {
      toast.error(`The sale price must be below the ticket price (${currency} ${flashOriginalPrice.toLocaleString()})`)
      return
    }
    if (!maxQuantity || maxQuantity < 1) {
      toast.error("Tickets on sale must be at least 1")
      return
    }
    if (editingFlash && maxQuantity < editingFlash.soldQuantity) {
      toast.error(`${editingFlash.soldQuantity} have already sold at this price — the limit can't go below that`)
      return
    }
    if (!flashStart || !flashEnd) {
      toast.error("Set when the sale starts and ends")
      return
    }
    if (flashEnd.getTime() <= flashStart.getTime()) {
      toast.error("The end must be after the start")
      return
    }

    setIsSavingFlash(true)
    try {
      const details = {
        userId: user.user_id,
        flashSaleName: flashName.trim(),
        salePrice,
        startTime: toNairobiLocal(flashStart),
        endTime: toNairobiLocal(flashEnd),
        maxQuantity,
      }
      const response = editingFlash
        ? await api.flashSales.update(editingFlash.id, details)
        : await api.flashSales.create({ ...details, eventId, ticketId: flashTicket!.id })

      if (!response.status) {
        throw new Error(response.message || "Failed to save flash sale")
      }

      toast.success(editingFlash ? "Flash sale updated" : "Flash sale created", {
        description: "It can take up to a minute to show as a flash sale at checkout.",
      })
      setShowFlashModal(false)
      await loadFlashSales()
    } catch (error) {
      console.error("Error saving flash sale:", error)
      toast.error("Failed to save flash sale", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsSavingFlash(false)
    }
  }

  const handleToggleFlash = async (sale: FlashSale) => {
    const user = sessionManager.getUser()
    if (!user) return
    setTogglingFlashId(sale.id)
    try {
      const response = await api.flashSales.toggle(user.user_id, sale.id)
      if (!response.status) throw new Error(response.message || "Failed to update flash sale")
      toast.success(sale.isActive ? `${sale.name} paused` : `${sale.name} resumed`)
      setFlashSales((prev) => prev.map((s) => (s.id === sale.id ? { ...s, isActive: !s.isActive } : s)))
    } catch (error) {
      console.error("Error toggling flash sale:", error)
      toast.error("Failed to update flash sale", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setTogglingFlashId(null)
    }
  }

  const liveSales = flashSales.filter(
    (s) => statusOf(s.isActive, s.startTime, s.validUntil, s.soldQuantity, s.maxQuantity) === "active"
  ).length
  const flashSold = flashSales.reduce((sum, s) => sum + s.soldQuantity, 0)
  const flashDiscountGiven = flashSales.reduce((sum, s) => sum + s.soldQuantity * (s.originalPrice - s.salePrice), 0)

  // ---------------------------------------------------------------- render

  const toggleButton = (isActive: boolean, busy: boolean, onClick: () => void, labels: [string, string]) => (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      {isActive ? labels[0] : labels[1]}
    </button>
  )

  const copyButton = (code: string) => (
    <button
      onClick={() => handleCopy(code)}
      className="p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
      title="Copy code"
    >
      {copiedCode === code ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Section switch */}
      <div className="inline-flex p-1 rounded-xl bg-secondary/60 border border-border">
        {[
          { id: "codes" as const, label: "Promo Codes", icon: Tag },
          { id: "flash" as const, label: "Flash Sales", icon: Zap },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                section === item.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </div>

      {section === "codes" ? (
        <>
          <StatCards
            stats={[
              { label: "Codes", value: promoCodes.length.toLocaleString(), icon: Tag, bg: "bg-zinc-800 dark:bg-zinc-800/50", color: "text-zinc-300" },
              { label: "Live now", value: liveCodes.toLocaleString(), icon: CheckCircle, bg: "bg-green-50 dark:bg-green-950/30", color: "text-green-600 dark:text-green-400" },
              { label: "Times used", value: totalUses.toLocaleString(), icon: Percent, bg: "bg-blue-50 dark:bg-blue-950/30", color: "text-blue-600 dark:text-blue-400" },
              { label: "Uses left", value: Math.max(0, totalCapacity - totalUses).toLocaleString(), icon: Clock, bg: "bg-orange-50 dark:bg-orange-950/30", color: "text-orange-600 dark:text-orange-400" },
            ]}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search codes..."
                value={codeSearch}
                onChange={(e) => setCodeSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
              />
            </div>
            <button onClick={openCodeModal} className={primaryButtonClass}>
              <Plus className="w-4 h-4" />
              Create Promo Code
            </button>
          </div>

          {codesLoading ? (
            <Loading label="Loading promo codes..." />
          ) : filteredCodes.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={codeSearch ? "No matching codes" : "No Promo Codes Yet"}
              body={
                codeSearch
                  ? "Try a different code."
                  : "Create a code buyers enter at checkout for a discount — one named code to share, or a batch of single-use codes to hand out."
              }
              action={
                !codeSearch && (
                  <button onClick={openCodeModal} className={primaryButtonClass}>
                    <Plus className="w-4 h-4" />
                    Create Promo Code
                  </button>
                )
              }
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left p-4 text-sm font-semibold">Code</th>
                        <th className="text-left p-4 text-sm font-semibold">Discount</th>
                        <th className="text-left p-4 text-sm font-semibold">Applies to</th>
                        <th className="text-left p-4 text-sm font-semibold">Uses</th>
                        <th className="text-left p-4 text-sm font-semibold">Valid</th>
                        <th className="text-left p-4 text-sm font-semibold">Status</th>
                        <th className="text-right p-4 text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCodes.map((code) => (
                        <tr key={code.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-mono font-semibold">{code.code}</span>
                              {copyButton(code.code)}
                            </div>
                          </td>
                          <td className="p-4 text-sm">{formatDiscount(code.discountType, code.discountValue)}</td>
                          <td className="p-4 text-sm">{appliesTo(code)}</td>
                          <td className="p-4"><UsageBar used={code.currentUses} limit={code.maxUses} /></td>
                          <td className="p-4 text-xs text-muted-foreground">
                            <p>{formatWindowDate(code.validFrom)}</p>
                            <p>to {formatWindowDate(code.validUntil)}</p>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={statusOf(code.isActive, code.validFrom, code.validUntil, code.currentUses, code.maxUses)} />
                          </td>
                          <td className="p-4 text-right">
                            {toggleButton(code.isActive, togglingCodeId === code.id, () => handleToggleCode(code), ["Deactivate", "Activate"])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {filteredCodes.map((code) => (
                  <div key={code.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-base font-mono font-semibold truncate">{code.code}</span>
                        {copyButton(code.code)}
                      </div>
                      <StatusBadge status={statusOf(code.isActive, code.validFrom, code.validUntil, code.currentUses, code.maxUses)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Discount</p>
                        <p>{formatDiscount(code.discountType, code.discountValue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Applies to</p>
                        <p className="truncate">{appliesTo(code)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Uses</p>
                        <UsageBar used={code.currentUses} limit={code.maxUses} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ends</p>
                        <p className="text-xs">{formatWindowDate(code.validUntil)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      {toggleButton(code.isActive, togglingCodeId === code.id, () => handleToggleCode(code), ["Deactivate", "Activate"])}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <StatCards
            stats={[
              { label: "Flash sales", value: flashSales.length.toLocaleString(), icon: Zap, bg: "bg-zinc-800 dark:bg-zinc-800/50", color: "text-zinc-300" },
              { label: "Live now", value: liveSales.toLocaleString(), icon: CheckCircle, bg: "bg-green-50 dark:bg-green-950/30", color: "text-green-600 dark:text-green-400" },
              { label: "Sold at sale price", value: flashSold.toLocaleString(), icon: Tag, bg: "bg-blue-50 dark:bg-blue-950/30", color: "text-blue-600 dark:text-blue-400" },
              { label: "Discount given", value: `${currency} ${flashDiscountGiven.toLocaleString()}`, icon: Percent, bg: "bg-orange-50 dark:bg-orange-950/30", color: "text-orange-600 dark:text-orange-400" },
            ]}
          />

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Drop a ticket&apos;s price for a limited time and quantity. A promo code at checkout takes the place of the flash price.
            </p>
            <button onClick={() => openFlashModal()} className={primaryButtonClass} disabled={tickets.length === 0}>
              <Plus className="w-4 h-4" />
              Create Flash Sale
            </button>
          </div>

          {flashLoading ? (
            <Loading label="Loading flash sales..." />
          ) : flashSales.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No Flash Sales Yet"
              body="Run a time-boxed price drop on one ticket type, capped at a number of tickets. It switches on and off by itself."
              action={
                tickets.length > 0 && (
                  <button onClick={() => openFlashModal()} className={primaryButtonClass}>
                    <Plus className="w-4 h-4" />
                    Create Flash Sale
                  </button>
                )
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {flashSales.map((sale) => {
                const status = statusOf(sale.isActive, sale.startTime, sale.validUntil, sale.soldQuantity, sale.maxQuantity)
                const pctOff = sale.originalPrice > 0 ? Math.round((1 - sale.salePrice / sale.originalPrice) * 100) : 0
                return (
                  <div key={sale.id} className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{sale.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sale.ticketName || ticketName(sale.ticketId) || "Ticket"}</p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl font-bold">{currency} {sale.salePrice.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground line-through">{currency} {sale.originalPrice.toLocaleString()}</span>
                      {pctOff > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                          {pctOff}% off
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sold</p>
                        <UsageBar used={sale.soldQuantity} limit={sale.maxQuantity} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p className="mb-1">Runs</p>
                        <p className="text-foreground">{formatWindowDate(sale.startTime)}</p>
                        <p className="text-foreground">to {formatWindowDate(sale.validUntil)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      {/* API builds without eventId on the list also write an edit's
                          start and end into each other's columns, so editing waits
                          for the fixed build. */}
                      <button
                        onClick={() => openFlashModal(sale)}
                        disabled={sale.eventId === undefined}
                        title={sale.eventId === undefined ? "Editing needs the latest API update" : undefined}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      {toggleButton(sale.isActive, togglingFlashId === sale.id, () => handleToggleFlash(sale), ["Pause", "Resume"])}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Create Promo Code Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <Modal
            title={createdCodes ? "Codes ready" : "Create Promo Code"}
            subtitle={createdCodes ? "Share these with your buyers." : "Buyers enter it at checkout for a discount."}
            onClose={() => setShowCodeModal(false)}
            footer={
              !createdCodes && (
                <ModalActions
                  onCancel={() => setShowCodeModal(false)}
                  onSubmit={handleCreateCode}
                  busy={isCreatingCode}
                  busyLabel="Creating..."
                  label={codeMode === "batch" ? `Generate ${parseInt(codeCount, 10) || 0} codes` : "Create Code"}
                />
              )
            }
          >
            {createdCodes ? (
              <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-3 font-mono text-sm grid grid-cols-2 gap-2">
                  {createdCodes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleCopy(createdCodes.join("\n"), "__all__")}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    {copiedCode === "__all__" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    Copy {createdCodes.length === 1 ? "code" : "all"}
                  </button>
                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold text-sm cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/60">
                  {[
                    { id: "single" as const, label: "One code" },
                    { id: "batch" as const, label: "Generate a batch" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setCodeMode(m.id)}
                      className={cn(
                        "py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                        codeMode === m.id ? "bg-card shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {codeMode === "single" ? (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Code</label>
                    <input
                      type="text"
                      value={codeValue}
                      onChange={(e) => setCodeValue(e.target.value.toUpperCase().replace(/\s/g, ""))}
                      placeholder="e.g., EARLYBIRD"
                      maxLength={30}
                      className={cn(inputClass, codeValue && "font-mono tracking-wide")}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Leave blank and we&apos;ll generate one.</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium mb-2 block">How many codes</label>
                    <input
                      type="number"
                      value={codeCount}
                      onChange={(e) => setCodeCount(e.target.value)}
                      min="1"
                      max="250"
                      className={inputClass}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Up to 250. Each gets its own random code and its own use limit.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Discount</label>
                    <select
                      value={codeDiscountType}
                      onChange={(e) => setCodeDiscountType(e.target.value as DiscountType)}
                      className={cn(inputClass, "cursor-pointer")}
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED_AMOUNT">Fixed amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {codeDiscountType === "PERCENTAGE" ? "Percent off (%)" : `Amount off (${currency})`}
                    </label>
                    <input
                      type="number"
                      value={codeDiscountValue}
                      onChange={(e) => setCodeDiscountValue(e.target.value)}
                      min="0"
                      step="0.01"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Applies to</label>
                  <select
                    value={codeScope}
                    onChange={(e) => setCodeScope(e.target.value as "EVENT" | "TICKET" | "COMPANY")}
                    className={cn(inputClass, "cursor-pointer")}
                  >
                    <option value="EVENT">Every ticket for this event</option>
                    <option value="TICKET" disabled={tickets.length === 0}>One ticket type</option>
                    <option value="COMPANY">All your events</option>
                  </select>
                </div>

                {codeScope === "TICKET" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ticket</label>
                    <select
                      value={codeTicketId}
                      onChange={(e) => setCodeTicketId(e.target.value)}
                      className={cn(inputClass, "cursor-pointer")}
                    >
                      {tickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {currency} {t.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">{codeMode === "batch" ? "Uses per code" : "Max uses"}</label>
                  <input
                    type="number"
                    value={codeMaxUses}
                    onChange={(e) => setCodeMaxUses(e.target.value)}
                    min="1"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Starts</label>
                    <DateTimePicker selected={codeValidFrom} onChange={setCodeValidFrom} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ends</label>
                    <DateTimePicker selected={codeValidUntil} onChange={setCodeValidUntil} minDate={codeValidFrom} />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      Times are East Africa Time. A use is counted when a buyer applies the code at checkout,
                      once for each ticket type in their order. Codes can be deactivated but not deleted.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* Create / Edit Flash Sale Modal */}
      <AnimatePresence>
        {showFlashModal && (
          <Modal
            title={editingFlash ? "Edit Flash Sale" : "Create Flash Sale"}
            subtitle="A lower price on one ticket type, for a limited time and quantity."
            onClose={() => setShowFlashModal(false)}
            footer={
              <ModalActions
                onCancel={() => setShowFlashModal(false)}
                onSubmit={handleSaveFlash}
                busy={isSavingFlash}
                busyLabel="Saving..."
                label={editingFlash ? "Save Changes" : "Create Flash Sale"}
              />
            }
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={flashName}
                  onChange={(e) => setFlashName(e.target.value)}
                  placeholder="e.g., Early Bird Friday"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Ticket</label>
                <select
                  value={flashTicketId}
                  onChange={(e) => setFlashTicketId(e.target.value)}
                  disabled={!!editingFlash}
                  className={cn(inputClass, "cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed")}
                >
                  {!editingFlash && <option value="">Select a ticket</option>}
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.price <= 0}>
                      {t.name} — {t.price > 0 ? `${currency} ${t.price.toLocaleString()}` : "Free"}
                    </option>
                  ))}
                </select>
                {editingFlash && <p className="text-xs text-muted-foreground mt-1.5">The ticket can&apos;t be changed after creation.</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Sale price ({currency})</label>
                  <input
                    type="number"
                    value={flashPrice}
                    onChange={(e) => setFlashPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className={inputClass}
                  />
                  {flashOriginalPrice !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Usually {currency} {flashOriginalPrice.toLocaleString()}
                      {flashPercentOff !== null && <span className="text-orange-600 dark:text-orange-400"> · {flashPercentOff}% off</span>}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tickets at this price</label>
                  <input
                    type="number"
                    value={flashQuantity}
                    onChange={(e) => setFlashQuantity(e.target.value)}
                    min="1"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Starts</label>
                  <DateTimePicker selected={flashStart} onChange={setFlashStart} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Ends</label>
                  <DateTimePicker selected={flashEnd} onChange={setFlashEnd} minDate={flashStart} />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Times are East Africa Time. The sale ends early once its tickets are taken, counted at checkout.
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
