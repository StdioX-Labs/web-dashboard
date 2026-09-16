/**
 * Guard rails for "tickets to issue", ported from the admin console's
 * `src/lib/ticket-limits.ts` so both apps stop the same bad values reaching the
 * backend: issuing a large batch in one request overwhelms the issuer, and the
 * value can never sensibly exceed the ticket's own allocation.
 *
 * One deliberate difference. The admin console treats a blank field as "issue
 * none" (0), documenting `ticketsToIssue` as how many ticket records to
 * generate up front. This app has always used the same field as the group size
 * — the "Group ticket → Group of" control, hinted as "tickets issued per
 * purchase (e.g. 2 for a couple's ticket)" — where the sane default is 1, not
 * 0. The two readings of the field disagree; only one can match the backend.
 * Defaulting to 1 preserves this app's long-standing behaviour rather than
 * changing what group tickets mean, but it is worth settling against the API.
 */

export const MAX_TICKETS_TO_ISSUE = 1000

/** Parse a form value into a safe issue count. Blank/invalid → 1. */
export function parseTicketsToIssue(raw: string | number | undefined | null): number {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10)
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.floor(n)
}

/** Clamp to the per-request cap and the ticket's allocation. */
export function clampTicketsToIssue(
  raw: string | number | undefined | null,
  allocation: number
): number {
  const n = parseTicketsToIssue(raw)
  const ceiling = allocation > 0 ? Math.min(MAX_TICKETS_TO_ISSUE, allocation) : MAX_TICKETS_TO_ISSUE
  return Math.min(n, ceiling)
}

/**
 * Help text for the two ticket fields organisers most often misread, kept here
 * beside the rules they describe and shared by the create and edit forms so the
 * wording cannot drift between them.
 *
 * Both are confusing mainly in their *off* state: nothing on screen said that
 * leaving "Group ticket" off means one ticket per purchase, or that leaving the
 * per-person limit off means no limit at all — so the defaults read as
 * unanswered questions rather than as sensible choices.
 */
export const TICKET_FIELD_HELP = {
  groupOff: "Off (1 per purchase) — turn on only for a ticket that admits several people, like a couple's or table ticket.",
  groupOn: "Each purchase issues this many tickets — one buyer pays once and receives all of them.",
  limitOff: "Off (0) — no limit, one person can buy as many as they like.",
  limitOn: "The most tickets any one person can buy in total.",
} as const
