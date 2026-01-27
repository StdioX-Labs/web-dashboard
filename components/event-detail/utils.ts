// Utility functions for Event Detail components

/**
 * Format Kenyan phone number to international format (+254...)
 * Handles various input formats: +254715066651, 254715066651, 0715066651, 715066651
 */
export const formatKenyanPhone = (phone: string): string | null => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // Handle different Kenyan phone number formats
  if (cleaned.startsWith('254')) {
    // Already in international format (254715066651)
    cleaned = cleaned.slice(3) // Remove 254
  } else if (cleaned.startsWith('0')) {
    // Local format (0715066651 or 0115066651)
    cleaned = cleaned.slice(1) // Remove leading 0
  }

  // Convert 01 prefix to 07 (old Safaricom format)
  if (cleaned.startsWith('1') && cleaned.length === 9) {
    cleaned = '7' + cleaned.slice(1)
  }

  // Validate length (should be 9 digits after removing country code and leading zero)
  if (cleaned.length !== 9) {
    return null
  }

  // Validate it starts with valid prefixes (7, 1, or 8 for Kenyan numbers)
  const firstDigit = cleaned[0]
  if (!['7', '1', '8'].includes(firstDigit)) {
    return null
  }

  // Return in international format
  return '+254' + cleaned
}

/**
 * Validate Kenyan phone number
 */
export const validateKenyanPhone = (phone: string): boolean => {
  return formatKenyanPhone(phone) !== null
}

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Smart pagination helper - shows elegant page ranges
 */
export const getPageNumbers = (currentPage: number, totalPages: number) => {
  const pages: (number | string)[] = []
  const maxVisible = 7 // Maximum number of page buttons to show

  if (totalPages <= maxVisible) {
    // Show all pages if total is small
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  // Always show first page
  pages.push(1)

  if (currentPage <= 3) {
    // Near start: show 1, 2, 3, 4, 5, ..., last
    for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
      pages.push(i)
    }
    if (totalPages > 6) pages.push('...')
    pages.push(totalPages)
  } else if (currentPage >= totalPages - 2) {
    // Near end: show 1, ..., last-4, last-3, last-2, last-1, last
    pages.push('...')
    for (let i = Math.max(2, totalPages - 4); i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Middle: show 1, ..., current-1, current, current+1, ..., last
    pages.push('...')
    pages.push(currentPage - 1)
    pages.push(currentPage)
    pages.push(currentPage + 1)
    pages.push('...')
    pages.push(totalPages)
  }

  return pages
}

/**
 * Get paginated data from an array
 */
export const getPaginatedData = <T>(data: T[], page: number, itemsPerPage: number): T[] => {
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return data.slice(startIndex, endIndex)
}

/**
 * Calculate total pages for pagination
 */
export const getTotalPages = (dataLength: number, itemsPerPage: number): number => {
  return Math.ceil(dataLength / itemsPerPage)
}

/**
 * Check if event is past or inactive
 */
export const isEventPastOrInactive = (eventData: {
  status: string
  eventEndDate?: string
} | null): boolean => {
  if (!eventData) return false

  // Check if event status is inactive
  if (eventData.status === 'inactive' || eventData.status === 'cancelled') {
    return true
  }

  // Check if event date has passed
  if (eventData.eventEndDate) {
    const eventEndDate = new Date(eventData.eventEndDate)
    const now = new Date()
    if (eventEndDate < now) {
      return true
    }
  }

  return false
}

