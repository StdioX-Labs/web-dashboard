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
  const [showBalance, setShowBalance] = React.useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedAffiliate, setSelectedAffiliate] = useState<typeof affiliatesWithCommissions[0] | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
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

  // Placeholder - will be filled from existing file
  const exportFinancialReport = () => {
    // Financial report export logic will be preserved from existing file
  }

  return (
    <div>Placeholder - Dashboard content will be preserved from existing file</div>
  )
}

