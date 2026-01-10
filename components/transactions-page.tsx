"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Search, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data - replace with actual data from API
// Generate more transactions for realistic pagination testing
const generateMockTransactions = () => {
  const events = ["Nura Fest 2026", "Tech Summit Nairobi", "Jazz Night Live", "Art Exhibition", "Summer Music Festival", "Food & Wine Expo", "Tech Conference 2026", "Business Workshop", "Charity Gala", "Sports Tournament"]
  const buyers = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams", "David Brown", "Emily Davis", "Robert Wilson", "Lisa Anderson", "James Taylor", "Mary Thomas", "William Moore", "Patricia Martin", "Richard Jackson", "Jennifer White", "Thomas Harris"]
  const ticketTypes = ["VIP Pass", "General Admission", "Early Bird", "Premium", "Standard", "Student"]
  const statuses: ("completed" | "pending")[] = ["completed", "completed", "completed", "pending"]

  const transactions = []
  for (let i = 1; i <= 50; i++) {
    const randomEvent = events[Math.floor(Math.random() * events.length)]
    const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)]
    const randomTicketType = ticketTypes[Math.floor(Math.random() * ticketTypes.length)]
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
    const randomAmount = Math.floor(Math.random() * 25000) + 5000
    const randomDaysAgo = Math.floor(Math.random() * 60)
    const date = new Date()
    date.setDate(date.getDate() - randomDaysAgo)

    transactions.push({
      id: `TXN-${String(i).padStart(3, '0')}`,
      event: randomEvent,
      buyer: randomBuyer,
      email: `${randomBuyer.toLowerCase().replace(' ', '.')}@example.com`,
      amount: randomAmount,
      date: date.toISOString().split('T')[0],
      status: randomStatus,
      ticketType: randomTicketType
    })
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

const allTransactions = generateMockTransactions()

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 // Fixed at 10 items per page

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus])

  // Filter transactions
  const filteredTransactions = allTransactions.filter(txn => {
    const matchesSearch =
      txn.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || txn.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const totalAmount = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0)
  const completedCount = filteredTransactions.filter(txn => txn.status === "completed").length
  const pendingCount = filteredTransactions.filter(txn => txn.status === "pending").length

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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
          { label: "Total Transactions", value: filteredTransactions.length.toString(), icon: TrendingUp, color: "text-[#8b5cf6]", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Total Amount", value: `KES ${totalAmount.toLocaleString()}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Completed", value: completedCount.toString(), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Pending", value: pendingCount.toString(), icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
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
              placeholder="Search by event, buyer, or transaction ID..."
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
                <th className="text-left p-4 text-sm font-semibold">Buyer</th>
                <th className="text-left p-4 text-sm font-semibold">Email</th>
                <th className="text-left p-4 text-sm font-semibold">Ticket Type</th>
                <th className="text-left p-4 text-sm font-semibold">Amount</th>
                <th className="text-left p-4 text-sm font-semibold">Date</th>
                <th className="text-left p-4 text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((txn) => (
                <tr key={txn.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="p-4 text-sm font-mono font-semibold">{txn.id}</td>
                  <td className="p-4 text-sm font-medium">{txn.event}</td>
                  <td className="p-4 text-sm">{txn.buyer}</td>
                  <td className="p-4 text-sm text-muted-foreground">{txn.email}</td>
                  <td className="p-4 text-sm">{txn.ticketType}</td>
                  <td className="p-4 text-sm font-bold text-green-600 dark:text-green-400">
                    KES {txn.amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        txn.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          txn.status === "completed" ? "bg-green-600 dark:bg-green-400" : "bg-orange-600 dark:bg-orange-400"
                        )}
                      />
                      {txn.status === "completed" ? "Completed" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-border">
          {paginatedTransactions.map((txn) => (
            <div key={txn.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold mb-1">{txn.event}</p>
                  <p className="text-xs font-mono text-muted-foreground">{txn.id}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    txn.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                  )}
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      txn.status === "completed" ? "bg-green-600" : "bg-orange-600"
                    )}
                  />
                  {txn.status === "completed" ? "Completed" : "Pending"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Buyer</p>
                  <p className="font-medium">{txn.buyer}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-bold text-green-600">KES {txn.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ticket Type</p>
                  <p>{txn.ticketType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p>{new Date(txn.date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-border p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Transaction count info */}
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{" "}
                {filteredTransactions.length} transactions
              </p>

              {/* Page numbers and navigation */}
              <div className="flex items-center gap-2">
                {/* First page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="First page"
                >
                  ««
                </button>

                {/* Previous */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {(() => {
                    const pageNumbers = []
                    const maxVisible = 5
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1)

                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1)
                    }

                    if (startPage > 1) {
                      pageNumbers.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className="w-9 h-9 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary transition-colors cursor-pointer"
                        >
                          1
                        </button>
                      )
                      if (startPage > 2) {
                        pageNumbers.push(
                          <span key="ellipsis1" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        )
                      }
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={cn(
                            "w-9 h-9 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                            currentPage === i
                              ? "bg-[#8b5cf6] text-white border-[#8b5cf6]"
                              : "border-border bg-background hover:bg-secondary"
                          )}
                        >
                          {i}
                        </button>
                      )
                    }

                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pageNumbers.push(
                          <span key="ellipsis2" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        )
                      }
                      pageNumbers.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-9 h-9 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary transition-colors cursor-pointer"
                        >
                          {totalPages}
                        </button>
                      )
                    }

                    return pageNumbers
                  })()}
                </div>

                {/* Mobile page indicator */}
                <div className="sm:hidden px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium">
                  {currentPage} / {totalPages}
                </div>

                {/* Next */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next
                </button>

                {/* Last page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Last page"
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

