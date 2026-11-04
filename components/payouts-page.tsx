"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  DollarSign, Send, Clock, CheckCircle, XCircle, Search, Download, RefreshCw, Wallet, X, Loader2,
  ArrowRight, ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api-client"
import {
  WITHDRAWAL_METHODS,
  buildWithdrawalRequest,
  confirmationSummary,
  formatMoney,
  requiresWholeAmount,
  validateWithdrawal,
  withdrawalStatusLabel,
  type FormErrors,
  type WithdrawalForm,
  type WithdrawalRecord,
  type WithdrawalRequest,
} from "@/lib/withdrawal"

type StatusFilter = "all" | "PROCESSING" | "COMPLETED" | "FAILED"
type Step = "form" | "confirm" | "code" | "done"

const EMPTY_FORM: WithdrawalForm = {
  amount: "",
  method: "MPESA_TILL",
  tillNumber: "",
  paybillNumber: "",
  accountNumber: "",
  mobileNumber: "",
  recipientName: "",
}

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const inputClass = (invalid?: boolean) =>
  cn(
    "w-full h-11 px-4 rounded-lg border bg-background text-sm outline-none transition-all",
    invalid
      ? "border-destructive ring-2 ring-destructive/10"
      : "border-border focus:border-brand focus:ring-2 focus:ring-brand/25"
  )

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1.5" role="alert">{message}</p>
}

