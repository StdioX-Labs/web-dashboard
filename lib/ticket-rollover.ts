/**
 * Ticket tier rollover: a ticket can wait off sale until another ticket of the
 * same event is finished (sold out, closed by the organiser, or past its sale
 * end), then open automatically — Early Bird → Advance → Gate. The API stores
 * the link as `rolloverFromTicketId` on the later ticket; a ticket waiting its
 * turn has status PENDING. Unsold stock of the earlier ticket is not carried over.
 *
 * Shared by the create, edit and event detail pages so the picker rules and the
 * wording stay the same everywhere.
 */

/** The request field the API names when it rejects a rollover link. */
export const ROLLOVER_FIELD = "rolloverFromTicketId"

export const ROLLOVER_LABEL = "Opens after"
export const ROLLOVER_NONE_LABEL = "None — sells on its own dates"
export const ROLLOVER_HELP =
  "This ticket goes on sale automatically when the selected ticket sells out or its sale ends."

/** A ticket as the picker sees it: its key, its name and the key it opens after. */
export interface RolloverNode<K> {
  key: K
  name: string
  after: K | null
}

/** Whether `self` opening after `candidate` would close a loop. */
export function wouldLoop<K>(nodes: RolloverNode<K>[], self: K, candidate: K): boolean {
  const byKey = new Map(nodes.map((n) => [n.key, n]))
  const seen = new Set<K>()
  let current: K | null = candidate
  while (current != null && !seen.has(current)) {
    if (current === self) return true
    seen.add(current)
    current = byKey.get(current)?.after ?? null
  }
  return false
}

/**
 * Tickets `self` may open after: not itself, not one another ticket already
 * follows (each ticket has at most one follower), and not one that would loop
 * back to it.
 */
export function rolloverChoices<K>(nodes: RolloverNode<K>[], self: K): RolloverNode<K>[] {
  return nodes.filter(
    (n) =>
      n.key !== self &&
      !nodes.some((o) => o.key !== self && o.after === n.key) &&
      !wouldLoop(nodes, self, n.key)
  )
}

/**
 * The same tickets with every predecessor before its follower, so they can be
 * created one at a time with the predecessor's id already known. A ticket whose
 * predecessor is not in the list counts as having none. Tickets caught in a
 * loop come last, in their original order.
 */
export function rolloverOrder<K>(nodes: RolloverNode<K>[]): RolloverNode<K>[] {
  const keys = new Set(nodes.map((n) => n.key))
  const placed = new Set<K>()
  const ordered: RolloverNode<K>[] = []
  let pending = nodes
  while (pending.length > 0) {
    const ready = pending.filter((n) => n.after == null || !keys.has(n.after) || placed.has(n.after))
    if (ready.length === 0) break
    for (const n of ready) {
      ordered.push(n)
      placed.add(n.key)
    }
    pending = pending.filter((n) => !placed.has(n.key))
  }
  return [...ordered, ...pending]
}

export interface RolloverStep {
  id: number
  to: number | null
}

/**
 * Orders changes to saved tickets' links so that none claims a predecessor
 * another ticket still holds on the server, which the API rejects. A ticket
 * giving up a predecessor goes before the one taking it. When changes only wait
 * on each other (two tickets swapping predecessors), one is unlinked first —
 * that ticket opens for sale until its new link is saved a moment later.
 *
 * `saved` maps each saved ticket's id to the id it opens after on the server.
 */
export function rolloverSteps(saved: Map<number, number | null>, changes: RolloverStep[]): RolloverStep[] {
  const current = new Map(saved)
  const steps: RolloverStep[] = []
  const pending = [...changes]
  const heldByOther = (c: RolloverStep) =>
    c.to != null && [...current].some(([id, after]) => id !== c.id && after === c.to)

  while (pending.length > 0) {
    const index = pending.findIndex((c) => !heldByOther(c))
    if (index >= 0) {
      const [c] = pending.splice(index, 1)
      steps.push(c)
      current.set(c.id, c.to)
      continue
    }
    const c = pending[0]
    if (current.get(c.id) != null && pending.length > 1) {
      steps.push({ id: c.id, to: null })
      current.set(c.id, null)
    } else {
      // Held by a ticket that isn't changing: send it and let the API explain.
      pending.shift()
      steps.push(c)
      current.set(c.id, c.to)
    }
  }
  return steps
}

/**
 * The label for a linked ticket: "Queued · opens after Early Bird" while it
 * waits its turn, or a quieter "After Early Bird" once it is selling or done.
 * Null for a ticket that sells on its own dates.
 */
export function rolloverBadge(
  ticketStatus: string | null | undefined,
  rolloverFromTicketId: number | null | undefined,
  nameOf: (id: number) => string | undefined
): { queued: boolean; label: string } | null {
  if (rolloverFromTicketId == null) return null
  const name = nameOf(rolloverFromTicketId) ?? "an earlier ticket"
  return (ticketStatus ?? "").toUpperCase() === "PENDING"
    ? { queued: true, label: `Queued · opens after ${name}` }
    : { queued: false, label: `After ${name}` }
}
