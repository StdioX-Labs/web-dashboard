import type Anthropic from '@anthropic-ai/sdk'
import { EVENT_CATEGORIES } from '@/lib/event-categories'
import { formatPhoneNumber } from '@/lib/phone'

/**
 * The assistant's tools, shared by the chat route (which runs reads and
 * proposes writes) and the browser (which shows a confirm card and runs a
 * write only after the organizer clicks Confirm).
 *
 * Each tool wraps one of the dashboard's own API routes. The acting
 * organizer's userId/companyId are never tool inputs: they come from the
 * session, so the model can't act as anyone else.
 */

export const READ_TOOLS = [
  'list_events',
  'get_event',
  'list_attendees',
  'list_transactions',
  'list_promo_codes',
  'list_flash_sales',
  'list_affiliates',
  'list_users',
] as const

export const WRITE_TOOLS = [
  'create_event',
  'update_event',
  'create_promo_code',
  'create_flash_sale',
  'add_user',
  'issue_complimentary',
] as const

export type ReadToolName = (typeof READ_TOOLS)[number]
export type WriteToolName = (typeof WRITE_TOOLS)[number]

export function isWriteTool(name: string): name is WriteToolName {
  return (WRITE_TOOLS as readonly string[]).includes(name)
}

export function isReadTool(name: string): name is ReadToolName {
  return (READ_TOOLS as readonly string[]).includes(name)
}

// Nairobi wall-clock time as the model writes it: 2026-12-24T18:00
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/
const localDateTime = (description: string) => ({
  type: 'string',
  description: `${description}. Nairobi time, YYYY-MM-DDTHH:mm, no offset.`,
})

