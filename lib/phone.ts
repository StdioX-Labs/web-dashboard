/**
 * Normalise a Kenyan mobile number to the 254XXXXXXXXX form the API expects.
 * Extracted from signup-page so the landing-page form uses the same rules.
 */
export function formatPhoneNumber(input: string): string {
  let cleaned = input.replace(/\D/g, "")

  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1)
  }

  if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned
  }

  return cleaned
}
