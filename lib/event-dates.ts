/**
 * An event ends a day after it starts unless the organiser says otherwise.
 * The end date gates listings, gate scanning and affiliate links, so it must
 * never be missing or at/before the start (the API rejects both).
 */

export const DEFAULT_EVENT_LENGTH_MS = 24 * 60 * 60 * 1000

export function defaultEventEnd(start: Date): Date {
  return new Date(start.getTime() + DEFAULT_EVENT_LENGTH_MS)
}

/**
 * The end to use after the start moves from `prevStart` to `nextStart`.
 * The end moves with the start, keeping the length the organiser chose (a
 * three-day festival stays three days). With no usable end yet, the end
 * becomes start + 24h.
 */
export function endAfterStartChange(
  prevStart: Date | undefined,
  nextStart: Date | undefined,
  end: Date | undefined,
): Date | undefined {
  if (!nextStart) return end
  if (!prevStart || !end || end <= prevStart) return defaultEventEnd(nextStart)
  return new Date(nextStart.getTime() + (end.getTime() - prevStart.getTime()))
}