const eventId = { type: 'integer', description: 'Event id from list_events.' }
const ticketId = { type: 'integer', description: 'Ticket type id from list_events or get_event.' }

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  // ---- Reads: run straight away ----
  {
    name: 'list_events',
    description:
      "Every event the organizer's company owns, with dates, status, tickets sold, revenue and each ticket type (id, price, remaining stock, paid and complimentary counts). Start here to find event and ticket ids.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_event',
    description: 'Full configuration of one event: description, poster, category, every ticket type with its sale window and limits.',
    input_schema: { type: 'object', properties: { eventId }, required: ['eventId'] },
  },
  {
    name: 'list_attendees',
    description:
      'Tickets issued for an event: buyer name, phone, email, ticket type, price paid, complimentary or not, scanned or not, and the promotion that discounted it (promotionType PROMO_CODE / FLASH_SALE / DISCOUNT_LINK and promotionCode). Use the filters to answer "who used promo X". Returns totals plus up to `limit` rows.',
    input_schema: {
      type: 'object',
      properties: {
        eventId,
        promotionCode: { type: 'string', description: 'Only tickets discounted by this promo code, discount link code or flash sale name (case-insensitive).' },
        ticketName: { type: 'string', description: 'Only this ticket type (case-insensitive).' },
        complementaryOnly: { type: 'boolean' },
        limit: { type: 'integer', description: 'Rows to return, default 100, max 300.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'list_transactions',
    description: 'Ticket sale transactions for an event with totals (tickets sold, total sales). Paged, 50 per page, newest first.',
    input_schema: {
      type: 'object',
      properties: { eventId, page: { type: 'integer', description: 'Zero-based page, default 0.' } },
      required: ['eventId'],
    },
  },
  {
    name: 'list_promo_codes',
    description: "The company's promo codes with discount, validity window (Nairobi time), max uses and current uses. Optionally only one event's.",
    input_schema: { type: 'object', properties: { eventId } },
  },
  {
    name: 'list_flash_sales',
    description: "The company's flash sales with sale price, window (Nairobi time), max quantity and sold quantity. Optionally only one event's.",
    input_schema: { type: 'object', properties: { eventId } },
  },
  {
    name: 'list_affiliates',
    description: "An event's affiliates with their links, sales and commission.",
    input_schema: { type: 'object', properties: { eventId }, required: ['eventId'] },
  },
  {
    name: 'list_users',
    description: "The organizer's teammates: name, email, phone, role and whether active.",
    input_schema: { type: 'object', properties: {} },
  },

  // ---- Writes: the organizer confirms each one in the UI first ----
  {
    name: 'create_event',
    description:
      'Create a new event with its ticket types. The poster is the image the organizer attached in the chat; ask them to attach one if they have not. The organizer sees a summary and must confirm before anything is created.',
    input_schema: {
      type: 'object',
      properties: {
        eventName: { type: 'string', description: '2 to 50 characters.' },
        description: { type: 'string' },
        location: { type: 'string', description: 'Venue and area.' },
        categoryId: {
          type: 'integer',
          description: `One of: ${EVENT_CATEGORIES.map((c) => `${c.id} ${c.label}`).join('; ')}.`,
        },
        startsAt: localDateTime('When the event starts'),
        endsAt: localDateTime('When the event ends; after it starts'),
        salesStartAt: localDateTime('When ticket sales open'),
        salesEndAt: localDateTime('When ticket sales close; no later than the event end'),
        currency: { type: 'string', description: "ISO code, defaults to the company's currency." },
        slug: { type: 'string', description: 'URL slug: lowercase letters, numbers, hyphens. Defaults to one made from the name.' },
        tickets: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number', description: '0 for a free ticket.' },
              quantity: { type: 'integer', description: 'Number of sales available.' },
              ticketsToIssue: { type: 'integer', description: 'Tickets issued per sale, e.g. 5 for a group of 5. Default 1.' },
              limitPerPerson: { type: 'integer', description: 'Max per buyer, 0 for no limit. Default 0.' },
            },
            required: ['name', 'price', 'quantity'],
          },
        },
      },
      required: ['eventName', 'description', 'location', 'categoryId', 'startsAt', 'endsAt', 'salesStartAt', 'salesEndAt', 'tickets'],
    },
  },
  {
    name: 'update_event',
    description:
      'Change details of an existing event. Send only the fields that change. Set usePoster to replace the poster with the image attached in the chat. Ticket types are not edited here. The organizer confirms first.',
    input_schema: {
      type: 'object',
      properties: {
        eventId,
        eventName: { type: 'string' },
        description: { type: 'string' },
        location: { type: 'string' },
        categoryId: { type: 'integer' },
        startsAt: localDateTime('New start'),
        endsAt: localDateTime('New end'),
        salesStartAt: localDateTime('New ticket sales start'),
        salesEndAt: localDateTime('New ticket sales end'),
        usePoster: { type: 'boolean', description: 'Replace the poster with the attached image.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'create_promo_code',
    description:
      'Create one named promo code, or generate a batch of random codes. Scope EVENT applies to every ticket of one event, TICKET to one ticket type, COMPANY to every event. The organizer confirms first.',
    input_schema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['EVENT', 'TICKET', 'COMPANY'] },
        eventId: { ...eventId, description: 'Required for EVENT and TICKET scope.' },
        ticketId: { ...ticketId, description: 'Required for TICKET scope.' },
        discountType: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
        discountValue: { type: 'number', description: 'Percent off (1-100) or amount off in the event currency.' },
        validFrom: localDateTime('When the code starts working'),
        validUntil: localDateTime('When the code stops working'),
        maxUses: { type: 'integer', description: 'Uses allowed per code.' },
        promoCode: { type: 'string', description: 'The code itself, for a single named code.' },
        numberOfPromoCodes: { type: 'integer', description: 'How many random codes to generate (1-250), instead of promoCode.' },
      },
      required: ['scope', 'discountType', 'discountValue', 'validFrom', 'validUntil', 'maxUses'],
    },
  },
  {
    name: 'create_flash_sale',
    description: 'Drop one ticket type to a sale price for a time window, for up to maxQuantity tickets. The organizer confirms first.',
    input_schema: {
      type: 'object',
      properties: {
        eventId,
        ticketId,
        name: { type: 'string', description: 'Flash sale name shown to buyers.' },
        salePrice: { type: 'number', description: 'Price during the sale; below the normal price.' },
        startTime: localDateTime('When the sale starts'),
        endTime: localDateTime('When the sale ends'),
        maxQuantity: { type: 'integer', description: 'Tickets available at the sale price.' },
      },
      required: ['eventId', 'ticketId', 'name', 'salePrice', 'startTime', 'endTime', 'maxQuantity'],
    },
  },
  {
    name: 'add_user',
    description: "Add a teammate to the organizer's company. STAFF can view attendees and scan tickets; COMPANY_OWNER has full access including withdrawals. The organizer confirms first.",
    input_schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string' },
        mobileNumber: { type: 'string', description: 'Kenyan mobile, e.g. 0712345678 or 254712345678.' },
        idNumber: { type: 'string', description: 'National ID, 6 to 12 characters. Optional.' },
        role: { type: 'string', enum: ['STAFF', 'COMPANY_OWNER'] },
      },
      required: ['fullName', 'email', 'mobileNumber', 'role'],
    },
  },
  {
    name: 'issue_complimentary',
    description: 'Issue free (complimentary) tickets of one ticket type to one recipient, sent to their phone and email. The organizer confirms first.',
    input_schema: {
      type: 'object',
      properties: {
        eventId,
        ticketId,
        quantity: { type: 'integer', description: '1 or more.' },
        mobileNumber: { type: 'string', description: 'Recipient Kenyan mobile.' },
        email: { type: 'string', description: 'Recipient email.' },
      },
      required: ['eventId', 'ticketId', 'quantity', 'mobileNumber', 'email'],
    },
  },
]

