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

  // "+254 0712 ..." keeps the trunk 0 after the country code
  if (cleaned.startsWith("2540")) {
    cleaned = "254" + cleaned.substring(4)
  }

  return cleaned
}

/**
 * True when the input is exactly one Kenyan number once formatted. The API
 * applies the same rule (PhoneNumberParser.parseKENumberStrict), so a number
 * with a digit too many is caught here rather than after submitting.
 */
export function isValidPhoneNumber(input: string): boolean {
  return /^254\d{9}$/.test(formatPhoneNumber(input))
}

export const PHONE_NUMBER_HINT = "Enter a Kenyan number, e.g. 0712 345 678 or 254712345678"