export default function PayoutsPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [currency, setCurrency] = useState("KES")
  const [canRequest, setCanRequest] = useState(false)
  const [payouts, setPayouts] = useState<WithdrawalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  // Withdrawal flow
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [form, setForm] = useState<WithdrawalForm>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [flowError, setFlowError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // One attempt = one key, reused for the code step; a new code starts a new attempt.
  const [pending, setPending] = useState<WithdrawalRequest | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [code, setCode] = useState("")
  const [doneMessage, setDoneMessage] = useState("")
  const [doneReference, setDoneReference] = useState<string | undefined>()

  const loadWallet = useCallback(async (announce = false) => {
    try {
      const data = await api.wallet.get()
      setBalance(data.wallet.balance)
      setCurrency(data.wallet.currency || "KES")
      setCanRequest(data.canRequest)
      setPayouts(data.withdrawals ?? [])
      setLoadError(null)
      if (announce) toast.success("Payouts refreshed")
    } catch (error) {
      setLoadError(errorMessage(error, "Couldn't load your balance"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWallet()
  }, [loadWallet])

  // Code countdown
  useEffect(() => {
    if (!codeExpiresAt) return
    const tick = () => setSecondsLeft(Math.max(0, Math.round((codeExpiresAt - Date.now()) / 1000)))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [codeExpiresAt])

  const filteredPayouts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return payouts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (!query) return true
      return (
        p.reference.toLowerCase().includes(query) ||
        p.destination.toLowerCase().includes(query) ||
        p.amount.toString().includes(query)
      )
    })
  }, [payouts, statusFilter, searchQuery])

  // Statistics
  const sum = (status: string) => payouts.filter((p) => p.status === status).reduce((total, p) => total + p.amount, 0)
  const count = (status: string) => payouts.filter((p) => p.status === status).length
  const pendingAmount = sum("PROCESSING")
  const completedAmount = sum("COMPLETED")
  const kilo = (amount: number) => `${currency} ${amount >= 1000 ? `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K` : amount.toLocaleString()}`

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PROCESSING":
      case "INITIATED":
        return <Clock className="w-4 h-4" />
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />
      case "FAILED":
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROCESSING":
      case "INITIATED":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
      case "COMPLETED":
        return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
      case "FAILED":
        return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400"
    }
  }

  // ---- Withdrawal flow ----

  const openWithdraw = () => {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setFlowError(null)
    setStep("form")
    setCode("")
    setChallengeId(null)
    setCodeExpiresAt(null)
    setPending(null)
    setShowWithdraw(true)
  }

  const closeWithdraw = () => {
    if (submitting) return
    setShowWithdraw(false)
    if (step === "done") void loadWallet()
  }

  const updateForm = <K extends keyof WithdrawalForm>(key: K, value: WithdrawalForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => ({ ...prev, [key]: undefined, ...(key === "method" ? { amount: undefined } : {}) }))
    setFlowError(null)
  }

  const reviewWithdrawal = (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateWithdrawal(form, balance)
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return
    setPending(buildWithdrawalRequest(form, newKey()))
    setFlowError(null)
    setStep("confirm")
  }

  /** Asks core for a code: the first call of an attempt answers 428 and texts it. */
  const requestCode = async (request: WithdrawalRequest) => {
    setSubmitting(true)
    setFlowError(null)
    try {
      // No code yet, so this only succeeds if core skips the step-up.
      const result = await api.wallet.withdraw(request)
      finish(result.message, result.transactionReference)
    } catch (error) {
      const data = error instanceof ApiError ? (error.response as Record<string, unknown> | undefined) : undefined
      if (error instanceof ApiError && error.statusCode === 428 && typeof data?.stepUpChallengeId === "string") {
        setChallengeId(data.stepUpChallengeId)
        const expiresIn = Number(data.expiresIn) || 300
        setCodeExpiresAt(Date.now() + expiresIn * 1000)
        setCode("")
        setStep("code")
        toast.info("Code sent", { description: (data.message as string) || "Check your phone for a 6-digit code." })
      } else {
        setFlowError(errorMessage(error, "Couldn't start the withdrawal. Please try again."))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const confirmWithdrawal = () => {
    if (pending) void requestCode(pending)
  }

  /** "Send a new code" starts the attempt again with a fresh key. */
  const sendNewCode = () => {
    if (!pending) return
    const fresh = { ...pending, idempotentKey: newKey() }
    setPending(fresh)
    void requestCode(fresh)
  }

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const request = pending
    if (!request || !challengeId) return
    if (!/^\d{6}$/.test(code)) {
      setFlowError("Enter the 6-digit code we texted you")
      return
    }
    setSubmitting(true)
    setFlowError(null)
    try {
      const result = await api.wallet.withdraw({ ...request, stepUpChallengeId: challengeId, stepUpCode: code })
      finish(result.message, result.transactionReference)
    } catch (error) {
      setFlowError(errorMessage(error, "That code didn't work. Please try again."))
      setCode("")
    } finally {
      setSubmitting(false)
    }
  }

  const finish = (message: string | undefined, reference: string | undefined) => {
    setDoneMessage(message || "Withdrawal requested. A SoldOutAfrica admin will approve it.")
    setDoneReference(reference)
    setStep("done")
    setCodeExpiresAt(null)
    void loadWallet()
  }

  const exportPayoutsReport = () => {
    const reportId = `PAYOUT-RPT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const escape = (value: string) => value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Payouts Report - SoldOutAfrica</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
          .header { border-bottom: 3px solid #27272a; padding-bottom: 20px; margin-bottom: 30px; }
          .brand-name { font-size: 28px; font-weight: 700; color: #27272a; }
          .report-title { font-size: 24px; font-weight: 700; margin-top: 10px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
          .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .summary-value { font-size: 24px; font-weight: 700; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: linear-gradient(135deg, #27272a, #18181b); color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .status-PROCESSING, .status-INITIATED { color: #f59e0b; font-weight: 600; }
          .status-COMPLETED { color: #059669; font-weight: 600; }
          .status-FAILED { color: #dc2626; font-weight: 600; }
          @media (max-width: 768px) {
            body { padding: 10px; }
            .summary { grid-template-columns: 1fr; gap: 10px; }
            table { font-size: 11px; overflow-x: auto; display: block; }
            th, td { padding: 8px 6px; font-size: 10px; }
          }
          @media print {
            body { padding: 0; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand-name">SOLDOUTAFRICA</div>
          <div class="report-title">Payouts Report</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
            Generated: ${new Date().toLocaleString()} | Report ID: ${reportId}
          </div>
        </div>
        <div class="summary">
          <div class="summary-item"><div class="summary-label">Available Balance</div><div class="summary-value">${formatMoney(balance ?? 0, currency)}</div></div>
          <div class="summary-item"><div class="summary-label">Waiting for Approval</div><div class="summary-value" style="color: #f59e0b;">${formatMoney(pendingAmount, currency)}</div></div>
          <div class="summary-item"><div class="summary-label">Paid</div><div class="summary-value" style="color: #059669;">${formatMoney(completedAmount, currency)}</div></div>
          <div class="summary-item"><div class="summary-label">Total Requests</div><div class="summary-value">${payouts.length}</div></div>
        </div>
        <table>
          <thead>
            <tr><th>Reference</th><th>Amount (${currency})</th><th>Status</th><th>Paid to</th></tr>
          </thead>
          <tbody>
            ${payouts.map((p) => `
              <tr>
                <td>${escape(p.reference)}</td>
                <td><strong>${p.amount.toLocaleString()}</strong></td>
                <td class="status-${p.status}">${escape(withdrawalStatusLabel(p.status))}</td>
                <td>${escape(p.destination || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <script>
          document.title = 'SoldOutAfrica - Payouts Report';
          window.onload = function() { setTimeout(() => window.print(), 500); }
        </script>
      </body>
      </html>
    `

    sessionStorage.setItem("reportHTML", html)
    window.open("/report", "_blank")
    toast.success("Payouts report ready!", { description: "Opening in new tab..." })
  }

  const summary = pending ? confirmationSummary(pending, currency) : ""
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, "0")

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between mb-2 gap-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Payouts</h1>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void loadWallet(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportPayoutsReport}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </motion.button>
            {canRequest && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openWithdraw}
                disabled={balance === null || balance <= 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>Withdraw</span>
              </motion.button>
            )}
          </div>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Withdraw your treasury balance and follow each request until it is paid
        </p>
      </motion.div>

      {loadError && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-400">
          {loadError}
        </div>
      )}

      {/* Statistics Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        {[
          { label: "Available Balance", value: balance === null ? "—" : formatMoney(balance, currency), icon: Wallet, color: "text-zinc-300", bg: "bg-zinc-800 dark:bg-zinc-800/50" },
          { label: "Waiting for Approval", value: count("PROCESSING"), icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Pending Value", value: kilo(pendingAmount), icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Paid", value: count("COMPLETED"), icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Rejected / Refunded", value: count("FAILED"), icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Paid Value", value: kilo(completedAmount), icon: DollarSign, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="rounded-xl border border-border bg-card p-3 sm:p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("p-1.5 sm:p-2 rounded-lg", stat.bg)}>
                  <Icon className={cn("w-3 h-3 sm:w-4 sm:h-4", stat.color)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
              <p className="text-lg sm:text-xl font-bold break-words">{loading ? "…" : stat.value}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 mb-6"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by reference, destination, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-11 px-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="PROCESSING">Waiting for approval</option>
              <option value="COMPLETED">Paid</option>
              <option value="FAILED">Rejected / refunded</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Payouts List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-bold mb-2">No withdrawals found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Withdrawals will appear here once requested"}
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                }}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg font-semibold text-sm hover:bg-secondary/80 transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredPayouts.map((payout, index) => (
            <motion.div
              key={payout.reference || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + Math.min(index, 10) * 0.05 }}
              className="rounded-xl border border-border bg-card p-4 sm:p-6 hover:border-zinc-500/30 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-950/30">
                  <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-base sm:text-lg">Withdrawal</h3>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(payout.status))}>
                          {getStatusIcon(payout.status)}
                          {withdrawalStatusLabel(payout.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono break-all">{payout.reference}</p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-zinc-300">{formatMoney(payout.amount, payout.currency)}</p>
                    </div>
                  </div>

                  {payout.destination && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Paid To</p>
                        <p className="text-sm font-medium break-words">{payout.destination.replace(/^to /, "")}</p>
                      </div>
                    </div>
                  )}

                  {payout.errorMessage && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        <strong>Note:</strong> {payout.errorMessage}
                      </p>
                    </div>
                  )}

                  {(payout.status === "PROCESSING" || payout.status === "INITIATED") && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Waiting for a SoldOutAfrica admin to approve it. The amount is held until then.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Withdraw modal */}
      <AnimatePresence>
        {showWithdraw && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeWithdraw}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="withdraw-title"
            >
              <button
                onClick={closeWithdraw}
                disabled={submitting}
                className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 id="withdraw-title" className="text-xl font-bold mb-1 pr-10">
                {step === "done" ? "Withdrawal requested" : "Withdraw funds"}
              </h2>
              {step !== "done" && (
                <p className="text-sm text-muted-foreground mb-5">
                  Available: <span className="font-semibold text-foreground">{formatMoney(balance ?? 0, currency)}</span>
                </p>
              )}

              {step === "form" && (
                <form onSubmit={reviewWithdrawal} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="withdraw-amount" className="block text-sm font-medium mb-2">Amount ({currency})</label>
                    <input
                      id="withdraw-amount"
                      inputMode={requiresWholeAmount(form.method) ? "numeric" : "decimal"}
                      value={form.amount}
                      onChange={(e) => updateForm("amount", e.target.value)}
                      placeholder="5000"
                      className={inputClass(!!formErrors.amount)}
                      aria-invalid={!!formErrors.amount}
                    />
                    <FieldError message={formErrors.amount} />
                    {requiresWholeAmount(form.method) && !formErrors.amount && (
                      <p className="text-xs text-muted-foreground mt-1.5">M-Pesa pays whole shillings only.</p>
                    )}
                  </div>

                  <fieldset>
                    <legend className="block text-sm font-medium mb-2">Pay me by</legend>
                    <div className="grid gap-2">
                      {WITHDRAWAL_METHODS.map((m) => (
                        <label
                          key={m.value}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                            form.method === m.value ? "border-zinc-400 bg-secondary/50" : "border-border hover:border-zinc-500/40"
                          )}
                        >
                          <input
                            type="radio"
                            name="withdraw-method"
                            value={m.value}
                            checked={form.method === m.value}
                            onChange={() => updateForm("method", m.value)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-semibold">{m.label}</span>
                            <span className="block text-xs text-muted-foreground">{m.hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {form.method === "MPESA_TILL" && (
                    <div>
                      <label htmlFor="withdraw-till" className="block text-sm font-medium mb-2">Till number</label>
                      <input id="withdraw-till" inputMode="numeric" value={form.tillNumber} onChange={(e) => updateForm("tillNumber", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="123456" className={inputClass(!!formErrors.tillNumber)} />
                      <FieldError message={formErrors.tillNumber} />
                    </div>
                  )}

                  {form.method === "MPESA_PAYBILL" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="withdraw-paybill" className="block text-sm font-medium mb-2">Paybill number</label>
                        <input id="withdraw-paybill" inputMode="numeric" value={form.paybillNumber} onChange={(e) => updateForm("paybillNumber", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="400200" className={inputClass(!!formErrors.paybillNumber)} />
                        <FieldError message={formErrors.paybillNumber} />
                      </div>
                      <div>
                        <label htmlFor="withdraw-account" className="block text-sm font-medium mb-2">Account number</label>
                        <input id="withdraw-account" value={form.accountNumber} onChange={(e) => updateForm("accountNumber", e.target.value.slice(0, 40))} placeholder="Account" className={inputClass(!!formErrors.accountNumber)} />
                        <FieldError message={formErrors.accountNumber} />
                      </div>
                    </div>
                  )}

                  {form.method === "PAYSTACK_MPESA" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="withdraw-mobile" className="block text-sm font-medium mb-2">M-Pesa number</label>
                        <input id="withdraw-mobile" type="tel" inputMode="tel" value={form.mobileNumber} onChange={(e) => updateForm("mobileNumber", e.target.value.slice(0, 16))} placeholder="0712 345 678" className={inputClass(!!formErrors.mobileNumber)} />
                        <FieldError message={formErrors.mobileNumber} />
                      </div>
                      <div>
                        <label htmlFor="withdraw-name" className="block text-sm font-medium mb-2">Name on the line</label>
                        <input id="withdraw-name" value={form.recipientName} onChange={(e) => updateForm("recipientName", e.target.value.slice(0, 80))} placeholder="Jane Wanjiku" className={inputClass(!!formErrors.recipientName)} />
                        <FieldError message={formErrors.recipientName} />
                      </div>
                    </div>
                  )}

                  {flowError && <p className="text-sm text-destructive" role="alert">{flowError}</p>}

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-zinc-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    Review
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              )}

              {step === "confirm" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="text-xs text-muted-foreground mb-1">You are about to</p>
                    <p className="text-base font-semibold">{summary}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll text a 6-digit code to your phone to confirm it&apos;s you. A SoldOutAfrica admin then approves the payout.
                  </p>
                  {flowError && <p className="text-sm text-destructive" role="alert">{flowError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setStep("form"); setFlowError(null) }}
                      disabled={submitting}
                      className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={confirmWithdrawal}
                      disabled={submitting}
                      className="flex-1 py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-zinc-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      Send code
                    </button>
                  </div>
                </div>
              )}

              {step === "code" && (
                <form onSubmit={submitCode} className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="text-base font-semibold">{summary}</p>
                  </div>
                  <div>
                    <label htmlFor="withdraw-code" className="block text-sm font-medium mb-2">Code from your phone</label>
                    <input
                      id="withdraw-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      value={code}
                      onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setFlowError(null) }}
                      placeholder="000000"
                      maxLength={6}
                      className={cn(inputClass(!!flowError), "h-14 text-center text-2xl font-bold tracking-[0.5em]")}
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {secondsLeft > 0 ? `Code expires in ${minutes}:${seconds}` : "This code has expired. Send a new one."}
                    </p>
                  </div>
                  {flowError && <p className="text-sm text-destructive text-center" role="alert">{flowError}</p>}
                  <button
                    type="submit"
                    disabled={submitting || code.length !== 6 || secondsLeft === 0}
                    className="w-full py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-zinc-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Confirm withdrawal
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={sendNewCode}
                      disabled={submitting}
                      className="text-sm text-zinc-300 hover:underline disabled:opacity-50"
                    >
                      Send a new code
                    </button>
                  </div>
                </form>
              )}

              {step === "done" && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="font-semibold mb-1">{summary}</p>
                  <p className="text-sm text-muted-foreground mb-2">{doneMessage}</p>
                  {doneReference && (
                    <p className="text-xs text-muted-foreground font-mono mb-4">Reference {doneReference}</p>
                  )}
                  <button
                    type="button"
                    onClick={closeWithdraw}
                    className="w-full py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
