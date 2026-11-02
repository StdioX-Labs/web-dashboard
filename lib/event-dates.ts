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

/**
 * Slack for the poster upload between picking "now" and the API checking the
 * start, matching START_DATE_GRACE on the API.
 */
export const START_DATE_GRACE_MS = 10 * 60 * 1000

/**
 * Why `start` can't be saved, or null when it can. A new event, or one that has
 * not started yet, can't start in the past. An event that already started
 * (`savedStart` in the past) keeps or corrects its start freely: the edit form
 * sends every date back on each save.
 */
export function startDateError(start: Date, savedStart?: Date, now: Date = new Date()): string | null {
  if (savedStart && savedStart <= now) return null
  if (savedStart && start.getTime() === savedStart.getTime()) return null
  if (start.getTime() < now.getTime() - START_DATE_GRACE_MS) {
    return "The start date has already passed. Choose a date and time in the future."
  }
  return null
}
