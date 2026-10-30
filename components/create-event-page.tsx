"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  MapPin,
  Upload,
  X,
  Plus,
  Minus,
  Image as ImageIcon,
  Info,
  Loader2,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DateTimePicker, DatePicker, TimePicker } from "@/components/ui/date-time-picker"
import { api, apiErrorField } from "@/lib/api-client"
import { FieldError, FormError, errorInputClass, type FieldErrors } from "@/components/form-errors"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import { endAfterStartChange } from "@/lib/event-dates"
import { TICKET_FIELD_HELP } from "@/lib/ticket-limits"
import { sessionManager } from "@/lib/session-manager"
import { uploadToContabo, validateImageFile } from "@/lib/contabo-uploader"

/** Event fields the API can name in an error; anything else is shown above the form. */
const EVENT_FIELD_LABELS: Record<string, true> = {
  eventName: true, slug: true, eventCategory: true, eventStartDate: true, eventEndDate: true,
  eventLocation: true, eventDescription: true, ticketSaleStartDate: true, ticketSaleEndDate: true,
  eventPosterUrl: true,
}

/** Ticket fields the API can name in an error, as the request spells them. */
const TICKET_FIELDS: Record<string, true> = {
  ticketName: true, ticketPrice: true, quantityAvailable: true, numberOfComplementary: true,
  ticketsToIssue: true, ticketLimitPerPerson: true, ticketSaleStartDate: true, ticketSaleEndDate: true,
}

/** The request field each ticket input feeds, so editing it clears the right error. */
const TICKET_FORM_TO_API: Partial<Record<keyof TicketType, string>> = {
  name: "ticketName", price: "ticketPrice", quantity: "quantityAvailable", complementary: "numberOfComplementary",
  ticketsToIssue: "ticketsToIssue", limitPerPerson: "ticketLimitPerPerson",
  saleStartDate: "ticketSaleStartDate", saleEndDate: "ticketSaleEndDate",
}

/** Drops one field's error, and the form-level one, once the organiser edits. */
const withoutError = (prev: FieldErrors, key: string): FieldErrors => {
  if (!prev[key] && !prev.form) return prev
  const next = { ...prev }
  delete next[key]
  delete next.form
  return next
}

interface TicketType {
  id: string
  name: string
  price: string
  quantity: string
  description: string
  complementary: string
  ticketsToIssue: string
  limitPerPerson: string
  isGroupTicket: boolean
  restrictLimitPerPerson: boolean
  saleStartDate: Date | undefined
  saleEndDate: Date | undefined
}

