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
  isPaid?: boolean
  groupBarcodes?: Array<{
    barcode: string
    isScanned: boolean
    holderName?: string
  }>
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
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([])
  const [isRedeeming, setIsRedeeming] = useState(false)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)

  const startScanning = async () => {
    try {
      setIsScanning(true)
      const html5QrCode = new Html5Qrcode("qr-reader")
      html5QrCodeRef.current = html5QrCode

      // Get available devices
      const devices = await Html5Qrcode.getCameras()

      // Check for barcode scanner device (usually has 'barcode' or 'scanner' in label)
      const barcodeScanner = devices.find(device =>
        device.label.toLowerCase().includes('barcode') ||
        device.label.toLowerCase().includes('scanner')
      )

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] // Support all barcode formats
      }

      // Use barcode scanner if available, otherwise use environment camera
      const cameraId = barcodeScanner ? barcodeScanner.id : { facingMode: "environment" }

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          handleScan(decodedText)
        },
        undefined
      )

      if (barcodeScanner) {
        toast.success("Barcode Scanner Connected", {
          description: "Using dedicated barcode scanner device"
        })
      }
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
    setSelectedBarcodes([])

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

        // Check if ticket is paid
        if (!ticketData.isPaid && ticketData.requiresPayment) {
          setShowPaymentPrompt(true)
          toast.info("Payment Required", {
            description: "This ticket has not been paid for. Please complete payment."
          })
        } else if (ticketData.status === "valid") {
          toast.success("Valid Ticket!", {
            description: ticketData.isPaid ? "Ticket verified successfully" : "Ticket is valid and paid"
          })
        } else if (ticketData.status === "used") {
          toast.error("Ticket Already Used", {
            description: "This ticket has already been scanned and redeemed"
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
    // Allow validation with just group code if barcode is empty
    if (!manualCode.trim() && !manualGroupCode.trim()) {
      toast.error("Please enter a barcode or group code")
      return
    }

    // If only group code is provided (customer has M-Pesa message)
    if (!manualCode.trim() && manualGroupCode.trim()) {
      await validateTicket(manualGroupCode, manualGroupCode)
    } else {
      await validateTicket(manualCode, manualGroupCode || undefined)
    }
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
          groupCode: ticketInfo.groupCode,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Payment Request Sent!", {
          description: "Please check your phone to complete payment"
        })

        setTimeout(() => {
          setTicketInfo(prev => prev ? { ...prev, status: "valid", requiresPayment: false, isPaid: true } : null)
          setShowPaymentPrompt(false)
          toast.success("Payment Confirmed!", {
            description: "Ticket is now active and can be redeemed"
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

  // Toggle barcode selection for group tickets
  const toggleBarcodeSelection = (barcode: string) => {
    setSelectedBarcodes(prev => {
      if (prev.includes(barcode)) {
        return prev.filter(b => b !== barcode)
      } else {
        return [...prev, barcode]
      }
    })
  }

  // Redeem selected barcodes
  const handleRedeemBarcodes = async () => {
    if (selectedBarcodes.length === 0) {
      toast.error("Please select at least one ticket to redeem")
      return
    }

    setIsRedeeming(true)

    try {
      const response = await fetch('/api/tickets/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupCode: ticketInfo?.groupCode,
          barcodes: selectedBarcodes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Tickets Redeemed!", {
          description: `Successfully redeemed ${selectedBarcodes.length} ticket(s)`
        })

        // Update ticket info to mark selected barcodes as scanned
        setTicketInfo(prev => {
          if (!prev || !prev.groupBarcodes) return prev
          return {
            ...prev,
            groupBarcodes: prev.groupBarcodes.map(gb => ({
              ...gb,
              isScanned: selectedBarcodes.includes(gb.barcode) ? true : gb.isScanned
            }))
          }
        })

        setSelectedBarcodes([])
      } else {
        toast.error("Redemption Failed", {
          description: data.error || "Could not redeem tickets"
        })
      }
    } catch (error) {
      console.error("Redemption error:", error)
      toast.error("Redemption Failed", {
        description: "Could not redeem tickets. Please try again."
      })
    } finally {
      setIsRedeeming(false)
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
    setSelectedBarcodes([])
    if (scanMode === "camera") {
      startScanning()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-1 sm:space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] bg-clip-text text-transparent">
            Scan Event Tickets
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Scan QR codes or enter barcodes manually to verify tickets
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 sm:gap-4 p-1.5 sm:p-2 bg-muted/50 rounded-xl sm:rounded-2xl"
        >
          <button
            onClick={() => setScanMode("camera")}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all ${
              scanMode === "camera"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Camera Scan</span>
            <span className="xs:hidden">Camera</span>
          </button>
          <button
            onClick={() => setScanMode("manual")}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all ${
              scanMode === "manual"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Manual Entry</span>
            <span className="xs:hidden">Manual</span>
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
            <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Barcode (For unpaid walk-ins)
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VT67PD (optional)"
                    className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Group Code (From M-Pesa SMS) *
                  </label>
                  <input
                    type="text"
                    value={manualGroupCode}
                    onChange={(e) => setManualGroupCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GRP123"
                    className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Enter group code from M-Pesa message. System will fetch all ticket details and barcodes.
                  </p>
                </div>
              </div>
              <button
                onClick={handleManualValidation}
                disabled={isValidating || (!manualCode.trim() && !manualGroupCode.trim())}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white text-sm sm:text-base font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
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

                {/* Group Ticket Barcode Selection */}
                {ticketInfo.isGroupTicket && ticketInfo.groupBarcodes && ticketInfo.groupBarcodes.length > 0 && ticketInfo.isPaid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-4 border-t border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base sm:text-lg">Select Tickets to Redeem</h4>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {selectedBarcodes.length} of {ticketInfo.groupBarcodes.filter(gb => !gb.isScanned).length} selected
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {ticketInfo.groupBarcodes.map((groupBarcode, index) => (
                        <div
                          key={groupBarcode.barcode}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                            groupBarcode.isScanned
                              ? "border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed"
                              : selectedBarcodes.includes(groupBarcode.barcode)
                              ? "border-[#8b5cf6] bg-[#8b5cf6]/10"
                              : "border-border hover:border-[#8b5cf6]/50 cursor-pointer"
                          }`}
                          onClick={() => !groupBarcode.isScanned && toggleBarcodeSelection(groupBarcode.barcode)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              groupBarcode.isScanned
                                ? "border-gray-400 bg-gray-200"
                                : selectedBarcodes.includes(groupBarcode.barcode)
                                ? "border-[#8b5cf6] bg-[#8b5cf6]"
                                : "border-border"
                            }`}>
                              {(selectedBarcodes.includes(groupBarcode.barcode) || groupBarcode.isScanned) && (
                                <CheckCircle className={`w-3 h-3 ${groupBarcode.isScanned ? "text-gray-600" : "text-white"}`} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Ticket #{index + 1}: {groupBarcode.barcode}
                              </p>
                              {groupBarcode.holderName && (
                                <p className="text-xs text-muted-foreground">{groupBarcode.holderName}</p>
                              )}
                            </div>
                          </div>
                          {groupBarcode.isScanned && (
                            <span className="text-xs font-medium text-gray-600 px-2 py-1 bg-gray-200 rounded">
                              Scanned
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {selectedBarcodes.length > 0 && (
                      <button
                        onClick={handleRedeemBarcodes}
                        disabled={isRedeeming}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isRedeeming ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Redeem {selectedBarcodes.length} Ticket{selectedBarcodes.length > 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    )}
                  </motion.div>
                )}

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
              <span><strong>Paid customers with QR code:</strong> Use camera scan mode. QR contains all details.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8b5cf6] font-bold">2.</span>
              <span><strong>Paid customers with M-Pesa SMS:</strong> Use manual entry. Enter ONLY the group code (e.g., GRP123). System fetches all barcodes automatically.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8b5cf6] font-bold">3.</span>
              <span><strong>Unpaid customers:</strong> Look up booking, process M-Pesa payment. Group code generated after payment.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8b5cf6] font-bold">4.</span>
              <span><strong>Group tickets:</strong> Select specific barcodes for attending members only, then redeem.</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

