"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { DollarSign, Send, Clock, CheckCircle, XCircle, Filter, Search, Calendar, Download, User, TrendingUp, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

interface PayoutRequest {
  id: string
  type: "withdraw" | "affiliate_payment"
  amount: number
  status: "pending" | "approved" | "rejected" | "completed"
  requestedAt: string
  requestedBy: string
  affiliateId?: string
  affiliateName?: string
  reviewedAt?: string
  reviewedBy?: string
  completedAt?: string
  notes?: string
}

// Mock additional payouts for demo
const mockPayouts: PayoutRequest[] = [
  {
    id: "WTH-1736456789000",
    type: "withdraw",
    amount: 25000,
    status: "completed",
    requestedAt: "2026-01-08T10:30:00Z",
    requestedBy: "Current User",
    reviewedAt: "2026-01-08T14:20:00Z",
    reviewedBy: "Admin",
    completedAt: "2026-01-09T09:15:00Z",
  },
  {
    id: "PAY-1736456700000",
    type: "affiliate_payment",
    amount: 13500,
    status: "completed",
    requestedAt: "2026-01-07T15:45:00Z",
    requestedBy: "Current User",
    affiliateId: "AFF-001",
    affiliateName: "John Marketing",
    reviewedAt: "2026-01-08T09:30:00Z",
    reviewedBy: "Admin",
    completedAt: "2026-01-08T16:45:00Z",
  },
  {
    id: "PAY-1736456600000",
    type: "affiliate_payment",
    amount: 8400,
    status: "approved",
    requestedAt: "2026-01-06T11:20:00Z",
    requestedBy: "Current User",
    affiliateId: "AFF-002",
    affiliateName: "Emma Promoter",
    reviewedAt: "2026-01-07T10:15:00Z",
    reviewedBy: "Admin",
  },
  {
    id: "WTH-1736456500000",
    type: "withdraw",
    amount: 15000,
    status: "rejected",
    requestedAt: "2026-01-05T14:30:00Z",
    requestedBy: "Current User",
    reviewedAt: "2026-01-06T09:20:00Z",
    reviewedBy: "Admin",
    notes: "Insufficient documentation provided",
  },
]

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [filteredPayouts, setFilteredPayouts] = useState<PayoutRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "completed">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "withdraw" | "affiliate_payment">("all")

  // Load payouts from localStorage
  useEffect(() => {
    const loadPayouts = () => {
      const stored = localStorage.getItem("payoutRequests")
      const storedPayouts = stored ? JSON.parse(stored) : []
      const allPayouts = [...storedPayouts, ...mockPayouts]
      setPayouts(allPayouts)
      setFilteredPayouts(allPayouts)
    }
    loadPayouts()
  }, [])

  // Filter payouts
  useEffect(() => {
    let filtered = payouts

    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(p => p.type === typeFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.affiliateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.amount.toString().includes(searchQuery)
      )
    }

    setFilteredPayouts(filtered)
  }, [payouts, statusFilter, typeFilter, searchQuery])

  const refreshPayouts = () => {
    const stored = localStorage.getItem("payoutRequests")
    const storedPayouts = stored ? JSON.parse(stored) : []
    const allPayouts = [...storedPayouts, ...mockPayouts]
    setPayouts(allPayouts)
    toast.success("Payouts refreshed")
  }

  // Statistics
  const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0)
  const pendingAmount = payouts.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0)
  const completedAmount = payouts.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)
  const totalPending = payouts.filter(p => p.status === "pending").length
  const totalApproved = payouts.filter(p => p.status === "approved").length
  const totalCompleted = payouts.filter(p => p.status === "completed").length
  const totalRejected = payouts.filter(p => p.status === "rejected").length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />
      case "approved":
        return <CheckCircle className="w-4 h-4" />
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "rejected":
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
      case "approved":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400"
    }
  }

  const exportPayoutsReport = () => {
    const reportId = `PAYOUT-RPT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Payouts Report - SoldOutAfrica</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
          .header { border-bottom: 3px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 30px; }
          .brand-name { font-size: 28px; font-weight: 700; color: #8b5cf6; }
          .report-title { font-size: 24px; font-weight: 700; margin-top: 10px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
          .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .summary-value { font-size: 24px; font-weight: 700; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .status-pending { color: #f59e0b; font-weight: 600; }
          .status-completed { color: #059669; font-weight: 600; }
          .status-approved { color: #3b82f6; font-weight: 600; }
          .status-rejected { color: #dc2626; font-weight: 600; }
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
          <div class="summary-item">
            <div class="summary-label">Total Amount</div>
            <div class="summary-value">KES ${totalAmount.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Pending</div>
            <div class="summary-value" style="color: #f59e0b;">KES ${pendingAmount.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Completed</div>
            <div class="summary-value" style="color: #059669;">KES ${completedAmount.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Requests</div>
            <div class="summary-value">${payouts.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Type</th>
              <th>Amount (KES)</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Beneficiary</th>
            </tr>
          </thead>
          <tbody>
            ${payouts.map(payout => `
              <tr>
                <td>${payout.id}</td>
                <td>${payout.type === 'withdraw' ? 'Withdrawal' : 'Affiliate Payment'}</td>
                <td><strong>${payout.amount.toLocaleString()}</strong></td>
                <td class="status-${payout.status}">${payout.status.toUpperCase()}</td>
                <td>${new Date(payout.requestedAt).toLocaleString()}</td>
                <td>${payout.affiliateName || payout.requestedBy}</td>
              </tr>
            `).join('')}
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

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Payout Requests</h1>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={refreshPayouts}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportPayoutsReport}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </motion.button>
          </div>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and manage all withdrawal and affiliate payment requests
        </p>
      </motion.div>

      {/* Statistics Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        {[
          { label: "Total Amount", value: `KES ${(totalAmount / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-[#8b5cf6]", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Pending", value: totalPending, icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Approved", value: totalApproved, icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Completed", value: totalCompleted, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Rejected", value: totalRejected, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Completed Value", value: `KES ${(completedAmount / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
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
              <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
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
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID, affiliate name, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-11 px-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-11 px-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="withdraw">Withdrawals</option>
              <option value="affiliate_payment">Affiliate Payments</option>
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
        {filteredPayouts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-bold mb-2">No payout requests found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Payout requests will appear here once submitted"}
            </p>
            {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                  setTypeFilter("all")
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
              key={payout.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="rounded-xl border border-border bg-card p-4 sm:p-6 hover:border-[#8b5cf6]/30 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Icon */}
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", payout.type === "withdraw" ? "bg-blue-100 dark:bg-blue-950/30" : "bg-purple-100 dark:bg-purple-950/30")}>
                  {payout.type === "withdraw" ? (
                    <Send className={cn("w-6 h-6", "text-blue-600 dark:text-blue-400")} />
                  ) : (
                    <DollarSign className={cn("w-6 h-6", "text-purple-600 dark:text-purple-400")} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-base sm:text-lg">
                          {payout.type === "withdraw" ? "Withdrawal Request" : "Affiliate Payment"}
                        </h3>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(payout.status))}>
                          {getStatusIcon(payout.status)}
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{payout.id}</p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-[#8b5cf6]">KES {payout.amount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Requested By</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium truncate">{payout.requestedBy}</p>
                      </div>
                    </div>

                    {payout.affiliateName && (
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Affiliate</p>
                        <p className="text-sm font-medium truncate">{payout.affiliateName}</p>
                        <p className="text-xs text-muted-foreground">{payout.affiliateId}</p>
                      </div>
                    )}

                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Requested At</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{new Date(payout.requestedAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(payout.requestedAt).toLocaleTimeString()}</p>
                    </div>

                    {payout.reviewedAt && (
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Reviewed At</p>
                        <p className="text-sm font-medium">{new Date(payout.reviewedAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">By {payout.reviewedBy}</p>
                      </div>
                    )}
                  </div>

                  {payout.notes && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        <strong>Note:</strong> {payout.notes}
                      </p>
                    </div>
                  )}

                  {payout.status === "pending" && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        <Clock className="w-4 h-4 inline mr-1" />
                        This request is pending review and will be processed within 24 hours.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  )
}

