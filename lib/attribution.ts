/**
 * Ad click IDs and UTMs, captured on landing and kept for the rest of the
 * session so they survive /get-started -> /signup.
 *
 * Without this the gclid dies on the first client-side navigation and the
 * conversion can never be tied back to the click that paid for it.
 */
const KEY = "ad_attribution"
const FIELDS = ["gclid", "fbclid", "utm_source", "utm_medium", "utm_campaign"] as const

export type Attribution = Partial<Record<(typeof FIELDS)[number], string>>

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {}

  const params = new URLSearchParams(window.location.search)
  const fromUrl: Attribution = {}
  for (const field of FIELDS) {
    const value = params.get(field)
    if (value) fromUrl[field] = value
  }

  const stored = readAttribution()
  // First touch wins: a later internal navigation must not blank out the
  // click ID we landed with.
  const merged = { ...fromUrl, ...stored }

  if (Object.keys(merged).length > 0) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(merged))
    } catch {
      // Private mode / storage disabled. The in-memory copy still works for
      // this page view, which is the one that matters for the form post.
    }
  }

  return merged
}

export function readAttribution(): Attribution {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}") as Attribution
  } catch {
    return {}
  }
}
