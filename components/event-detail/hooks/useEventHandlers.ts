// Event handlers and business logic for Event Detail Page
import { useState } from 'react'
import { toast } from 'sonner'
import { validateEmail, validateKenyanPhone, formatKenyanPhone } from '../utils'
import { ActionType, SuspendType, SuspendStep } from '../types'

export function useEventHandlers() {
  // Complementary Ticket State
  const [showComplementaryModal, setShowComplementaryModal] = useState(false)
  const [compEmail, setCompEmail] = useState("")
  const [compEmailError, setCompEmailError] = useState("")
  const [compPhone, setCompPhone] = useState("")
  const [compPhoneError, setCompPhoneError] = useState("")
  const [compTicketType, setCompTicketType] = useState("")
  const [compQuantity, setCompQuantity] = useState("1")

  // Suspend/Activate State
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendStep, setSuspendStep] = useState<SuspendStep>("confirm")
  const [suspendOtp, setSuspendOtp] = useState("")
  const [suspendError, setSuspendError] = useState("")
  const [suspendType, setSuspendType] = useState<SuspendType>("event")
  const [suspendTicketId, setSuspendTicketId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<ActionType>("suspend")
  const [eventSuspended, setEventSuspended] = useState(false)
  const [suspendedTickets, setSuspendedTickets] = useState<number[]>([])

  // Email/Phone validation handlers
  const handleEmailChange = (value: string) => {
    setCompEmail(value)
    if (!value.trim()) {
      setCompEmailError("")
      return
    }
    if (!validateEmail(value)) {
      setCompEmailError("Invalid email address")
    } else {
      setCompEmailError("")
    }
  }

  const handlePhoneChange = (value: string) => {
    setCompPhone(value)
    if (!value.trim()) {
      setCompPhoneError("")
      return
    }
    if (!validateKenyanPhone(value)) {
      setCompPhoneError("Invalid Kenyan phone number")
    } else {
      setCompPhoneError("")
    }
  }

  // Suspend/Activate handlers
  const handleSuspendClick = (type: SuspendType, ticketId?: number) => {
    setSuspendType(type)
    setSuspendTicketId(ticketId || null)
    setActionType("suspend")
    setSuspendStep("confirm")
    setSuspendOtp("")
    setSuspendError("")
    setShowSuspendModal(true)
  }

  const handleActivateClick = (type: SuspendType, ticketId?: number) => {
    setSuspendType(type)
    setSuspendTicketId(ticketId || null)
    setActionType("activate")
    setSuspendStep("confirm")
    setSuspendOtp("")
    setSuspendError("")
    setShowSuspendModal(true)
  }

  const handleSuspendConfirm = () => {
    setSuspendStep("otp")
    setSuspendError("")
  }

  const handleOtpSubmit = () => {
    // Test OTP is 0000
    if (suspendOtp === "0000") {
      if (actionType === "suspend") {
        if (suspendType === "event") {
          setEventSuspended(true)
          toast.error("Event suspended", {
            description: "Ticket sales have been paused and the event is now hidden from the marketplace."
          })
        } else {
          setSuspendedTickets([...suspendedTickets, suspendTicketId!])
          toast.error("Ticket sales suspended", {
            description: "This ticket type is no longer available for purchase."
          })
        }
      } else {
        if (suspendType === "event") {
          setEventSuspended(false)
          toast.success("Event activated successfully!", {
            description: "Ticket sales have resumed and the event is now visible on the marketplace."
          })
        } else {
          setSuspendedTickets(suspendedTickets.filter(id => id !== suspendTicketId))
          toast.success("Ticket sales activated successfully!", {
            description: "This ticket type is now available for purchase again."
          })
        }
      }
      setShowSuspendModal(false)
      setSuspendOtp("")
      setSuspendError("")
    } else {
      setSuspendError("Invalid OTP. Please try again.")
    }
  }

  const handleModalClose = () => {
    setShowSuspendModal(false)
    setSuspendStep("confirm")
    setSuspendOtp("")
    setSuspendError("")
  }

  // Complementary ticket handler
  const handleIssueCompTicket = () => {
    if (!compEmail) {
      toast.error("Please enter recipient email")
      return
    }
    if (compEmailError || !validateEmail(compEmail)) {
      toast.error("Please enter a valid email address")
      return
    }
    if (!compPhone) {
      toast.error("Please enter recipient phone number")
      return
    }
    if (compPhoneError || !validateKenyanPhone(compPhone)) {
      toast.error("Please enter a valid Kenyan phone number")
      return
    }
    if (!compTicketType) {
      toast.error("Please select a ticket type")
      return
    }
    const quantity = parseInt(compQuantity)
    if (isNaN(quantity) || quantity < 1) {
      toast.error("Please enter a valid quantity")
      return
    }

    const formattedPhone = formatKenyanPhone(compPhone)
    toast.success("Complimentary ticket issued successfully!", {
      description: `Sent to ${compEmail} (${formattedPhone})`,
    })

    // Reset form and close modal
    setCompEmail("")
    setCompEmailError("")
    setCompPhone("")
    setCompPhoneError("")
    setCompTicketType("")
    setCompQuantity("1")
    setShowComplementaryModal(false)
  }

  const handleCloseCompModal = () => {
    setShowComplementaryModal(false)
    setCompEmail("")
    setCompEmailError("")
    setCompPhone("")
    setCompPhoneError("")
    setCompTicketType("")
    setCompQuantity("1")
  }

  return {
    // Complementary ticket state
    showComplementaryModal,
    setShowComplementaryModal,
    compEmail,
    compEmailError,
    compPhone,
    compPhoneError,
    compTicketType,
    setCompTicketType,
    compQuantity,
    setCompQuantity,
    handleEmailChange,
    handlePhoneChange,
    handleIssueCompTicket,
    handleCloseCompModal,

    // Suspend/Activate state
    showSuspendModal,
    suspendStep,
    setSuspendStep,
    suspendOtp,
    setSuspendOtp,
    suspendError,
    setSuspendError,
    suspendType,
    suspendTicketId,
    actionType,
    eventSuspended,
    suspendedTickets,
    handleSuspendClick,
    handleActivateClick,
    handleSuspendConfirm,
    handleOtpSubmit,
    handleModalClose,
  }
}

