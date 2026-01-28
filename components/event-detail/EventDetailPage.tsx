"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

// Import custom hooks
import {
  useEventData,
  useTransactions,
  useAttendees,
  useEventHandlers,
} from "./hooks"

// Import modals
import {
  ComplementaryTicketModal,
  SuspendActivateModal,
} from "./modals"

// Import utilities
import { getPaginatedData, getTotalPages } from "./utils"

// Import types
import { TabType, TicketType } from "./types"

// TODO: These will be extracted into separate component files
// For now, we'll import from the original file to avoid breaking the app
// Once tab components are created, replace these with the new components
import EventDetailPageOriginal from "../event-detail-page"

interface EventDetailPageProps {
  eventId: number
}

export default function EventDetailPage({ eventId }: EventDetailPageProps) {
  // Use the refactored hooks
  const { eventData, isLoading, currency } = useEventData(eventId)

  // Tab and pagination state
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [attendeesPage, setAttendeesPage] = useState(1)
  const itemsPerPage = 10

  // Fetch transactions and attendees
  const {
    transactions,
    transactionsLoading,
    transactionsStats,
    transactionsTotalPages,
    transactionsTotalElements,
  } = useTransactions(eventId, activeTab, transactionsPage, itemsPerPage, eventData)

  const {
    attendees,
    attendeesLoading,
  } = useAttendees(eventId, activeTab, eventData)

  // Event handlers and modal state
  const handlers = useEventHandlers()

  // Get ticket types from event data
  const ticketTypes: TicketType[] = eventData?.tickets?.map((ticket: any) => ({
    id: ticket.id,
    name: ticket.ticketName,
    price: ticket.ticketPrice,
    totalAvailable: ticket.originalTicketCount || (ticket.soldQuantity + ticket.quantityAvailable),
    sold: ticket.soldQuantity || ticket.uniqueTicketCount || 0,
    revenue: ticket.ticketPrice * (ticket.soldQuantity || ticket.uniqueTicketCount || 0),
    status: ticket.isSoldOut ? 'sold_out' : ticket.isActive ? 'active' : 'inactive',
    quantityAvailable: ticket.quantityAvailable || (ticket.originalTicketCount ? ticket.originalTicketCount - (ticket.uniqueTicketCount || 0) : 0),
  })) || []

  // Paginated attendees (transactions are paginated from API)
  const paginatedAttendees = getPaginatedData(attendees, attendeesPage, itemsPerPage)
  const attendeesTotalPages = getTotalPages(attendees.length, itemsPerPage)

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#8b5cf6]" />
          <p className="text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    )
  }

  // Not found state
  if (!eventData) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The event you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Events
          </Link>
        </div>
      </div>
    )
  }

  // TODO: Replace with modular tab components once they're extracted
  // For now, use the original component to avoid breaking the app
  // This is a temporary bridge during the refactoring process
  return (
    <>
      {/* Use original component temporarily */}
      <EventDetailPageOriginal eventId={eventId} />

      {/* Modals using refactored components */}
      <ComplementaryTicketModal
        isOpen={handlers.showComplementaryModal}
        onClose={handlers.handleCloseCompModal}
        onSubmit={handlers.handleIssueCompTicket}
        email={handlers.compEmail}
        emailError={handlers.compEmailError}
        onEmailChange={handlers.handleEmailChange}
        phone={handlers.compPhone}
        phoneError={handlers.compPhoneError}
        onPhoneChange={handlers.handlePhoneChange}
        ticketType={handlers.compTicketType}
        onTicketTypeChange={handlers.setCompTicketType}
        quantity={handlers.compQuantity}
        onQuantityChange={handlers.setCompQuantity}
        ticketTypes={ticketTypes}
        currency={currency}
      />

      <SuspendActivateModal
        isOpen={handlers.showSuspendModal}
        onClose={handlers.handleModalClose}
        step={handlers.suspendStep}
        actionType={handlers.actionType}
        suspendType={handlers.suspendType}
        otp={handlers.suspendOtp}
        onOtpChange={(value) => {
          handlers.setSuspendOtp(value)
          handlers.setSuspendError("")
        }}
        error={handlers.suspendError}
        onConfirm={handlers.handleSuspendConfirm}
        onOtpSubmit={handlers.handleOtpSubmit}
        onBack={() => handlers.setSuspendStep("confirm")}
      />
    </>
  )
}

