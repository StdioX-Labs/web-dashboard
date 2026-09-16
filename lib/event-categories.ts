/**
 * Event categories, by the id the API stores on an event.
 *
 * Shared so that creating and editing an event offer the same list — the edit
 * form used to carry its own slug-based list ("music", "sports") that matched
 * neither these ids nor the values the API returns, so a category could be
 * picked but never saved.
 *
 * Note: the admin console ships a shorter nine-entry list whose labels diverge
 * from these past id 2 (its id 5 is "Food & Drink", here it is "Entertainment
 * & Arts"). Only one can match the backend. This list is kept because it is
 * what this app has always created events with — worth confirming against the
 * API before either app changes.
 */
export interface EventCategory {
  id: number
  label: string
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { id: 1, label: "Music Events" },
  { id: 2, label: "Sports Events" },
  { id: 3, label: "Cultural & Community Events" },
  { id: 4, label: "Business & Networking Events" },
  { id: 5, label: "Entertainment & Arts" },
  { id: 6, label: "Food & Drink Events" },
  { id: 7, label: "Workshops & Training" },
  { id: 8, label: "Family & Kids" },
  { id: 9, label: "Conventions & Expos" },
  { id: 10, label: "Virtual & Online Events" },
  { id: 11, label: "Health & Wellness Events" },
  { id: 12, label: "Fashion & Beauty" },
  { id: 13, label: "Nightlife & Social Events" },
  { id: 14, label: "Academic & Educational Events" },
  { id: 15, label: "Private Events" },
  { id: 16, label: "Seasonal & Holiday Events" },
  { id: 17, label: "Adventure & Outdoor Events" },
  { id: 18, label: "Fundraisers & Charity Events" },
  { id: 19, label: "Professional Competitions" },
]

/** Match a category name from the API back to its id, for preselecting a form. */
export function findCategoryIdByName(name: string | undefined | null): number | undefined {
  if (!name) return undefined
  const needle = name.trim().toLowerCase()
  return EVENT_CATEGORIES.find((c) => c.label.toLowerCase() === needle)?.id
}