// ---- Inputs ----

export interface CreateEventInput {
  eventName: string
  description: string
  location: string
  categoryId: number
  startsAt: string
  endsAt: string
  salesStartAt: string
  salesEndAt: string
  currency?: string
  slug?: string
  tickets: Array<{ name: string; price: number; quantity: number; ticketsToIssue?: number; limitPerPerson?: number }>
}

export interface UpdateEventInput {
  eventId: number
  eventName?: string
  description?: string
  location?: string
  categoryId?: number
  startsAt?: string
  endsAt?: string
  salesStartAt?: string
  salesEndAt?: string
  usePoster?: boolean
}

export interface CreatePromoCodeInput {
  scope: 'EVENT' | 'TICKET' | 'COMPANY'
  eventId?: number
  ticketId?: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  validFrom: string
  validUntil: string
  maxUses: number
  promoCode?: string
  numberOfPromoCodes?: number
}

export interface CreateFlashSaleInput {
  eventId: number
  ticketId: number
  name: string
  salePrice: number
  startTime: string
  endTime: string
  maxQuantity: number
}

export interface AddUserInput {
  fullName: string
  email: string
  mobileNumber: string
  idNumber?: string
  role: 'STAFF' | 'COMPANY_OWNER'
}

export interface IssueComplimentaryInput {
  eventId: number
  ticketId: number
  quantity: number
  mobileNumber: string
  email: string
}

export interface WriteInputs {
  create_event: CreateEventInput
  update_event: UpdateEventInput
  create_promo_code: CreatePromoCodeInput
  create_flash_sale: CreateFlashSaleInput
  add_user: AddUserInput
  issue_complimentary: IssueComplimentaryInput
}

/**
 * What the chat route looked up about the ids in a proposed write, so the
 * confirm card can name the event and ticket rather than show bare ids.
 */
export interface ActionContext {
  eventName?: string
  ticketName?: string
  ticketPrice?: number
  currency?: string
  /** update_event: the values being replaced. */
  current?: Record<string, string | undefined>
}

/** A write the model asked for, waiting on the organizer's click. */
export interface PendingAction {
  toolUseId: string
  name: WriteToolName
  input: Record<string, unknown>
  context: ActionContext
}

// ---- Dates ----

/** Nairobi wall-clock (YYYY-MM-DDTHH:mm) to the zone-less LocalDateTime the promotion endpoints store. */
export function toLocalDateTime(value: string): string {
  return value.length === 16 ? `${value}:00` : value
}

/** Nairobi wall-clock to an ISO instant, for the event endpoints. Nairobi is UTC+3 all year. */
export function nairobiToIso(value: string): string {
  return new Date(`${toLocalDateTime(value)}+03:00`).toISOString()
}

