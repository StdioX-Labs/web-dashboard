import { api, apiErrorField } from '@/lib/api-client'
import { uploadToContabo } from '@/lib/contabo-uploader'
import { formatPhoneNumber } from '@/lib/phone'
import type { UserSession } from '@/lib/session-manager'
import {
  nairobiToIso,
  slugify,
  toLocalDateTime,
  type AddUserInput,
  type CreateEventInput,
  type CreateFlashSaleInput,
  type CreatePromoCodeInput,
  type IssueComplimentaryInput,
  type PendingAction,
  type UpdateEventInput,
} from '@/lib/assistant/tools'

/**
 * Runs a write the organizer has confirmed, in the browser, through the same
 * api-client calls the dashboard's forms make, so the same routes, validation
 * and error messages apply. Nothing here runs without a click on Confirm.
 */

// Same default the Users page gives teammates it adds.
const DEFAULT_TEAMMATE_PASSWORD = 's0ascAnn3r@56YearsLater!'

export interface WriteOutcome {
  ok: boolean
  /** Shown on the card and sent back to the assistant. */
  message: string
  /** Extra facts for the assistant, e.g. the new event's id or generated codes. */
  details?: Record<string, unknown>
}

function failure(error: unknown, fallback: string): WriteOutcome {
  const message = error instanceof Error && error.message ? error.message : fallback
  const field = apiErrorField(error)
  return { ok: false, message, details: field ? { field } : undefined }
}

async function uploadPoster(poster: File | null): Promise<string> {
  if (!poster) throw new Error('Attach a poster image in the chat first.')
  const result = await uploadToContabo(poster)
  if (!result.success || !result.url) throw new Error(result.error || 'Failed to upload the poster')
  return result.url
}

async function createEvent(input: CreateEventInput, user: UserSession, poster: File | null): Promise<WriteOutcome> {
  let posterUrl: string
  try {
    posterUrl = await uploadPoster(poster)
  } catch (error) {
    return failure(error, 'Failed to upload the poster')
  }

  const salesStart = nairobiToIso(input.salesStartAt)
  const salesEnd = nairobiToIso(input.salesEndAt)
  let eventId: number | undefined
  try {
    const response = await api.company.createEvent({
      eventName: input.eventName.trim(),
      eventDescription: input.description,
      eventPosterUrl: posterUrl,
      eventCategory: { id: input.categoryId },
      ticketSaleStartDate: salesStart,
      ticketSaleEndDate: salesEnd,
      eventLocation: input.location,
      eventStartDate: nairobiToIso(input.startsAt),
      eventEndDate: nairobiToIso(input.endsAt),
      percentageComission: 5.0,
      users: { id: user.user_id },
      company: { id: user.company_id },
      slug: input.slug || slugify(input.eventName),
      currency: input.currency || user.currency || 'KES',
    })
    if (!response.status) throw new Error(response.message || 'Failed to create event')
    // The API returns event_id rather than event.id
    eventId = (response as { event_id?: number }).event_id ?? response.event?.id
    if (!eventId) throw new Error('The event was created but the API did not return its id')
  } catch (error) {
    return failure(error, 'Failed to create event')
  }

  const createdTickets: string[] = []
  const failedTickets: Array<{ ticket: string; error: string }> = []
  for (const ticket of input.tickets) {
    try {
      await api.company.createTicket({
        event: { id: eventId },
        ticketName: ticket.name.trim(),
        ticketPrice: ticket.price,
        quantityAvailable: ticket.quantity,
        ticketsToIssue: ticket.ticketsToIssue || 1,
        ticketLimitPerPerson: ticket.limitPerPerson || 0,
        numberOfComplementary: 0,
        ticketSaleStartDate: salesStart,
        ticketSaleEndDate: salesEnd,
        isFree: ticket.price === 0,
      })
      createdTickets.push(ticket.name)
    } catch (error) {
      failedTickets.push({ ticket: ticket.name, error: error instanceof Error ? error.message : "Couldn't create this ticket" })
    }
  }

  if (failedTickets.length > 0) {
    return {
      ok: false,
      message: `Event created (#${eventId}), but ${failedTickets.length} ticket type(s) failed: ${failedTickets.map((f) => `${f.ticket}: ${f.error}`).join('; ')}`,
      details: { eventId, createdTickets, failedTickets, eventCreated: true },
    }
  }
  return { ok: true, message: `Event created with ${createdTickets.length} ticket type(s).`, details: { eventId, createdTickets } }
}

