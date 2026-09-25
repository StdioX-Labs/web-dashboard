/**
 * What an event took, as every screen should report it.
 *
 * The platform's event total is the authority. Without it, fall back to the
 * per-ticket ledger balances — never price x count, which bills complimentary
 * issues and every ticket in a group sale. Keeping this in one place is what
 * stops the home page and the events page showing two figures for one event.
 */
export function getEventRevenue(event: {
  totalRevenue?: number
  tickets?: Array<{ totalTicketSaleBalance?: number }>
}): number {
  if (event.totalRevenue !== undefined && event.totalRevenue !== null) {
    return event.totalRevenue
  }
  return (event.tickets ?? []).reduce(
    (sum, ticket) => sum + (ticket.totalTicketSaleBalance ?? 0),
    0
  )
}

/**
 * Every ticket issued for an event, paid and complimentary together.
 * uniqueTicketCount is exactly that; without it, fall back to the paid count.
 */
export function getEventTicketsIssued(event: {
  tickets?: Array<{ uniqueTicketCount?: number; paidTicketsSold?: number }>
}): number {
  return (event.tickets ?? []).reduce(
    (sum, ticket) => sum + (ticket.uniqueTicketCount ?? ticket.paidTicketsSold ?? 0),
    0
  )
}