/** An ISO instant (or zone-less Nairobi time) shown as Nairobi wall-clock. */
export function formatNairobi(value: string | undefined | null): string {
  if (!value) return '—'
  const date = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? new Date(value) : new Date(`${toLocalDateTime(value)}+03:00`)
  if (isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ---- Validation ----

/**
 * Checks a write's input before a confirm card is shown, so the model gets a
 * clear reason to fix rather than the organizer confirming something the API
 * will reject. Returns the problems, empty when it is fine.
 */
export function validateWrite(name: WriteToolName, raw: Record<string, unknown>): string[] {
  const problems: string[] = []
  const str = (key: string, required = true) => {
    const v = raw[key]
    if (v === undefined || v === null || v === '') {
      if (required) problems.push(`${key} is required`)
      return
    }
    if (typeof v !== 'string') problems.push(`${key} must be a string`)
  }
  const num = (key: string, { required = true, min, integer = false }: { required?: boolean; min?: number; integer?: boolean } = {}) => {
    const v = raw[key]
    if (v === undefined || v === null) {
      if (required) problems.push(`${key} is required`)
      return
    }
    if (typeof v !== 'number' || !isFinite(v)) problems.push(`${key} must be a number`)
    else if (integer && !Number.isInteger(v)) problems.push(`${key} must be a whole number`)
    else if (min !== undefined && v < min) problems.push(`${key} must be at least ${min}`)
  }
  const date = (key: string, required = true) => {
    const v = raw[key]
    if (v === undefined || v === null || v === '') {
      if (required) problems.push(`${key} is required`)
      return
    }
    if (typeof v !== 'string' || !LOCAL_DATE_TIME.test(v) || isNaN(new Date(`${toLocalDateTime(v)}+03:00`).getTime())) {
      problems.push(`${key} must be a Nairobi time like 2026-12-24T18:00`)
    }
  }
  const before = (a: string, b: string, message: string) => {
    const x = raw[a], y = raw[b]
    if (typeof x === 'string' && typeof y === 'string' && LOCAL_DATE_TIME.test(x) && LOCAL_DATE_TIME.test(y)) {
      if (nairobiToIso(x) >= nairobiToIso(y)) problems.push(message)
    }
  }
  const category = (required: boolean) => {
    num('categoryId', { required, integer: true })
    if (typeof raw.categoryId === 'number' && !EVENT_CATEGORIES.some((c) => c.id === raw.categoryId)) {
      problems.push('categoryId is not a known category')
    }
  }
  const phone = (key: string) => {
    str(key)
    if (typeof raw[key] === 'string' && !/^254\d{9}$/.test(formatPhoneNumber(raw[key] as string))) {
      problems.push(`${key} must be a Kenyan mobile number, 254 followed by 9 digits`)
    }
  }
  const email = (key: string) => {
    str(key)
    if (typeof raw[key] === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw[key] as string)) {
      problems.push(`${key} is not a valid email address`)
    }
  }

  switch (name) {
    case 'create_event': {
      str('eventName')
      if (typeof raw.eventName === 'string' && (raw.eventName.trim().length < 2 || raw.eventName.trim().length > 50)) {
        problems.push('eventName must be 2 to 50 characters')
      }
      str('description')
      str('location')
      category(true)
      date('startsAt'); date('endsAt'); date('salesStartAt'); date('salesEndAt')
      before('startsAt', 'endsAt', 'The event must end after it starts')
      before('salesStartAt', 'salesEndAt', 'Ticket sales must close after they open')
      if (typeof raw.salesEndAt === 'string' && typeof raw.endsAt === 'string' && LOCAL_DATE_TIME.test(raw.salesEndAt) && LOCAL_DATE_TIME.test(raw.endsAt) && nairobiToIso(raw.salesEndAt) > nairobiToIso(raw.endsAt)) {
        problems.push('Ticket sales must close by the time the event ends')
      }
      if (raw.slug !== undefined && (typeof raw.slug !== 'string' || !/^[a-z0-9-]+$/.test(raw.slug))) {
        problems.push('slug may use only lowercase letters, numbers and hyphens')
      }
      const tickets = raw.tickets
      if (!Array.isArray(tickets) || tickets.length === 0) problems.push('At least one ticket type is required')
      else tickets.forEach((t, i) => {
        const ticket = t as Record<string, unknown>
        if (typeof ticket.name !== 'string' || !ticket.name.trim()) problems.push(`tickets[${i}].name is required`)
        if (typeof ticket.price !== 'number' || ticket.price < 0) problems.push(`tickets[${i}].price must be 0 or more`)
        if (typeof ticket.quantity !== 'number' || !Number.isInteger(ticket.quantity) || ticket.quantity < 1) problems.push(`tickets[${i}].quantity must be a whole number of at least 1`)
      })
      break
    }
    case 'update_event': {
      num('eventId', { integer: true })
      str('eventName', false); str('description', false); str('location', false)
      category(false)
      date('startsAt', false); date('endsAt', false); date('salesStartAt', false); date('salesEndAt', false)
      before('startsAt', 'endsAt', 'The event must end after it starts')
      before('salesStartAt', 'salesEndAt', 'Ticket sales must close after they open')
      const changes = ['eventName', 'description', 'location', 'categoryId', 'startsAt', 'endsAt', 'salesStartAt', 'salesEndAt', 'usePoster']
      if (!changes.some((k) => raw[k] !== undefined && raw[k] !== false)) problems.push('Nothing to change')
      break
    }
    case 'create_promo_code': {
      if (!['EVENT', 'TICKET', 'COMPANY'].includes(raw.scope as string)) problems.push('scope must be EVENT, TICKET or COMPANY')
      if (raw.scope === 'EVENT' || raw.scope === 'TICKET') num('eventId', { integer: true })
      if (raw.scope === 'TICKET') num('ticketId', { integer: true })
      if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(raw.discountType as string)) problems.push('discountType must be PERCENTAGE or FIXED_AMOUNT')
      num('discountValue', { min: 0 })
      if (raw.discountType === 'PERCENTAGE' && typeof raw.discountValue === 'number' && (raw.discountValue <= 0 || raw.discountValue > 100)) {
        problems.push('A percentage discount must be between 1 and 100')
      }
      date('validFrom'); date('validUntil')
      before('validFrom', 'validUntil', 'validUntil must be after validFrom')
      num('maxUses', { integer: true, min: 1 })
      if (!raw.promoCode && !raw.numberOfPromoCodes) problems.push('Give a promoCode, or numberOfPromoCodes to generate')
      if (raw.promoCode && raw.numberOfPromoCodes) problems.push('Give either promoCode or numberOfPromoCodes, not both')
      num('numberOfPromoCodes', { required: false, integer: true, min: 1 })
      if (typeof raw.numberOfPromoCodes === 'number' && raw.numberOfPromoCodes > 250) problems.push('numberOfPromoCodes can be at most 250')
      break
    }
    case 'create_flash_sale': {
      num('eventId', { integer: true }); num('ticketId', { integer: true })
      str('name')
      num('salePrice', { min: 0 })
      date('startTime'); date('endTime')
      before('startTime', 'endTime', 'endTime must be after startTime')
      num('maxQuantity', { integer: true, min: 1 })
      break
    }
    case 'add_user': {
      str('fullName')
      email('email')
      phone('mobileNumber')
      if (typeof raw.idNumber === 'string' && raw.idNumber && (raw.idNumber.length < 6 || raw.idNumber.length > 12)) {
        problems.push('idNumber must be 6 to 12 characters')
      }
      if (!['STAFF', 'COMPANY_OWNER'].includes(raw.role as string)) problems.push('role must be STAFF or COMPANY_OWNER')
      break
    }
    case 'issue_complimentary': {
      num('eventId', { integer: true }); num('ticketId', { integer: true })
      num('quantity', { integer: true, min: 1 })
      phone('mobileNumber')
      email('email')
      break
    }
  }
  return problems
}

