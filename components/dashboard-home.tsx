"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, TrendingUp, Calendar, Users, Plus, Eye, EyeOff, Download, Send, Megaphone, ArrowUpRight, DollarSign, X, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

// Mock data - replace with actual data from API
const dashboardData = {
  wallet: {
    balance: 45000,
    pending: 12000,
    currency: "KES",
  },
  stats: {
    totalEvents: 12,
    activeEvents: 5,
    totalTickets: 2450,
    totalRevenue: 890000,
  },
  recentTransactions: [
    { id: 1, event: "Nura Fest 2026", amount: 15000, date: "2026-01-05", status: "completed" },
    { id: 2, event: "Tech Summit Nairobi", amount: 28000, date: "2026-01-03", status: "completed" },
    { id: 3, event: "Jazz Night Live", amount: 8500, date: "2026-01-02", status: "pending" },
    { id: 4, event: "Art Exhibition", amount: 12000, date: "2025-12-30", status: "completed" },
  ],
  upcomingEvents: [
    { id: 1, name: "Summer Music Festival", date: "2026-02-15", tickets: 450, revenue: 135000 },
    { id: 2, name: "Tech Conference 2026", date: "2026-02-20", tickets: 320, revenue: 96000 },
    { id: 3, name: "Food & Wine Expo", date: "2026-03-01", tickets: 180, revenue: 54000 },
  ],
}

// Mock affiliates with pending commissions - replace with actual API data
const affiliatesWithCommissions = [
  { id: "AFF-001", name: "John Marketing", commission: 13500, totalSales: 45, status: "active", event: "Nura Fest 2026" },
  { id: "AFF-002", name: "Emma Promoter", commission: 8400, totalSales: 28, status: "active", event: "Jazz Night Live" },
  { id: "AFF-003", name: "Sarah Influencer", commission: 6200, totalSales: 18, status: "active", event: "Tech Summit Nairobi" },
]

