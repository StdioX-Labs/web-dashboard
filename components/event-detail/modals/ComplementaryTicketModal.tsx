import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, CheckCircle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatKenyanPhone } from '../utils'
import { TicketType } from '../types'

interface ComplementaryTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  email: string
  emailError: string
  onEmailChange: (value: string) => void
  phone: string
  phoneError: string
  onPhoneChange: (value: string) => void
  ticketType: string
  onTicketTypeChange: (value: string) => void
  quantity: string
  onQuantityChange: (value: string) => void
  ticketTypes: TicketType[]
  currency: string
}

export function ComplementaryTicketModal({
  isOpen,
  onClose,
  onSubmit,
  email,
  emailError,
  onEmailChange,
  phone,
  phoneError,
  onPhoneChange,
  ticketType,
  onTicketTypeChange,
  quantity,
  onQuantityChange,
  ticketTypes,
  currency,
}: ComplementaryTicketModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ position: 'fixed' }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-4">Issue Complimentary Ticket</h3>
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Recipient Email <span className="text-red-500">*</span>
                </label>
                <div className="relative z-10">
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="recipient@example.com"
                    className={cn(
                      "w-full h-12 px-4 rounded-xl border bg-background text-sm outline-none focus:ring-4 transition-all relative z-10",
                      emailError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        : email && !emailError
                        ? "border-green-500 focus:border-green-500 focus:ring-green-500/10"
                        : "border-border focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/10"
                    )}
                    style={{ position: 'relative' }}
                  />
                  {email && !emailError && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  {emailError && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                {emailError && (
                  <p className="text-xs text-red-500 mt-1.5">{emailError}</p>
                )}
              </div>

              {/* Phone Field */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative z-10">
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => onPhoneChange(e.target.value)}
                    placeholder="254117066018"
                    className={cn(
                      "w-full h-12 px-4 rounded-xl border bg-background text-sm outline-none focus:ring-4 transition-all relative z-10",
                      phoneError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        : phone && !phoneError
                        ? "border-green-500 focus:border-green-500 focus:ring-green-500/10"
                        : "border-border focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/10"
                    )}
                    style={{ position: 'relative' }}
                  />
                  {phone && !phoneError && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  {phoneError && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                {phoneError && (
                  <p className="text-xs text-red-500 mt-1.5">{phoneError}</p>
                )}
                {phone && !phoneError && formatKenyanPhone(phone) && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">
                    Valid: {formatKenyanPhone(phone)}
                  </p>
                )}
              </div>

              {/* Ticket Type Field */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Ticket Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={ticketType}
                  onChange={(e) => onTicketTypeChange(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-[center_right_1rem] bg-no-repeat pr-12"
                >
                  <option value="">Select ticket type</option>
                  {ticketTypes.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticket.name} - {currency} {ticket.price.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Field */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => onQuantityChange(e.target.value)}
                  min="1"
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                />
              </div>

              {/* Info Box */}
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-800 dark:text-purple-300">
                    The ticket will be sent to both the email and phone number provided. The recipient will receive a QR code for entry.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  Issue Ticket
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

