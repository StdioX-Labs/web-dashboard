import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SuspendStep, ActionType, SuspendType } from '../types'

interface SuspendActivateModalProps {
  isOpen: boolean
  onClose: () => void
  step: SuspendStep
  actionType: ActionType
  suspendType: SuspendType
  otp: string
  onOtpChange: (value: string) => void
  error: string
  onConfirm: () => void
  onOtpSubmit: () => void
  onBack: () => void
}

export function SuspendActivateModal({
  isOpen,
  onClose,
  step,
  actionType,
  suspendType,
  otp,
  onOtpChange,
  error,
  onConfirm,
  onOtpSubmit,
  onBack,
}: SuspendActivateModalProps) {
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {step === "confirm" ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    actionType === "suspend"
                      ? "bg-red-100 dark:bg-red-950/30"
                      : "bg-green-100 dark:bg-green-950/30"
                  )}>
                    <AlertTriangle className={cn(
                      "w-6 h-6",
                      actionType === "suspend"
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    )} />
                  </div>
                  <h3 className="text-xl font-bold">
                    {actionType === "suspend" ? "Suspend" : "Activate"} {suspendType === "event" ? "Event" : "Ticket Sales"}?
                  </h3>
                </div>
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    {actionType === "suspend" ? (
                      suspendType === "event"
                        ? "Are you sure you want to suspend this event? This will stop all ticket sales and hide the event from the marketplace."
                        : "Are you sure you want to suspend sales for this ticket type? No more tickets of this type can be sold."
                    ) : (
                      suspendType === "event"
                        ? "Are you sure you want to activate this event? This will resume ticket sales and make the event visible on the marketplace."
                        : "Are you sure you want to activate sales for this ticket type? Tickets will be available for purchase again."
                    )}
                  </p>
                  <div className={cn(
                    "p-4 rounded-lg border",
                    actionType === "suspend"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30"
                      : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30"
                  )}>
                    <p className={cn(
                      "text-sm",
                      actionType === "suspend"
                        ? "text-red-800 dark:text-red-300"
                        : "text-green-800 dark:text-green-300"
                    )}>
                      <span className="font-semibold">{actionType === "suspend" ? "Warning:" : "Note:"}</span> {actionType === "suspend"
                        ? "This action can be reversed, but it may affect your event's visibility and sales."
                        : "This will make the event/ticket immediately available for purchase."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className={cn(
                      "flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer",
                      actionType === "suspend"
                        ? "bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-600/25"
                        : "bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-600/25"
                    )}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-4">Enter OTP to Confirm</h3>
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    For security purposes, please enter the 4-digit OTP to confirm the {actionType === "suspend" ? "suspension" : "activation"}.
                  </p>
                  <div>
                    <label className="text-sm font-medium mb-2 block">OTP Code</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "")
                        onOtpChange(value)
                      }}
                      placeholder="••••"
                      className="w-full h-14 px-4 rounded-xl border border-border bg-background text-2xl font-mono text-center outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                    {error && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onBack}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={onOtpSubmit}
                    disabled={otp.length !== 4}
                    className={cn(
                      "flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                      actionType === "suspend"
                        ? "bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-600/25"
                        : "bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-600/25"
                    )}
                  >
                    Confirm {actionType === "suspend" ? "Suspension" : "Activation"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