// ---- Confirm card ----

export interface ActionSummary {
  title: string
  rows: Array<[label: string, value: string]>
  /** Extra lines under the rows, e.g. one per ticket type. */
  lines?: string[]
  needsPoster?: boolean
}

const money = (amount: number, currency = 'KES') => `${currency} ${amount.toLocaleString('en-KE')}`

/**
 * What exactly will happen, built from the same input the write will send,
 * never from the model's prose.
 */
export function summarizeAction(action: PendingAction, companyCurrency = 'KES'): ActionSummary {
  const { context } = action
  const currency = context.currency || companyCurrency
  const eventLabel = (id: unknown) => (context.eventName ? `${context.eventName} (#${id})` : `#${id}`)
  const ticketLabel = (id: unknown) => (context.ticketName ? `${context.ticketName} (#${id})` : `#${id}`)

  switch (action.name) {
    case 'create_event': {
      const i = action.input as unknown as CreateEventInput
      const eventCurrency = i.currency || companyCurrency
      return {
        title: 'Create event',
        rows: [
          ['Name', i.eventName],
          ['Venue', i.location],
          ['Category', EVENT_CATEGORIES.find((c) => c.id === i.categoryId)?.label ?? String(i.categoryId)],
          ['Starts', formatNairobi(i.startsAt)],
          ['Ends', formatNairobi(i.endsAt)],
          ['Sales open', formatNairobi(i.salesStartAt)],
          ['Sales close', formatNairobi(i.salesEndAt)],
          ['Link', `soldoutafrica.com/${i.slug || slugify(i.eventName)}`],
          ['Description', i.description],
        ],
        lines: i.tickets.map((t) => {
          const group = t.ticketsToIssue && t.ticketsToIssue > 1 ? `, ${t.ticketsToIssue} tickets per sale` : ''
          const limit = t.limitPerPerson ? `, max ${t.limitPerPerson} per buyer` : ''
          return `${t.name}: ${t.price === 0 ? 'Free' : money(t.price, eventCurrency)} × ${t.quantity}${group}${limit}`
        }),
        needsPoster: true,
      }
    }
    case 'update_event': {
      const i = action.input as unknown as UpdateEventInput
      const current = context.current ?? {}
      const change = (label: string, key: string, next: string | undefined, show = (v?: string) => v ?? '—') =>
        next === undefined ? null : ([label, `${show(current[key])} → ${show(next)}`] as [string, string])
      const category = (id?: string | number) => (id === undefined ? undefined : EVENT_CATEGORIES.find((c) => c.id === Number(id))?.label ?? String(id))
      const rows = [
        ['Event', eventLabel(i.eventId)] as [string, string],
        change('Name', 'eventName', i.eventName),
        change('Venue', 'location', i.location),
        i.categoryId === undefined ? null : (['Category', `${category(current.categoryId) ?? '—'} → ${category(i.categoryId)}`] as [string, string]),
        change('Starts', 'startsAt', i.startsAt, formatNairobi),
        change('Ends', 'endsAt', i.endsAt, formatNairobi),
        change('Sales open', 'salesStartAt', i.salesStartAt, formatNairobi),
        change('Sales close', 'salesEndAt', i.salesEndAt, formatNairobi),
        i.description === undefined ? null : (['New description', i.description] as [string, string]),
      ].filter((r): r is [string, string] => r !== null)
      return { title: 'Update event', rows, needsPoster: i.usePoster === true }
    }
    case 'create_promo_code': {
      const i = action.input as unknown as CreatePromoCodeInput
      const appliesTo =
        i.scope === 'COMPANY' ? 'Every event' : i.scope === 'EVENT' ? `All tickets of ${eventLabel(i.eventId)}` : `${ticketLabel(i.ticketId)} at ${eventLabel(i.eventId)}`
      return {
        title: i.numberOfPromoCodes ? `Generate ${i.numberOfPromoCodes} promo code${i.numberOfPromoCodes === 1 ? '' : 's'}` : 'Create promo code',
        rows: [
          ...(i.promoCode ? [['Code', i.promoCode] as [string, string]] : []),
          ['Discount', i.discountType === 'PERCENTAGE' ? `${i.discountValue}% off` : `${money(i.discountValue, currency)} off`],
          ['Applies to', appliesTo],
          ['Valid from', formatNairobi(i.validFrom)],
          ['Valid until', formatNairobi(i.validUntil)],
          ['Max uses', `${i.maxUses}${i.numberOfPromoCodes ? ' per code' : ''}`],
        ],
      }
    }
    case 'create_flash_sale': {
      const i = action.input as unknown as CreateFlashSaleInput
      return {
        title: 'Create flash sale',
        rows: [
          ['Name', i.name],
          ['Event', eventLabel(i.eventId)],
          ['Ticket', ticketLabel(i.ticketId)],
          ['Price', context.ticketPrice !== undefined ? `${money(context.ticketPrice, currency)} → ${money(i.salePrice, currency)}` : money(i.salePrice, currency)],
          ['Starts', formatNairobi(i.startTime)],
          ['Ends', formatNairobi(i.endTime)],
          ['Tickets at this price', String(i.maxQuantity)],
        ],
      }
    }
    case 'add_user': {
      const i = action.input as unknown as AddUserInput
      return {
        title: 'Add teammate',
        rows: [
          ['Name', i.fullName],
          ['Email', i.email.trim().toLowerCase()],
          ['Phone', formatPhoneNumber(i.mobileNumber)],
          ...(i.idNumber ? [['ID number', i.idNumber] as [string, string]] : []),
          ['Role', i.role === 'COMPANY_OWNER' ? 'Company Owner (full access, including withdrawals)' : 'Event Staff (view attendees, scan tickets)'],
        ],
      }
    }
    case 'issue_complimentary': {
      const i = action.input as unknown as IssueComplimentaryInput
      return {
        title: 'Issue complimentary tickets',
        rows: [
          ['Event', eventLabel(i.eventId)],
          ['Ticket', ticketLabel(i.ticketId)],
          ['Quantity', String(i.quantity)],
          ['Send to phone', formatPhoneNumber(i.mobileNumber)],
          ['Send to email', i.email.trim().toLowerCase()],
        ],
      }
    }
  }
}
