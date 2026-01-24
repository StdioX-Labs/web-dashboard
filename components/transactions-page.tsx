"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, TrendingUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"

interface Transaction {
  id: number
  companyId: number
  event: {
    id: number
    eventName: string
    currency: string
  }
  ticket: {
    id: number
    ticketName: string
    ticketPrice: number
  }
  buyer: {
    id: number
    email: string | null
    mobileNumber: string
    firstName: string | null
    lastName: string | null
    createdAt: string
  }
  barcode: string
  transactionId: string
  transactionType: string
  transactionAmount: number
  platformFee: number
  createdAt: string
}

interface TransactionDisplay {
  id: number
  amount: number
  currency: string
  status: string
  createdAt: string
  eventName: string
  ticketName: string
  quantity: number
  customerName: string
  customerEmail: string
  customerPhone: string
  reference: string
  barcode: string
  platformFee: number
}

interface PaginationInfo {
  page: number
  size: number
  totalElements: number
  totalPages: number
}

interface TransactionStats {
  ticketsSold: number
  platformLiability: number
  totalSales: number
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  })
  const [stats, setStats] = useState<TransactionStats>({
    ticketsSold: 0,
    platformLiability: 0,
    totalSales: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending" | "success" | "failed">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [currency, setCurrency] = useState("KES")

  // Fetch transactions
  const fetchTransactions = async (page: number = 0) => {
    try {
      setIsLoading(true)
      const user = sessionManager.getUser()

      if (!user || !user.company_id) {
        return
      }

      setCurrency(user.currency || "KES")

      const response = await api.transactions.fetchDetailed({
        id: user.company_id,
        idType: 'company',
        transactionType: 'TICKET_SALE',
        page: page,
        size: 10,
      })

      console.log('API Response:', response) // Debug log

      if (response.data && response.data.data) {
        // Transform the API data to match our display format
        const transformedTransactions: TransactionDisplay[] = response.data.data.map((txn) => {
          // Get customer name
          const customerName = txn.buyer.firstName && txn.buyer.lastName
            ? `${txn.buyer.firstName} ${txn.buyer.lastName}`
            : txn.buyer.firstName || txn.buyer.lastName || 'Unknown'

          return {
            id: txn.id,
            amount: txn.transactionAmount,
            currency: txn.event.currency,
            status: 'Completed', // All ticket sales are completed
            createdAt: txn.createdAt,
            eventName: txn.event.eventName,
            ticketName: txn.ticket.ticketName,
            quantity: 1, // Each transaction is for 1 ticket based on the API structure
            customerName: customerName,
            customerEmail: txn.buyer.email || 'N/A',
            customerPhone: txn.buyer.mobileNumber,
            reference: txn.transactionId,
            barcode: txn.barcode,
            platformFee: txn.platformFee,
          }
        })

        setTransactions(transformedTransactions)

        // Set pagination from API response
        setPagination({
          page: response.data.page,
          size: response.data.size,
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
        })

        // Set stats from API response
        if (response.stats) {
          setStats(response.stats)
        }
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions(currentPage - 1)
  }, [currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchQuery, filterStatus])

  // Filter transactions (client-side filtering on already fetched data)
  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch =
      (txn.eventName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (txn.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (txn.reference?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      txn.id.toString().includes(searchQuery)

    const matchesStatus = filterStatus === "all" ||
      txn.status.toLowerCase() === filterStatus.toLowerCase()

    return matchesSearch && matchesStatus
  })


  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">All Transactions</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Complete overview of all transactions across your events
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        {[
          { label: "Total Tickets Sold", value: stats.ticketsSold.toString(), icon: TrendingUp, color: "text-[#8b5cf6]", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Total Sales", value: `${currency} ${stats.totalSales.toLocaleString()}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Platform Liability", value: `${currency} ${stats.platformLiability.toLocaleString()}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Total Transactions", value: pagination.totalElements.toString(), icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="rounded-xl border border-border bg-card p-4 sm:p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("p-2 rounded-lg", stat.bg)}>
                  <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", stat.color)} />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by event, customer, or transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {["all", "completed", "pending"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as typeof filterStatus)}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                  filterStatus === status
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 text-sm font-semibold">Transaction ID</th>
                <th className="text-left p-4 text-sm font-semibold">Event</th>
                <th className="text-left p-4 text-sm font-semibold">Customer</th>
                <th className="text-left p-4 text-sm font-semibold">Email</th>
                <th className="text-left p-4 text-sm font-semibold">Ticket Type</th>
                <th className="text-left p-4 text-sm font-semibold">Qty</th>
                <th className="text-left p-4 text-sm font-semibold">Amount</th>
                <th className="text-left p-4 text-sm font-semibold">Date</th>
                <th className="text-left p-4 text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-4 text-sm font-mono font-semibold">{txn.reference || `TXN-${txn.id}`}</td>
                    <td className="p-4 text-sm font-medium">{txn.eventName || 'N/A'}</td>
                    <td className="p-4 text-sm">{txn.customerName || 'N/A'}</td>
                    <td className="p-4 text-sm text-muted-foreground">{txn.customerEmail || 'N/A'}</td>
                    <td className="p-4 text-sm">{txn.ticketName || 'N/A'}</td>
                    <td className="p-4 text-sm">{txn.quantity || 1}</td>
                    <td className="p-4 text-sm font-bold text-green-600 dark:text-green-400">
                      {txn.currency} {txn.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(txn.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          txn.status.toLowerCase() === "completed" || txn.status.toLowerCase() === "success"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            : txn.status.toLowerCase() === "pending"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        )}
                      >
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            txn.status.toLowerCase() === "completed" || txn.status.toLowerCase() === "success"
                              ? "bg-green-600 dark:bg-green-400"
                              : txn.status.toLowerCase() === "pending"
                              ? "bg-orange-600 dark:bg-orange-400"
                              : "bg-red-600 dark:bg-red-400"
                          )}
                        />
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading transactions...</span>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No transactions found
            </div>
          ) : (
            filteredTransactions.map((txn) => (
              <div key={txn.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold mb-1">{txn.eventName || 'N/A'}</p>
                    <p className="text-xs font-mono text-muted-foreground">{txn.reference || `TXN-${txn.id}`}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      txn.status.toLowerCase() === "completed" || txn.status.toLowerCase() === "success"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        : txn.status.toLowerCase() === "pending"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    )}
                  >
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        txn.status.toLowerCase() === "completed" || txn.status.toLowerCase() === "success"
                          ? "bg-green-600"
                          : txn.status.toLowerCase() === "pending"
                          ? "bg-orange-600"
                          : "bg-red-600"
                      )}
                    />
                    {txn.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">{txn.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-bold text-green-600">{txn.currency} {txn.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket Type</p>
                    <p>{txn.ticketName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p>{new Date(txn.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && !isLoading && (
          <div className="border-t border-border p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.page * pagination.size + 1} to{" "}
                {Math.min((pagination.page + 1) * pagination.size, pagination.totalElements)} of{" "}
                {pagination.totalElements} transactions
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>

                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium">
                  {currentPage} / {pagination.totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>

                <button
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  disabled={currentPage === pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

