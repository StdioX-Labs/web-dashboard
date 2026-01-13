"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Keyboard, CheckCircle, XCircle, Loader2, CreditCard, Users, Ticket } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { toast } from "sonner"

type ScanMode = "camera" | "manual"
type TicketStatus = "valid" | "invalid" | "used" | "unpaid" | null

interface TicketInfo {
  barcode: string
  groupCode: string
  status: TicketStatus
  eventName?: string
  ticketType?: string
  holderName?: string
  isGroupTicket: boolean
  groupSize?: number
  requiresPayment?: boolean
  amount?: number
}

export default function ScanEventsPage() {
  const [scanMode, setScanMode] = useState<ScanMode>("camera")
  const [isScanning, setIsScanning] = useState(false)
  const [manualCode, setManualCode] = useState<string>("")
  const [manualGroupCode, setManualGroupCode] = useState<string>("")
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)

  const startScanning = async () => {
    try {
      setIsScanning(true)
      const html5QrCode = new Html5Qrcode("qr-reader")
      html5QrCodeRef.current = html5QrCode

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleScan(decodedText)
        },
        undefined
      )
    } catch (err) {
      console.error("Error starting scanner:", err)
      toast.error("Failed to start camera", {
        description: "Please check camera permissions"
      })
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
    }
    setIsScanning(false)
  }

  const handleScan = async (code: string) => {
    await stopScanning()
    await validateTicket(code)
  }

  const validateTicket = async (barcode: string, groupCode?: string) => {
    setIsValidating(true)
    setTicketInfo(null)

    try {
      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode: barcode,
          groupCode: groupCode,
        }),
      })

      const data = await response.json()

      if (data.success && data.ticket) {
        const ticketData: TicketInfo = data.ticket
        setTicketInfo(ticketData)

        if (ticketData.requiresPayment) {
          setShowPaymentPrompt(true)
          toast.info("Payment Required", {
            description: "This ticket requires payment to be activated"
          })
        } else if (ticketData.status === "valid") {
          toast.success("Valid Ticket!", {
            description: "Ticket verified successfully"
          })
        } else if (ticketData.status === "used") {
          toast.error("Ticket Already Used", {
            description: "This ticket has already been scanned"
          })
        } else if (ticketData.status === "invalid") {
          toast.error("Invalid Ticket", {
            description: "This ticket could not be verified"
          })
        }
      } else {
        toast.error("Validation Failed", {
          description: data.error || "Could not validate ticket"
        })
      }
    } catch (error) {
      console.error("Validation error:", error)
      toast.error("Validation Failed", {
        description: "Could not validate ticket. Please try again."
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleManualValidation = async () => {
    if (!manualCode.trim()) {
      toast.error("Please enter a barcode")
      return
    }
    await validateTicket(manualCode, manualGroupCode || undefined)
  }

  const handleMpesaPayment = async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number")
      return
    }

    if (!ticketInfo?.amount) {
      toast.error("Invalid payment amount")
      return
    }

    setIsProcessingPayment(true)

    try {
      const response = await fetch('/api/payments/mpesa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          amount: ticketInfo.amount,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Payment Request Sent!", {
          description: "Please check your phone to complete payment"
        })

        setTimeout(() => {
          setTicketInfo(prev => prev ? { ...prev, status: "valid", requiresPayment: false } : null)
          setShowPaymentPrompt(false)
          toast.success("Payment Confirmed!", {
            description: "Ticket is now active"
          })
        }, 3000)
      } else {
        toast.error("Payment Failed", {
          description: data.error || "Could not process payment"
        })
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast.error("Payment Failed", {
        description: "Could not process payment. Please try again."
      })
    } finally {
      setIsProcessingPayment(false)
    }
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  useEffect(() => {
    if (scanMode === "camera" && !isScanning) {
      startScanning()
    } else if (scanMode === "manual" && isScanning) {
      stopScanning()
    }
  }, [scanMode])

  const resetScanner = () => {
    setManualCode("")
    setManualGroupCode("")
    setTicketInfo(null)
    setShowPaymentPrompt(false)
    setPhoneNumber("")
    if (scanMode === "camera") {
      startScanning()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] bg-clip-text text-transparent">
            Scan Event Tickets
          </h1>
          <p className="text-muted-foreground">
            Scan QR codes or enter barcodes manually to verify tickets
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 p-2 bg-muted/50 rounded-2xl"
        >
          <button
            onClick={() => setScanMode("camera")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              scanMode === "camera"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="w-5 h-5" />
            Camera Scan
          </button>
          <button
            onClick={() => setScanMode("manual")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              scanMode === "manual"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="w-5 h-5" />
            Manual Entry
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {scanMode === "camera" ? (
            <div className="relative">
              <div
                id="qr-reader"
                ref={scannerRef}
                className="w-full"
                style={{ minHeight: "300px" }}
              />
              {isScanning && (
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                  <div className="px-4 py-2 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
                    📷 Scanning...
                  </div>
                  <button
                    onClick={stopScanning}
                    className="px-4 py-2 bg-red-500 text-white text-sm rounded-full hover:bg-red-600 transition-colors"
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Barcode / QR Code *
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VT67PD"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Group Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={manualGroupCode}
                    onChange={(e) => setManualGroupCode(e.target.value.toUpperCase())}
                    placeholder="Enter group code if applicable"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleManualValidation}
                disabled={isValidating || !manualCode.trim()}
                className="w-full py-4 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Validate Ticket
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {ticketInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`bg-card border-2 rounded-2xl shadow-xl overflow-hidden ${
                ticketInfo.status === "valid" ? "border-green-500" :
                ticketInfo.status === "invalid" ? "border-red-500" :
                ticketInfo.status === "used" ? "border-orange-500" :
                "border-yellow-500"
              }`}
            >
              <div className={`px-6 py-4 ${
                ticketInfo.status === "valid" ? "bg-green-500/10" :
                ticketInfo.status === "invalid" ? "bg-red-500/10" :
                ticketInfo.status === "used" ? "bg-orange-500/10" :
                "bg-yellow-500/10"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ticketInfo.status === "valid" ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : ticketInfo.status === "invalid" ? (
                      <XCircle className="w-6 h-6 text-red-500" />
                    ) : ticketInfo.status === "used" ? (
                      <XCircle className="w-6 h-6 text-orange-500" />
                    ) : (
                      <CreditCard className="w-6 h-6 text-yellow-500" />
                    )}
                    <div>
                      <h3 className="font-bold text-lg">
                        {ticketInfo.status === "valid" ? "Valid Ticket" :
                         ticketInfo.status === "invalid" ? "Invalid Ticket" :
                         ticketInfo.status === "used" ? "Already Used" :
                         "Payment Required"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Barcode: {ticketInfo.barcode}
                      </p>
                    </div>
                  </div>
                  {ticketInfo.isGroupTicket && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded-full">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">Group ({ticketInfo.groupSize})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Event</p>
                    <p className="font-semibold">{ticketInfo.eventName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Type</p>
                    <p className="font-semibold">{ticketInfo.ticketType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Holder</p>
                    <p className="font-semibold">{ticketInfo.holderName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Group Code</p>
                    <p className="font-semibold">{ticketInfo.groupCode}</p>
                  </div>
                </div>

                {ticketInfo.requiresPayment && showPaymentPrompt && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-4 border-t border-border space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg">Payment Required</h4>
                      <p className="text-2xl font-bold text-[#8b5cf6]">
                        KSH {ticketInfo.amount?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        M-Pesa Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                      />
                    </div>
                    <button
                      onClick={handleMpesaPayment}
                      disabled={isProcessingPayment}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Pay with M-Pesa
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                <button
                  onClick={resetScanner}
                  className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-xl transition-all"
                >
                  Scan Another Ticket
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-muted/30 border border-border rounded-xl p-6 space-y-4"
        >
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#8b5cf6]" />
            How to Use
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#8b5cf6] font-bold">1.</span>
              <span>Select camera scan mode to scan QR codes or barcodes automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8b5cf6] font-bold">2.</span>
              <span>Or switch to manual entry to type in barcode and group code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8b5cf6] font-bold">3.</span>
              <span>Group tickets can have multiple barcodes under one group code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8b5cf6] font-bold">4.</span>
              <span>If payment is required, enter M-Pesa number to complete payment</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

