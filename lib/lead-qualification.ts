/**
 * Who counts as a lead worth calling.
 *
 * The bar is 100,000 KES of ticket sales on their last event, asked directly
 * as one dropdown rather than derived from ticket count x price — fewer
 * fields, and no arithmetic on two self-reported guesses.
 */
export const LAST_EVENT_GROSS_OPTIONS = [
  { value: "none", label: "I haven't run an event yet" },
  { value: "under_100k", label: "Under KES 100,000" },
  { value: "100k_500k", label: "KES 100,000 – 500,000" },
  { value: "500k_2m", label: "KES 500,000 – 2M" },
  { value: "2m_plus", label: "Over KES 2M" },
] as const

export const NEXT_EVENT_OPTIONS = [
  { value: "within_30_days", label: "Within 30 days" },
  { value: "one_to_three_months", label: "1 – 3 months" },
  { value: "three_months_plus", label: "More than 3 months" },
  { value: "no_date", label: "No date set yet" },
] as const

const QUALIFYING_GROSS = new Set(["100k_500k", "500k_2m", "2m_plus"])

export function isQualified(lastEventGross: string): boolean {
  return QUALIFYING_GROSS.has(lastEventGross)
}