async function updateEvent(input: UpdateEventInput, poster: File | null): Promise<WriteOutcome> {
  const body: Record<string, unknown> = {}
  if (input.eventName !== undefined) body.eventName = input.eventName.trim()
  if (input.description !== undefined) body.eventDescription = input.description
  if (input.location !== undefined) body.eventLocation = input.location
  if (input.categoryId !== undefined) body.eventCategoryId = input.categoryId
  if (input.startsAt) body.eventStartDate = nairobiToIso(input.startsAt)
  if (input.endsAt) body.eventEndDate = nairobiToIso(input.endsAt)
  if (input.salesStartAt) body.ticketSaleStartDate = nairobiToIso(input.salesStartAt)
  if (input.salesEndAt) body.ticketSaleEndDate = nairobiToIso(input.salesEndAt)
  try {
    if (input.usePoster) body.eventPosterUrl = await uploadPoster(poster)
    const response = await api.event.update(input.eventId, body)
    if (!response.status) throw new Error(response.message || 'Failed to update event')
    return { ok: true, message: response.message || 'Event updated.' }
  } catch (error) {
    return failure(error, 'Failed to update event')
  }
}

async function createPromoCode(input: CreatePromoCodeInput, user: UserSession): Promise<WriteOutcome> {
  try {
    const response = await api.promoCodes.create({
      userId: user.user_id,
      companyId: user.company_id,
      scope: input.scope,
      ...(input.scope !== 'COMPANY' ? { eventId: input.eventId } : {}),
      ...(input.scope === 'TICKET' ? { ticketId: input.ticketId } : {}),
      discountType: input.discountType,
      discountValue: input.discountValue,
      validFrom: toLocalDateTime(input.validFrom),
      validUntil: toLocalDateTime(input.validUntil),
      maxUses: input.maxUses,
      ...(input.promoCode ? { promoCode: input.promoCode } : { numberOfPromoCodes: input.numberOfPromoCodes }),
    })
    if (!response.status) throw new Error(response.message || 'Failed to create promo code')
    return { ok: true, message: response.message || 'Promo code created.', details: response.codes ? { codes: response.codes } : undefined }
  } catch (error) {
    return failure(error, 'Failed to create promo code')
  }
}

async function createFlashSale(input: CreateFlashSaleInput, user: UserSession): Promise<WriteOutcome> {
  try {
    const response = await api.flashSales.create({
      userId: user.user_id,
      flashSaleName: input.name,
      eventId: input.eventId,
      ticketId: input.ticketId,
      salePrice: input.salePrice,
      startTime: toLocalDateTime(input.startTime),
      endTime: toLocalDateTime(input.endTime),
      maxQuantity: input.maxQuantity,
    })
    if (!response.status) throw new Error(response.message || 'Failed to create flash sale')
    return { ok: true, message: response.message || 'Flash sale created.' }
  } catch (error) {
    return failure(error, 'Failed to create flash sale')
  }
}

async function addUser(input: AddUserInput, user: UserSession): Promise<WriteOutcome> {
  try {
    const response = await api.user.create({
      fullName: input.fullName.trim(),
      idNumber: input.idNumber || '00000000',
      mobileNumber: formatPhoneNumber(input.mobileNumber),
      password: DEFAULT_TEAMMATE_PASSWORD,
      emailAddress: input.email.toLowerCase().trim(),
      isExternal: false,
      company: { id: user.company_id },
      roles: input.role,
    }, user.user_id)
    if (!response.status) throw new Error(response.message || 'Failed to add user')
    return { ok: true, message: response.message || 'Teammate added.' }
  } catch (error) {
    return failure(error, "Couldn't add this user")
  }
}

async function issueComplimentary(input: IssueComplimentaryInput, user: UserSession): Promise<WriteOutcome> {
  try {
    const response = await api.company.issueComplementary({
      userId: user.user_id,
      eventId: input.eventId,
      customer: { mobile_number: formatPhoneNumber(input.mobileNumber), email: input.email.toLowerCase().trim() },
      tickets: [{ ticketId: input.ticketId, quantity: input.quantity }],
    })
    if (!response.status) throw new Error(response.message || 'Failed to issue complimentary tickets')
    return { ok: true, message: response.message || 'Complimentary tickets issued.' }
  } catch (error) {
    return failure(error, 'Failed to issue complimentary tickets')
  }
}

export function runWrite(action: PendingAction, user: UserSession, poster: File | null): Promise<WriteOutcome> {
  const input = action.input as never
  switch (action.name) {
    case 'create_event': return createEvent(input, user, poster)
    case 'update_event': return updateEvent(input, poster)
    case 'create_promo_code': return createPromoCode(input, user)
    case 'create_flash_sale': return createFlashSale(input, user)
    case 'add_user': return addUser(input, user)
    case 'issue_complimentary': return issueComplimentary(input, user)
  }
}