export default function DashboardHome() {
  const [showBalance, setShowBalance] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [selectedAffiliate, setSelectedAffiliate] = useState<typeof affiliatesWithCommissions[0] | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [otpInput, setOtpInput] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)

  // Calculate financial data
  const totalRevenue = Math.round(dashboardData.wallet.balance / 0.875)
  const commissionAndFees = Math.round(totalRevenue * 0.125)
  const withdrawn = dashboardData.wallet.pending
  const availableBalance = dashboardData.wallet.balance

  // Handle affiliate selection for payment
  const handleSelectAffiliate = (affiliate: typeof affiliatesWithCommissions[0]) => {
    setSelectedAffiliate(affiliate)
    setPaymentAmount(affiliate.commission.toString())
    setShowOtpInput(false)
    setOtpInput("")
  }

  // Handle payment processing
  const handlePayAffiliate = () => {
    if (otpInput !== "0000") {
      toast.error("Invalid OTP")
      return
    }

    if (!selectedAffiliate || !paymentAmount) return

    // Process payment (in real app, this would call an API)
    toast.success(`Payment of KES ${Number(paymentAmount).toLocaleString()} sent to ${selectedAffiliate.name}`, {
      description: "The affiliate will receive the payment within 24 hours",
    })

    // Reset modal
    setShowPaymentModal(false)
    setSelectedAffiliate(null)
    setPaymentAmount("")
    setOtpInput("")
    setShowOtpInput(false)
  }

  const openPaymentModal = () => {
    if (affiliatesWithCommissions.length === 0) {
      toast.error("No affiliates with pending commissions")
      return
    }
    setShowPaymentModal(true)
  }

  const openWithdrawModal = () => {
    setWithdrawAmount(dashboardData.wallet.balance.toString())
    setShowWithdrawModal(true)
    setShowOtpInput(false)
    setOtpInput("")
  }

  const handleWithdraw = () => {
    if (otpInput !== "0000") {
      toast.error("Invalid OTP")
      return
    }

    if (!withdrawAmount || Number(withdrawAmount) <= 0) return

    if (Number(withdrawAmount) > dashboardData.wallet.balance) {
      toast.error("Insufficient balance")
      return
    }

    // Create withdraw request
    const withdrawRequest = {
      id: `WTH-${Date.now()}`,
      type: "withdraw",
      amount: Number(withdrawAmount),
      status: "pending",
      requestedAt: new Date().toISOString(),
      requestedBy: "Current User"
    }

    // Store in localStorage for demo (replace with API call)
    const existingPayouts = JSON.parse(localStorage.getItem("payoutRequests") || "[]")
    localStorage.setItem("payoutRequests", JSON.stringify([withdrawRequest, ...existingPayouts]))

    toast.success("Withdrawal request submitted!", {
      description: "Your withdrawal will be reviewed and processed within 24 hours",
    })

    // Reset modal
    setShowWithdrawModal(false)
    setWithdrawAmount("")
    setOtpInput("")
    setShowOtpInput(false)
  }

  // Export financial report function
  const exportFinancialReport = () => {
    try {
      // Generate unique report ID
      const reportId = `FIN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Financial Report - SoldOutAfrica</title>
          <style>
            @page { margin: 20mm; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              background: #ffffff;
              padding: 20px;
            }

            /* Header with logo and branding */
            .report-header {
              border-bottom: 3px solid #8b5cf6;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .brand-section {
              flex: 1;
            }
            .brand-name {
              font-size: 28px;
              font-weight: 700;
              color: #8b5cf6;
              margin-bottom: 4px;
              letter-spacing: -0.5px;
            }
            .brand-tagline {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .report-info {
              text-align: right;
            }
            .report-title {
              font-size: 24px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 4px;
            }
            .report-date {
              font-size: 12px;
              color: #6b7280;
            }
            .report-id {
              font-size: 11px;
              color: #9ca3af;
              font-family: 'Courier New', monospace;
            }

            /* Financial Summary Box */
            .summary-section {
              background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 30px;
              margin-bottom: 30px;
            }
            .summary-title {
              font-size: 18px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .summary-item {
              padding: 15px;
              background: #ffffff;
              border-radius: 8px;
              border-left: 4px solid #8b5cf6;
            }
            .summary-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
              margin-bottom: 6px;
            }
            .summary-value {
              font-size: 24px;
              font-weight: 700;
              color: #1a1a1a;
            }
            .summary-value.positive {
              color: #059669;
            }
            .summary-value.negative {
              color: #dc2626;
            }
            .summary-value.primary {
              color: #8b5cf6;
            }

            /* Balance Breakdown Table */
            .breakdown-section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e5e7eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            thead {
              background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 12px;
              font-size: 13px;
              border-bottom: 1px solid #f3f4f6;
              color: #374151;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            .amount-positive {
              color: #059669;
              font-weight: 600;
            }
            .amount-negative {
              color: #dc2626;
              font-weight: 600;
            }
            .total-row {
              background: #f9fafb;
              font-weight: 700;
            }

            /* Footer */
            .report-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #6b7280;
            }
            .footer-company {
              font-weight: 600;
              color: #8b5cf6;
            }

            /* Mobile responsive styles */
            @media (max-width: 768px) {
              body {
                padding: 10px;
              }
              .report-header {
                flex-direction: column;
                gap: 15px;
                padding-bottom: 15px;
              }
              .brand-section {
                width: 100%;
              }
              .brand-name {
                font-size: 18px;
              }
              .brand-tagline {
                font-size: 10px;
              }
              .report-info {
                text-align: left;
                width: 100%;
              }
              .report-title {
                font-size: 16px;
              }
              .report-date {
                font-size: 11px;
              }
              .report-id {
                font-size: 10px;
              }
              .summary-section {
                padding: 15px;
              }
              .summary-title {
                font-size: 16px;
              }
              .summary-grid {
                grid-template-columns: 1fr;
                gap: 15px;
              }
              .summary-value {
                font-size: 20px;
              }
              .breakdown-section {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                margin: 0 -10px;
                padding: 0 10px;
              }
              table {
                min-width: 500px;
                font-size: 12px;
              }
              th, td {
                padding: 8px 6px;
                font-size: 11px;
              }
              .report-footer {
                flex-direction: column;
                gap: 10px;
                text-align: center;
              }
            }

            /* Print styles */
            @media print {
              body { padding: 0; }
              .report-header { page-break-after: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="report-header">
            <div class="brand-section">
              <div class="brand-name">SOLDOUTAFRICA</div>
              <div class="brand-tagline">Event Management Platform</div>
            </div>
            <div class="report-info">
              <div class="report-title">Financial Report</div>
              <div class="report-date">${new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
              <div class="report-id">Report ID: ${reportId}</div>
            </div>
          </div>

          <!-- Financial Summary -->
          <div class="summary-section">
            <div class="summary-title">Financial Overview</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Revenue</div>
                <div class="summary-value positive">KES ${totalRevenue.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Commission & Fees (12.5%)</div>
                <div class="summary-value negative">- KES ${commissionAndFees.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Withdrawn</div>
                <div class="summary-value negative">- KES ${withdrawn.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Available Balance</div>
                <div class="summary-value primary">KES ${availableBalance.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <!-- Balance Breakdown -->
          <div class="breakdown-section">
            <div class="section-title">Balance Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount (KES)</th>
                  <th style="text-align: right;">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Revenue from Events</td>
                  <td style="text-align: right;" class="amount-positive">+ ${totalRevenue.toLocaleString()}</td>
                  <td style="text-align: right;">100%</td>
                </tr>
                <tr>
                  <td>Platform Commission & Processing Fees</td>
                  <td style="text-align: right;" class="amount-negative">- ${commissionAndFees.toLocaleString()}</td>
                  <td style="text-align: right;">12.5%</td>
                </tr>
                <tr>
                  <td>Amount Withdrawn</td>
                  <td style="text-align: right;" class="amount-negative">- ${withdrawn.toLocaleString()}</td>
                  <td style="text-align: right;">${Math.round((withdrawn / totalRevenue) * 100)}%</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Available Balance</strong></td>
                  <td style="text-align: right;"><strong>KES ${availableBalance.toLocaleString()}</strong></td>
                  <td style="text-align: right;"><strong>${Math.round((availableBalance / totalRevenue) * 100)}%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="report-footer">
            <div>
              <div class="footer-company">SoldOutAfrica Event Management Platform</div>
              <div>This is an official financial report. For inquiries, contact support@soldoutafrica.com</div>
            </div>
          </div>

          <script>
            document.title = 'SoldOutAfrica - Financial Report';
            window.onload = function() {
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
        </html>
      `

      // Store HTML in sessionStorage and open /report page
      sessionStorage.setItem("reportHTML", html)
      window.open("/report", "_blank")

      toast.success("Financial report ready!", {
        description: "Opening in new tab...",
      })
    } catch (error) {
      console.error("Error exporting financial report:", error)
      toast.error("Failed to export financial report")
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-4 lg:pt-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening with your events.</p>
      </motion.div>

      {/* Wallet Card - Responsive Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 sm:mb-8"
      >
        {/* Mobile - Credit Card Style */}
        <div className="md:hidden relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#5b21b6] p-6 text-white shadow-2xl max-w-md mx-auto min-h-[280px]">
          {/* Subtle animated background */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"
          />

          {/* Toggle Button - Mobile */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowBalance(!showBalance);
            }}
            className="absolute top-4 right-4 p-2.5 rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm transition-all cursor-pointer z-20 border border-white/30 pointer-events-auto"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? (
              <Eye className="w-5 h-5 text-white" />
            ) : (
              <EyeOff className="w-5 h-5 text-white" />
            )}
          </button>

          <div className="relative z-10 h-full flex flex-col justify-between">
            {/* Top Section - Available Balance */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs opacity-70 uppercase tracking-wider">Available Balance</p>
                  <p className="text-2xl font-bold">
                    {showBalance
                      ? `${dashboardData.wallet.currency} ${dashboardData.wallet.balance.toLocaleString()}`
                      : '€€€€€€'}
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Section - Stats */}
            <div className="grid grid-cols-3 gap-3 py-3 mb-3">
              <div>
                <p className="text-xs opacity-60 mb-0.5">Revenue</p>
                <p className="text-sm font-semibold">
                  {showBalance
                    ? `${dashboardData.wallet.currency} ${(dashboardData.wallet.balance / 0.875).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : '€€€€€€'}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-60 mb-0.5">Fees</p>
                <p className="text-sm font-semibold">
                  {showBalance
                    ? `- ${((dashboardData.wallet.balance / 0.875) * 0.125).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : '€€€€€€'}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-60 mb-0.5">Withdrawn</p>
                <p className="text-sm font-semibold">
                  {showBalance
                    ? `- ${dashboardData.wallet.pending.toLocaleString()}`
                    : '€€€€€€'}
                </p>
              </div>
            </div>

            {/* Bottom Section - Actions */}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openWithdrawModal}
                className="flex-1 px-4 py-2.5 bg-white/90 text-[#7c3aed] rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:bg-white cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Withdraw
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={exportFinancialReport}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Desktop/iPad - Expanded Layout */}
        <div className="hidden md:block relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#5b21b6] p-6 lg:p-8 text-white shadow-2xl">
          {/* Animated gradient orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-black/20 blur-3xl pointer-events-none"
          />

          {/* Toggle Button - Desktop */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowBalance(!showBalance);
            }}
            className="absolute top-6 lg:top-8 right-6 lg:right-8 p-2.5 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm transition-all cursor-pointer z-20 border border-white/30 pointer-events-auto"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? (
              <Eye className="w-5 h-5 text-white" />
            ) : (
              <EyeOff className="w-5 h-5 text-white" />
            )}
          </button>

          <div className="relative z-10">
            {/* Header with Revenue */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center gap-3 mb-3 lg:mb-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm opacity-70 mb-1">Total Revenue</p>
                  <motion.h2
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl lg:text-4xl xl:text-5xl font-bold truncate"
                  >
                    {showBalance
                      ? `${dashboardData.wallet.currency} ${(dashboardData.wallet.balance / 0.875).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : '€€€€€€€€'}
                  </motion.h2>
                </div>
              </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 xl:gap-6">
              {/* Commission & Fees */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-4 lg:p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-xs lg:text-sm text-white/70 font-medium flex-1 min-w-0">Commission & Fees</p>
                  <div className="px-2 py-1 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] lg:text-xs text-red-300 font-bold whitespace-nowrap">-12.5%</span>
                  </div>
                </div>
                <p className="text-lg lg:text-xl xl:text-2xl font-bold truncate">
                  {showBalance
                    ? `- ${dashboardData.wallet.currency} ${((dashboardData.wallet.balance / 0.875) * 0.125).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : '- €€€€€€'}
                </p>
              </motion.div>

              {/* Withdrawn */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-4 lg:p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-xs lg:text-sm text-white/70 font-medium flex-1 min-w-0">Withdrawn</p>
                  <Send className="w-4 h-4 lg:w-5 lg:h-5 text-white/50 flex-shrink-0" />
                </div>
                <p className="text-lg lg:text-xl xl:text-2xl font-bold truncate">
                  {showBalance
                    ? `- ${dashboardData.wallet.currency} ${dashboardData.wallet.pending.toLocaleString()}`
                    : '- €€€€€€'}
                </p>
              </motion.div>

              {/* Available Balance */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-4 lg:p-5 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 shadow-lg shadow-green-500/10"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-xs lg:text-sm text-green-200 font-medium flex-1 min-w-0">Available Balance</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-green-500/30 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-green-200" />
                  </div>
                </div>
                <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-green-200 truncate">
                  {showBalance
                    ? `${dashboardData.wallet.currency} ${dashboardData.wallet.balance.toLocaleString()}`
                    : '€€€€€€'}
                </p>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col gap-2 lg:gap-3 justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openWithdrawModal}
                  className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-white text-[#7c3aed] rounded-xl text-xs lg:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span>Withdraw</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openPaymentModal}
                  className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs lg:text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/20 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span>Pay Affiliates</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportFinancialReport}
                  className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs lg:text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span>Report</span>
                </motion.button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - Better mobile layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
      >
        {[
          { label: "Total Events", value: dashboardData.stats.totalEvents, icon: Calendar, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Active Events", value: dashboardData.stats.activeEvents, icon: Calendar, color: "from-green-500 to-green-600", bgColor: "bg-green-50 dark:bg-green-950/30" },
          { label: "Tickets Sold", value: dashboardData.stats.totalTickets.toLocaleString(), icon: Users, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Total Revenue", value: `${(dashboardData.stats.totalRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6 hover:border-[#8b5cf6]/30 transition-all duration-300"
            >
              <div className="flex flex-col h-full">
                <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-transform group-hover:scale-105", stat.bgColor)}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: `hsl(var(--${stat.color.split('-')[1]}))` }} />
                </div>
                <div className="mt-auto">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">{stat.value}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Quick Actions - Classy and stylish button design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6 sm:mb-8"
      >
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Create Event", icon: Plus, gradient: "from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]", glow: "shadow-[#8b5cf6]/30", href: "/dashboard/events/create" },
            { label: "View Events", icon: Calendar, gradient: "from-blue-500 via-blue-600 to-blue-700", glow: "shadow-blue-500/30", href: "/dashboard/events" },
            { label: "Transactions", icon: Download, gradient: "from-green-500 via-green-600 to-green-700", glow: "shadow-green-500/30", href: "/dashboard/transactions" },
            { label: "Promotions", icon: Megaphone, gradient: "from-orange-500 via-orange-600 to-orange-700", glow: "shadow-orange-500/30", href: "/dashboard/promotions" },
          ].map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-transparent transition-all duration-500 cursor-pointer shadow-lg hover:shadow-2xl"
                >
                  {/* Animated gradient background */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    action.gradient
                  )}>
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </div>

                  {/* Glow effect */}
                  <div className={cn(
                    "absolute -inset-1 bg-gradient-to-br opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10",
                    action.gradient
                  )} />

                  <div className="relative p-5 sm:p-6 flex flex-col items-start gap-4">
                    {/* Icon with glass morphism effect */}
                    <div className="relative">
                      <div className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br flex items-center justify-center transition-all duration-500",
                        "shadow-md group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3",
                        action.gradient
                      )}>
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white relative z-10" />
                        {/* Inner glow */}
                        <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                      {/* Floating ring effect */}
                      <div className={cn(
                        "absolute inset-0 rounded-xl border-2 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500",
                        action.gradient.includes('purple') ? "border-[#8b5cf6]/50" :
                        action.gradient.includes('blue') ? "border-blue-500/50" :
                        action.gradient.includes('green') ? "border-green-500/50" :
                        "border-orange-500/50"
                      )} />
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm sm:text-base font-bold text-foreground group-hover:text-white transition-colors duration-300">
                        {action.label}
                      </p>
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs text-muted-foreground group-hover:text-white/80 transition-colors duration-300">
                          Quick access
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground group-hover:text-white/80 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.div>

      {/* Events and Transactions Grid - Responsive layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Upcoming Events</h2>
            <Link href="/dashboard/events" className="text-xs sm:text-sm text-[#8b5cf6] hover:text-[#7c3aed] font-medium flex items-center gap-1 cursor-pointer">
              View All
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {dashboardData.upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-semibold mb-1 text-sm sm:text-base truncate">{event.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm sm:text-base">KES {event.revenue.toLocaleString()}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{event.tickets} tickets</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Recent Transactions</h2>
            <Link href="/dashboard/transactions" className="text-xs sm:text-sm text-[#8b5cf6] hover:text-[#7c3aed] font-medium flex items-center gap-1 cursor-pointer">
              View All
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {dashboardData.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-semibold mb-1 text-sm sm:text-base truncate">{transaction.event}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm sm:text-base">KES {transaction.amount.toLocaleString()}</p>
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                    transaction.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      transaction.status === "completed" ? "bg-green-600 dark:bg-green-400" : "bg-orange-600 dark:bg-orange-400"
                    )} />
                    {transaction.status === "completed" ? "Completed" : "Pending"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Affiliate Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!showOtpInput) {
                setShowPaymentModal(false)
                setSelectedAffiliate(null)
                setPaymentAmount("")
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold">Pay Affiliate Commission</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select an affiliate and process their commission payment
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowPaymentModal(false)
                    setSelectedAffiliate(null)
                    setPaymentAmount("")
                    setShowOtpInput(false)
                    setOtpInput("")
                  }}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Modal Content */}
              {!showOtpInput ? (
                <>
                  {!selectedAffiliate ? (
                    /* Affiliate Selection List */
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 space-y-4"
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-4">
                          <DollarSign className="w-8 h-8 text-[#8b5cf6]" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Select Affiliate</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose an affiliate to pay their pending commission
                        </p>
                      </div>

                      <div className="space-y-3">
                        {affiliatesWithCommissions.map((affiliate) => (
                          <motion.button
                            key={affiliate.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectAffiliate(affiliate)}
                            className="w-full p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-all text-left"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-base truncate">{affiliate.name}</h3>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0",
                                    affiliate.status === "active"
                                      ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400"
                                  )}>
                                    {affiliate.status}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{affiliate.event}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>{affiliate.totalSales} tickets sold</span>
                                  <span>•</span>
                                  <span>ID: {affiliate.id}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-muted-foreground mb-1">Commission</p>
                                <p className="text-xl font-bold text-[#8b5cf6]">
                                  KES {affiliate.commission.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>

                      {affiliatesWithCommissions.length === 0 && (
                        <div className="text-center py-12">
                          <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                          <p className="text-muted-foreground">No affiliates with pending commissions</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    /* Payment Details Form */
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 space-y-6"
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-4">
                          <DollarSign className="w-8 h-8 text-[#8b5cf6]" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Payment Details</h3>
                        <p className="text-sm text-muted-foreground">
                          Review and confirm the payment amount
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                        <h3 className="text-sm font-semibold mb-3">Payment Details</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Affiliate</span>
                            <span className="font-medium">{selectedAffiliate.name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Event</span>
                            <span className="font-medium">{selectedAffiliate.event}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Sales</span>
                            <span className="font-medium">{selectedAffiliate.totalSales} tickets</span>
                          </div>
                          <div className="pt-2 border-t border-border flex justify-between">
                            <span className="font-semibold">Commission Amount</span>
                            <span className="font-bold text-lg text-[#8b5cf6]">
                              KES {Number(paymentAmount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Custom Amount Input */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Payment Amount (KES)
                        </label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-lg font-semibold"
                          placeholder="Enter amount"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          You can adjust the payment amount if needed
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedAffiliate(null)
                            setPaymentAmount("")
                          }}
                          className="flex-1 px-6 py-3 rounded-xl border border-border hover:bg-secondary transition-colors font-semibold"
                        >
                          Back
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowOtpInput(true)}
                          disabled={!paymentAmount || Number(paymentAmount) <= 0}
                          className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#8b5cf6]/20"
                        >
                          Proceed to Pay
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                /* OTP Verification */
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 space-y-6"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-[#8b5cf6]" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Verify Payment</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the OTP sent to your registered email to confirm the payment
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Paying to</span>
                      <span className="font-medium">{selectedAffiliate?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Amount</span>
                      <span className="font-bold text-lg text-[#8b5cf6]">
                        KES {Number(paymentAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-center text-2xl font-bold tracking-widest"
                      placeholder="0000"
                      maxLength={4}
                    />
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowOtpInput(false)
                        setOtpInput("")
                      }}
                      className="flex-1 px-6 py-3 rounded-xl border border-border hover:bg-secondary transition-colors font-semibold"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePayAffiliate}
                      disabled={otpInput.length !== 4}
                      className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#8b5cf6]/20"
                    >
                      Confirm Payment
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!showOtpInput) {
                setShowWithdrawModal(false)
                setWithdrawAmount("")
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-2xl border border-border shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold">Withdraw Funds</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Submit a withdrawal request for approval
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowWithdrawModal(false)
                    setWithdrawAmount("")
                    setShowOtpInput(false)
                    setOtpInput("")
                  }}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Modal Content */}
              {!showOtpInput ? (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 space-y-6"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-8 h-8 text-[#8b5cf6]" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Withdrawal Request</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the amount you wish to withdraw
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <h4 className="text-sm font-semibold mb-3">Available Balance</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Current Balance</span>
                      <span className="text-2xl font-bold text-[#8b5cf6]">
                        KES {dashboardData.wallet.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Withdrawal Amount (KES)
                    </label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      max={dashboardData.wallet.balance}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-lg font-semibold"
                      placeholder="Enter amount"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Maximum: KES {dashboardData.wallet.balance.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      <strong>Note:</strong> Withdrawal requests are reviewed within 24 hours and processed within 1-3 business days.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowWithdrawModal(false)
                        setWithdrawAmount("")
                      }}
                      className="flex-1 px-6 py-3 rounded-xl border border-border hover:bg-secondary transition-colors font-semibold"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowOtpInput(true)}
                      disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > dashboardData.wallet.balance}
                      className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#8b5cf6]/20"
                    >
                      Submit Request
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                /* OTP Verification */
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 space-y-6"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-[#8b5cf6]" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Verify Withdrawal</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the OTP sent to your registered email to confirm
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Withdrawal Amount</span>
                      <span className="font-bold text-lg text-[#8b5cf6]">
                        KES {Number(withdrawAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-center text-2xl font-bold tracking-widest"
                      placeholder="0000"
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Demo: Use OTP <span className="font-mono font-bold">0000</span> to confirm
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowOtpInput(false)
                        setOtpInput("")
                      }}
                      className="flex-1 px-6 py-3 rounded-xl border border-border hover:bg-secondary transition-colors font-semibold"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWithdraw}
                      disabled={otpInput.length !== 4}
                      className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#8b5cf6]/20"
                    >
                      Confirm Withdrawal
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