export default function CreateEventPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Step management
  const [currentStep, setCurrentStep] = useState<'event' | 'tickets' | 'complete'>('event')
  const [createdEventId, setCreatedEventId] = useState<number | null>(null)
  const [createdEventName, setCreatedEventName] = useState<string>("")

  // Form state
  const [eventName, setEventName] = useState("")
  const [eventStartDate, setEventStartDate] = useState<Date | undefined>(undefined)
  const [eventEndDate, setEventEndDate] = useState<Date | undefined>(undefined)
  const [venue, setVenue] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("1")
  const [commission, setCommission] = useState("5.0")
  const [slug, setSlug] = useState("")
  const [currency, setCurrency] = useState("KES")
  const [saleStartDateTime, setSaleStartDateTime] = useState<Date | undefined>(undefined)
  const [saleEndDateTime, setSaleEndDateTime] = useState<Date | undefined>(undefined)
  const [eventErrors, setEventErrors] = useState<FieldErrors>({})
  const [ticketErrors, setTicketErrors] = useState<Record<string, FieldErrors>>({})
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { id: "1", name: "", price: "", quantity: "", description: "", complementary: "0", ticketsToIssue: "1", limitPerPerson: "0", isGroupTicket: false, restrictLimitPerPerson: false, saleStartDate: undefined, saleEndDate: undefined },
  ])

  // Auto-generate slug from event name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) // Limit length
  }

  const handleEventNameChange = (name: string) => {
    setEventName(name)
    // Auto-generate slug if it's empty or matches the previous auto-generated value
    if (!slug || slug === generateSlug(eventName)) {
      setSlug(generateSlug(name))
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file
      const validation = validateImageFile(file)
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }

      setUploadedImageFile(file)
      clearEventError("eventPosterUrl")
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Id of the ticket form just added, so it can be highlighted and scrolled to
  const [newTicketId, setNewTicketId] = useState<string | null>(null)
  const ticketRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const addTicketType = () => {
    const id = Date.now().toString()
    setTicketTypes((prev) => [
      ...prev,
      { id, name: "", price: "", quantity: "", description: "", complementary: "0", ticketsToIssue: "1", limitPerPerson: "0", isGroupTicket: false, restrictLimitPerPerson: false, saleStartDate: undefined, saleEndDate: undefined },
    ])
    setNewTicketId(id)
  }

  // Bring a freshly added ticket form into view and put the cursor in it. The
  // entry animation reads as "something appeared"; this makes sure it is not
  // missed when the new card lands below the fold.
  useEffect(() => {
    if (!newTicketId) return

    const card = ticketRefs.current.get(newTicketId)
    card?.scrollIntoView({ behavior: "smooth", block: "center" })
    card?.querySelector("input")?.focus({ preventScroll: true })

    const timer = setTimeout(() => setNewTicketId(null), 1400)
    return () => clearTimeout(timer)
  }, [newTicketId])

  const removeTicketType = (id: string) => {
    if (ticketTypes.length > 1) {
      setTicketTypes((prev) => prev.filter((ticket) => ticket.id !== id))
    }
  }

  /**
   * Patch one field. Functional so that two calls in the same event handler
   * compose instead of the second silently discarding the first — reading
   * `ticketTypes` from the render closure made batched updates clobber
   * each other.
   */
  const updateTicketType = (id: string, field: keyof TicketType, value: string | Date | undefined | boolean) => {
    clearTicketError(id, TICKET_FORM_TO_API[field])
    setTicketTypes((prev) =>
      prev.map((ticket) =>
        ticket.id === id ? { ...ticket, [field]: value } : ticket
      )
    )
  }

  const clearTicketError = (id: string, apiField: string | undefined) => {
    if (!apiField) return
    setTicketErrors((prev) => {
      if (!prev[id]) return prev
      const next = withoutError(prev[id], apiField)
      return next === prev[id] ? prev : { ...prev, [id]: next }
    })
  }

  const clearEventError = (key: string) => setEventErrors((prev) => withoutError(prev, key))

  /** Patch several fields at once, for toggles that also seed a companion value. */
  const patchTicketType = (id: string, patch: Partial<TicketType>) => {
    for (const key of Object.keys(patch) as (keyof TicketType)[]) clearTicketError(id, TICKET_FORM_TO_API[key])
    setTicketTypes((prev) =>
      prev.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 'event') {
      await handleCreateEvent()
    } else if (currentStep === 'tickets') {
      await handleAddTickets()
    }
  }

  // Brings the first rejected input into view; a reason below the fold
  // otherwise reads as the button doing nothing.
  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      document.querySelector("[data-field-error]")?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  const handleCreateEvent = async () => {
    // Get user session
    const user = sessionManager.getUser()
    if (!user) {
      toast.error("Please log in to create an event")
      router.push("/")
      return
    }

    // Keyed by the API's own field names, so client checks and the reasons
    // the API sends back land in the same place.
    const errors: FieldErrors = {}
    if (!eventName.trim()) errors.eventName = "Enter the event name"
    else if (eventName.trim().length < 2 || eventName.trim().length > 50) errors.eventName = "Event name must be between 2 and 50 characters"
    if (!slug) errors.slug = "Enter a URL for your event"
    else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = "Use only lowercase letters, numbers and hyphens"
    if (!category) errors.eventCategory = "Choose a category"
    if (!eventStartDate) errors.eventStartDate = "Set when the event starts"
    if (!eventEndDate) errors.eventEndDate = "Set when the event ends"
    else if (eventStartDate && eventEndDate <= eventStartDate) errors.eventEndDate = "The event must end after it starts"
    else if (eventEndDate.getTime() < Date.now()) errors.eventEndDate = "This date has already passed. Check the date and year."
    if (!venue.trim()) errors.eventLocation = "Enter the venue"
    if (!description.trim()) errors.eventDescription = "Describe the event"
    if (!saleStartDateTime) errors.ticketSaleStartDate = "Set when ticket sales open"
    if (!saleEndDateTime) errors.ticketSaleEndDate = "Set when ticket sales close"
    else if (saleStartDateTime && saleEndDateTime <= saleStartDateTime) errors.ticketSaleEndDate = "Ticket sales must close after they open"
    else if (eventEndDate && saleEndDateTime > eventEndDate) errors.ticketSaleEndDate = "Ticket sales must close by the time the event ends"
    if (!errors.ticketSaleStartDate && saleStartDateTime && eventEndDate && saleStartDateTime >= eventEndDate) {
      errors.ticketSaleStartDate = "Ticket sales must open before the event ends"
    }
    if (!uploadedImageFile) errors.eventPosterUrl = "Upload an event poster"

    setEventErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the highlighted fields")
      scrollToFirstError()
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: Upload image to Contabo
      setIsUploading(true)
      toast.info("Uploading event poster...")
      const uploadResult = await uploadToContabo(uploadedImageFile!)
      setIsUploading(false)

      if (!uploadResult.success || !uploadResult.url) {
        setEventErrors({ eventPosterUrl: uploadResult.error || "The poster couldn't be uploaded. Please try again." })
        toast.error(uploadResult.error || "Failed to upload image")
        scrollToFirstError()
        setIsSubmitting(false)
        return
      }

      // Step 2: Create the event
      toast.info("Creating event...")
      const eventResponse = await api.company.createEvent({
        eventName: eventName.trim(),
        eventDescription: description,
        eventPosterUrl: uploadResult.url,
        eventCategory: { id: parseInt(category) },
        ticketSaleStartDate: saleStartDateTime!.toISOString(),
        ticketSaleEndDate: saleEndDateTime!.toISOString(),
        eventLocation: venue,
        eventStartDate: eventStartDate!.toISOString(),
        eventEndDate: eventEndDate!.toISOString(),
        percentageComission: parseFloat(commission),
        users: { id: user.user_id },
        company: { id: user.company_id },
        slug: slug,
        currency: currency,
      })

      console.log("Event creation response:", eventResponse)

      if (!eventResponse.status) {
        throw new Error(eventResponse.message || "Failed to create event")
      }

      // The API returns event_id instead of event.id
      const eventId = (eventResponse as any).event_id || eventResponse.event?.id

      if (!eventId) {
        throw new Error("Event created but no event ID was returned")
      }

      setCreatedEventId(eventId)
      setCreatedEventName(eventName)
      toast.success("✅ Event created successfully!")

      // Move to tickets step
      setCurrentStep('tickets')
      setIsSubmitting(false)
    } catch (error) {
      console.error("Error creating event:", error)
      const message = error instanceof Error ? error.message : "Failed to create event. Please try again."
      const field = apiErrorField(error)
      setEventErrors(field && field in EVENT_FIELD_LABELS ? { [field]: message } : { form: message })
      toast.error("Couldn't create the event", { description: message })
      scrollToFirstError()
      setIsUploading(false)
      setIsSubmitting(false)
    }
  }

  const handleAddTickets = async () => {
    if (!createdEventId) {
      toast.error("Event ID is missing")
      return
    }

    // A row with nothing typed in it is ignored; a half-filled one is an
    // error, not something to drop without saying.
    const isBlank = (t: TicketType) => !t.name.trim() && !t.price && !t.quantity
    const toCreate = ticketTypes.filter((t) => !isBlank(t))

    const errors: Record<string, FieldErrors> = {}
    for (const ticket of toCreate) {
      const e: FieldErrors = {}
      const price = Number(ticket.price)
      const quantity = Number(ticket.quantity)
      const groupSize = parseInt(ticket.ticketsToIssue || "1")
      if (ticket.name.trim().length < 3) e.ticketName = "Ticket name must be at least 3 characters"
      if (ticket.price === "") e.ticketPrice = "Enter a price (0 for a free ticket)"
      else if (!Number.isFinite(price) || price < 0) e.ticketPrice = "Ticket price can't be negative"
      if (ticket.quantity === "") e.quantityAvailable = "Enter how many tickets are available"
      else if (!Number.isInteger(quantity) || quantity < 1) e.quantityAvailable = "Quantity must be a whole number of at least 1"
      if (Number(ticket.complementary || "0") < 0) e.numberOfComplementary = "Complimentary tickets can't be negative"
      if (ticket.isGroupTicket && (!groupSize || groupSize < 2)) e.ticketsToIssue = "A group must be at least 2 people"
      else if (!e.quantityAvailable && groupSize > quantity) e.ticketsToIssue = `Group size can't be more than the ${quantity} tickets available`
      if (ticket.restrictLimitPerPerson && !(parseInt(ticket.limitPerPerson) >= 1)) e.ticketLimitPerPerson = "Allow at least 1 ticket per person"
      const saleStart = ticket.saleStartDate || saleStartDateTime
      const saleEnd = ticket.saleEndDate || saleEndDateTime
      if (saleStart && saleEnd && saleEnd <= saleStart) e.ticketSaleEndDate = "Ticket sales must close after they open"
      else if (saleEnd && eventEndDate && saleEnd > eventEndDate) e.ticketSaleEndDate = "Ticket sales must close by the time the event ends"
      if (Object.keys(e).length > 0) errors[ticket.id] = e
    }

    if (toCreate.length === 0) {
      setTicketErrors({ [ticketTypes[0].id]: { ticketName: "Add at least one ticket, or choose Skip & Finish" } })
      toast.error("Please add at least one ticket type")
      scrollToFirstError()
      return
    }

    setTicketErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the highlighted ticket fields")
      scrollToFirstError()
      return
    }

    setIsSubmitting(true)

    try {
      // Create tickets one by one
      toast.info(`Creating ${toCreate.length} ticket type(s)...`)
      const created = new Set<string>()
      const failed: Record<string, FieldErrors> = {}

      for (const ticket of toCreate) {
        try {
          const price = parseFloat(ticket.price)
          await api.company.createTicket({
            event: { id: createdEventId },
            ticketName: ticket.name.trim(),
            ticketPrice: price,
            quantityAvailable: parseInt(ticket.quantity),
            ticketsToIssue: parseInt(ticket.ticketsToIssue || "1"),
            ticketLimitPerPerson: parseInt(ticket.limitPerPerson || "0"),
            numberOfComplementary: parseInt(ticket.complementary || "0"),
            ticketSaleStartDate: (ticket.saleStartDate || saleStartDateTime!).toISOString(),
            ticketSaleEndDate: (ticket.saleEndDate || saleEndDateTime!).toISOString(),
            isFree: price === 0,
          })

          created.add(ticket.id)
          toast.success(`✓ Ticket created: ${ticket.name}`)
        } catch (ticketError) {
          console.error(`Error creating ticket "${ticket.name}":`, ticketError)
          const message = ticketError instanceof Error ? ticketError.message : "Couldn't create this ticket"
          const field = apiErrorField(ticketError)
          failed[ticket.id] = field && field in TICKET_FIELDS ? { [field]: message } : { form: message }
          toast.error(`Couldn't create ${ticket.name}`, { description: message })
        }
      }

      if (Object.keys(failed).length > 0) {
        // Keep only the tickets that still need attention, so trying again
        // can't create the successful ones a second time.
        setTicketTypes((prev) => prev.filter((t) => !created.has(t.id) && !isBlank(t)))
        setTicketErrors(failed)
        if (created.size > 0) {
          toast.warning(`${created.size} of ${toCreate.length} ticket types created. Fix the rest and try again, or Skip & Finish.`)
        }
        scrollToFirstError()
        setIsSubmitting(false)
        return
      }

      toast.success(`🎉 All done! ${created.size} ticket type(s) created successfully!`)

      // Move to complete step
      setCurrentStep('complete')
      setIsSubmitting(false)

      // Redirect after a moment
      setTimeout(() => {
        router.push("/dashboard/events")
      }, 2000)
    } catch (error) {
      console.error("Error adding tickets:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to add tickets. Please try again."
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Create New Event</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          {currentStep === 'event' && "Step 1: Fill in the event details"}
          {currentStep === 'tickets' && `Step 2: Add tickets for "${createdEventName}"`}
          {currentStep === 'complete' && "Event created successfully!"}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
              currentStep === 'event' ? 'bg-zinc-700 text-white' : 'bg-green-500 text-white'
            }`}>
              {currentStep === 'event' ? '1' : <Check className="w-5 h-5" />}
            </div>
            <span className={`text-sm font-medium ${currentStep === 'event' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Event Details
            </span>
          </div>
          <div className={`h-0.5 w-16 sm:w-24 transition-all ${
            currentStep === 'event' ? 'bg-border' : 'bg-zinc-700'
          }`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
              currentStep === 'event' ? 'bg-border text-muted-foreground' : 
              currentStep === 'tickets' ? 'bg-zinc-700 text-white' : 
              'bg-green-500 text-white'
            }`}>
              {currentStep === 'complete' ? <Check className="w-5 h-5" /> : '2'}
            </div>
            <span className={`text-sm font-medium ${currentStep === 'tickets' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Add Tickets
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Event Details */}
        {currentStep === 'event' && (
          <>
        {/* Event Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <h2 className="text-xl font-bold mb-4">Event Details</h2>

          <div className="space-y-4">
            {/* Event Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => { handleEventNameChange(e.target.value); clearEventError("eventName"); clearEventError("slug") }}
                placeholder="e.g., Summer Music Festival 2026"
                className={cn("w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", eventErrors.eventName && errorInputClass)}
                required
              />
              <FieldError message={eventErrors.eventName} />
            </div>

            {/* Event Slug */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event URL Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); clearEventError("slug") }}
                placeholder="e.g., summer-music-festival-2026"
                className={cn("w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all font-mono", eventErrors.slug && errorInputClass)}
                required
              />
              <FieldError message={eventErrors.slug} />
              <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">Your event will be accessible at:</span><br />
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    https://soldoutafrica.com/{slug || 'your-event-slug'}
                  </span>
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Use only lowercase letters, numbers, and hyphens. This will be your event&apos;s unique URL.
                </p>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); clearEventError("eventCategory") }}
                className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-[center_right_1rem] bg-no-repeat pr-12"
                required
              >
                <option value="">Select a category</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <FieldError message={eventErrors.eventCategory} />
            </div>

            {/* Event Start Date & Time */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Start Date & Time <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                selected={eventStartDate}
                onChange={(date) => {
                  setEventEndDate(endAfterStartChange(eventStartDate, date, eventEndDate))
                  setEventStartDate(date)
                  clearEventError("eventStartDate"); clearEventError("eventEndDate")
                }}
                placeholderText="Select event start date and time"
                className={cn(eventErrors.eventStartDate && errorInputClass)}
              />
              <FieldError message={eventErrors.eventStartDate} />
            </div>

            {/* Event End Date & Time */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event End Date & Time <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                selected={eventEndDate}
                onChange={(date) => { setEventEndDate(date); clearEventError("eventEndDate"); clearEventError("ticketSaleEndDate"); clearEventError("ticketSaleStartDate") }}
                placeholderText="Select event end date and time"
                minDate={eventStartDate}
                className={cn(eventErrors.eventEndDate && errorInputClass)}
              />
              <FieldError message={eventErrors.eventEndDate} />
              <p className="text-xs text-muted-foreground mt-2">
                Moves with the start date. Set it later for multi-day events.
              </p>
            </div>

            {/* Currency */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-[center_right_1rem] bg-no-repeat pr-12"
                required
              >
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>

            {/* Venue */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Venue <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => { setVenue(e.target.value); clearEventError("eventLocation") }}
                  placeholder="e.g., Uhuru Gardens, Nairobi"
                  className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", eventErrors.eventLocation && errorInputClass)}
                  required
                />
              </div>
              <FieldError message={eventErrors.eventLocation} />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); clearEventError("eventDescription") }}
                placeholder="Describe your event in detail..."
                rows={5}
                className={cn("w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all resize-none", eventErrors.eventDescription && errorInputClass)}
                required
              />
              <FieldError message={eventErrors.eventDescription} />
              <p className="text-xs text-muted-foreground mt-2">
                {description.length} / 1000 characters
              </p>
            </div>

            {/* Ticket Sales Period */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium">Ticket Sales Period <span className="text-red-500">*</span></label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-2 block">Sales Start Date & Time <span className="text-red-500">*</span></label>
                  <DateTimePicker
                    selected={saleStartDateTime}
                    onChange={(date) => { setSaleStartDateTime(date); clearEventError("ticketSaleStartDate"); clearEventError("ticketSaleEndDate") }}
                    placeholderText="Select start date & time"
                    className={cn(eventErrors.ticketSaleStartDate && errorInputClass)}
                  />
                  <FieldError message={eventErrors.ticketSaleStartDate} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block">Sales End Date & Time <span className="text-red-500">*</span></label>
                  <DateTimePicker
                    selected={saleEndDateTime}
                    onChange={(date) => { setSaleEndDateTime(date); clearEventError("ticketSaleEndDate") }}
                    placeholderText="Select end date & time"
                    className={cn(eventErrors.ticketSaleEndDate && errorInputClass)}
                  />
                  <FieldError message={eventErrors.ticketSaleEndDate} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set when ticket sales should begin and end for this event
              </p>
            </div>

            {/* Event Image */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Poster <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {imagePreview ? (
                  <div className="space-y-3">
                    <div className="relative w-full rounded-xl overflow-hidden border-2 border-zinc-500 bg-black">
                      <img
                        src={imagePreview}
                        alt="Event poster preview"
                        className="w-full h-auto object-contain max-h-[600px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setUploadedImageFile(null)
                        }}
                        className="flex-1 px-4 py-2 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Remove Image
                      </button>
                      <label className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors cursor-pointer text-center flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      ✓ Your poster will be displayed exactly as shown above
                    </p>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed border-border hover:border-zinc-500 transition-colors cursor-pointer bg-secondary/30">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium mb-1">Click to upload event poster</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 10MB</p>
                    <p className="text-xs text-muted-foreground mt-2 px-4 text-center">
                      Recommended: 1080x1080px or 1920x1080px
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <FieldError message={eventErrors.eventPosterUrl} />
            </div>
          </div>
        </motion.div>

        <FormError message={eventErrors.form} />

        {/* Form Actions for Event Step */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 pt-4"
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard/events")}
            className="flex-1 sm:flex-none px-6 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-auto px-6 py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating Event..." : "Create Event & Continue"}
          </button>
        </motion.div>
        </>
        )}

        {/* Step 2: Add Tickets */}
        {currentStep === 'tickets' && (
          <>
        {/* Ticket Types Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
            <div>
              <h2 className="text-xl font-bold">Ticket Types</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add different ticket types with prices and quantities
              </p>
            </div>
            <button
              type="button"
              onClick={addTicketType}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer w-full sm:w-auto whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Ticket Type
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
            {ticketTypes.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                ref={(el) => {
                  if (el) ticketRefs.current.set(ticket.id, el)
                  else ticketRefs.current.delete(ticket.id)
                }}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`p-4 rounded-xl border bg-secondary/30 relative transition-colors ${
                  newTicketId === ticket.id
                    ? "border-zinc-500 ring-2 ring-zinc-400/30"
                    : "border-border"
                }`}
              >
                {ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTicketType(ticket.id)}
                    className="absolute top-4 right-4 p-1.5 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="space-y-3 pr-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">
                        Ticket Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ticket.name}
                        onChange={(e) =>
                          updateTicketType(ticket.id, "name", e.target.value)
                        }
                        placeholder="e.g., VIP Pass"
                        className={cn("w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all", ticketErrors[ticket.id]?.ticketName && errorInputClass)}
                      />
                      <FieldError message={ticketErrors[ticket.id]?.ticketName} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">
                        Price ({currency}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={ticket.price}
                        onChange={(e) =>
                          updateTicketType(ticket.id, "price", e.target.value)
                        }
                        placeholder="e.g., 2500"
                        min="0"
                        step="0.01"
                        className={cn("w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all", ticketErrors[ticket.id]?.ticketPrice && errorInputClass)}
                      />
                      <FieldError message={ticketErrors[ticket.id]?.ticketPrice} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={ticket.quantity}
                        onChange={(e) =>
                          updateTicketType(ticket.id, "quantity", e.target.value)
                        }
                        placeholder="e.g., 100"
                        min="1"
                        className={cn("w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all", ticketErrors[ticket.id]?.quantityAvailable && errorInputClass)}
                      />
                      <FieldError message={ticketErrors[ticket.id]?.quantityAvailable} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">
                        Complementary Tickets
                      </label>
                      <input
                        type="number"
                        value={ticket.complementary}
                        onChange={(e) =>
                          updateTicketType(ticket.id, "complementary", e.target.value)
                        }
                        placeholder="e.g., 10"
                        min="0"
                        className={cn("w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all", ticketErrors[ticket.id]?.numberOfComplementary && errorInputClass)}
                      />
                      <FieldError message={ticketErrors[ticket.id]?.numberOfComplementary} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Group ticket toggle */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ticket.isGroupTicket}
                          onChange={(e) =>
                            patchTicketType(ticket.id, {
                              isGroupTicket: e.target.checked,
                              ticketsToIssue: e.target.checked ? "2" : "1",
                            })
                          }
                          className="w-4 h-4 rounded border-border text-zinc-300 focus:ring-brand focus:ring-offset-0"
                        />
                        <span className="text-xs font-medium">Group ticket</span>
                      </label>
                      {!ticket.isGroupTicket && (
                        <p className="text-xs text-muted-foreground">
                          {TICKET_FIELD_HELP.groupOff}
                        </p>
                      )}
                      {ticket.isGroupTicket && (
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Group of</label>
                          <input
                            type="number"
                            value={ticket.ticketsToIssue}
                            onChange={(e) =>
                              updateTicketType(ticket.id, "ticketsToIssue", e.target.value)
                            }
                            min="2"
                            className={cn("w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all", ticketErrors[ticket.id]?.ticketsToIssue && errorInputClass)}
                          />
                          <FieldError message={ticketErrors[ticket.id]?.ticketsToIssue} />
                          <p className="text-xs text-muted-foreground mt-1">
                            {TICKET_FIELD_HELP.groupOn}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Restrict tickets per person toggle */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ticket.restrictLimitPerPerson}
                          onChange={(e) =>
                            patchTicketType(ticket.id, {
                              restrictLimitPerPerson: e.target.checked,
                              limitPerPerson: e.target.checked ? "1" : "0",
                            })
                          }
                          className="w-4 h-4 rounded border-border text-zinc-300 focus:ring-brand focus:ring-offset-0"
                        />
                        <span className="text-xs font-medium">Restrict tickets per person</span>
                      </label>
                      {!ticket.restrictLimitPerPerson && (
                        <p className="text-xs text-muted-foreground">
                          {TICKET_FIELD_HELP.limitOff}
                        </p>
                      )}
                      {ticket.restrictLimitPerPerson && (
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Limit to</label>
                          <input
                            type="number"
                            value={ticket.limitPerPerson}
                            onChange={(e) =>
                              updateTicketType(ticket.id, "limitPerPerson", e.target.value)
                            }
                            min="1"
                            className={cn("w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all", ticketErrors[ticket.id]?.ticketLimitPerPerson && errorInputClass)}
                          />
                          <FieldError message={ticketErrors[ticket.id]?.ticketLimitPerPerson} />
                          <p className="text-xs text-muted-foreground mt-1">
                            {TICKET_FIELD_HELP.limitOn}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={ticket.description}
                      onChange={(e) =>
                        updateTicketType(ticket.id, "description", e.target.value)
                      }
                      placeholder="e.g., Includes backstage access"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
                    />
                  </div>

                  {/* Ticket Sale Period */}
                  <div className="pt-2 border-t border-border">
                    <label className="text-xs font-medium mb-2 block text-muted-foreground">
                      Ticket Sale Period (Optional - overrides event sale period)
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs mb-1.5 block opacity-75">Sale Start Date & Time</label>
                        <DateTimePicker
                          selected={ticket.saleStartDate}
                          onChange={(date) => updateTicketType(ticket.id, "saleStartDate", date)}
                          placeholderText="Select start date & time"
                          className={cn("h-9 text-xs", ticketErrors[ticket.id]?.ticketSaleStartDate && errorInputClass)}
                        />
                        <FieldError message={ticketErrors[ticket.id]?.ticketSaleStartDate} />
                      </div>
                      <div>
                        <label className="text-xs mb-1.5 block opacity-75">Sale End Date & Time</label>
                        <DateTimePicker
                          selected={ticket.saleEndDate}
                          onChange={(date) => updateTicketType(ticket.id, "saleEndDate", date)}
                          placeholderText="Select end date & time"
                          className={cn("h-9 text-xs", ticketErrors[ticket.id]?.ticketSaleEndDate && errorInputClass)}
                        />
                        <FieldError message={ticketErrors[ticket.id]?.ticketSaleEndDate} />
                      </div>
                    </div>
                  </div>
                  <FormError message={ticketErrors[ticket.id]?.form} />
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <span className="font-semibold">Tip:</span> Create different ticket types to cater to different audiences. VIP, Early Bird, and General Admission are common options.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 pt-4"
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard/events")}
            className="flex-1 sm:flex-none px-6 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
          >
            Skip & Finish
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-auto px-6 py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding Tickets..." : "Add Tickets & Complete"}
          </button>
        </motion.div>
        </>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-8 text-center"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Event Created Successfully!</h2>
            <p className="text-muted-foreground mb-6">
              Your event &ldquo;{createdEventName}&rdquo; is now live and ready for ticket sales.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting you to events page...
            </p>
          </motion.div>
        )}
      </form>
    </div>
  )
}

