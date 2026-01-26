const BASE_URL = 'https://api.soldoutafrica.com/api/v1'
const USE_PROXY = true // Set to true to use Next.js API proxy
const PROXY_BASE_URL = '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  useProxy = USE_PROXY
): Promise<T> {
  const url = useProxy ? `${PROXY_BASE_URL}${endpoint}` : `${BASE_URL}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Merge additional headers
  if (options.headers) {
    const optHeaders = options.headers as Record<string, string>
    Object.assign(headers, optHeaders)
  }

  // Add auth token if it exists
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const fetchOptions: RequestInit = {
      ...options,
      headers,
    }

    // Only add CORS settings if not using proxy
    if (!useProxy) {
      fetchOptions.mode = 'cors'
      fetchOptions.credentials = 'omit'
    }

    console.log('API Request:', { url, method: fetchOptions.method })

    const response = await fetch(url, fetchOptions)

    console.log('API Response:', {
      url,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    })

    // Check if response is ok before parsing
    if (!response.ok) {
      let errorMessage = 'An error occurred'
      let errorData = null

      try {
        errorData = await response.json()
        console.log('API Error Data:', errorData)
        errorMessage = errorData.message || errorMessage
      } catch (_) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }

      throw new ApiError(
        errorMessage,
        response.status,
        errorData
      )
    }

    const data = await response.json()
    console.log('API Success Data:', data)
    return data
  } catch (error) {
    console.error('API Request Error:', error)

    if (error instanceof ApiError) {
      throw error
    }

    // Handle network errors specifically
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError(
        'Network error: Unable to connect to the server. Please check your internet connection or try again later.',
        0,
        { originalError: error.message }
      )
    }

    if (error instanceof Error) {
      throw new ApiError(error.message)
    }

    throw new ApiError('An unexpected error occurred')
  }
}

// API methods
export const api = {
  // Auth endpoints
  auth: {
    requestOtp: async (id: string, method: 'email' | 'phone') => {
      return apiRequest<{
        otp?: string // Optional in production
        message: string
        user?: { // Optional in production
          phoneNumber: string
          role: string
          is_active: boolean
          kycStatus: string
          profile_type: string | null
          company_id: number
          user_id: number
          company_name: string
          currency: string
          email: string
        }
        status: boolean
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ id, method }),
      }, true) // Use proxy
    },
    verifyOtp: async (id: string, otp: string, method: 'email' | 'phone') => {
      return apiRequest<{
        message: string
        user: {
          phoneNumber: string
          role: string
          is_active: boolean
          kycStatus: string
          profile_type: string | null
          company_id: number
          user_id: number
          company_name: string
          currency: string
          email: string
        }
        status: boolean
      }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ id, otp, method }),
      }, true) // Use proxy
    },
  },

  // Company endpoints
  company: {
    getSummary: async (companyId: number) => {
      return apiRequest<{
        summary: {
          totalFees: number
          totalTicketsSold: number
          totalEvents: number
          activeEvents: number
          totalRevenue: number
        }
        message: string
        status: boolean
      }>(`/company/summary?companyId=${companyId}`, {
        method: 'GET',
      }, true) // Use proxy route
    },
    getEvents: async () => {
      return apiRequest<{
        message: string
        events: Array<{
          id: number
          eventName: string
          eventDescription: string
          eventPosterUrl: string
          eventCategoryId: number
          ticketSaleStartDate: string
          ticketSaleEndDate: string
          eventLocation: string
          eventStartDate: string
          eventEndDate: string
          isActive: boolean
          tickets: Array<{
            id: number
            ticketName: string
            ticketPrice: number
            quantityAvailable: number
            soldQuantity: number
            isActive: boolean
            ticketsToIssue: number
            isSoldOut: boolean
            ticketLimitPerPerson: number
            numberOfComplementary: number
            ticketSaleStartDate: string
            ticketSaleEndDate: string
            isFree: boolean
            ticketStatus: string
            createAt: string
          }>
          createdById: number
          companyId: number
          companyName: string
          comission: number
          category: string
          date: string
          time: string
          isFeatured: boolean
          price: number
          slug: string
          currency: string
        }>
      }>('/company/events', {
        method: 'GET',
      }, true) // Use proxy route
    },
    getAllEvents: async (companyId: number, page: number = 0, size: number = 300) => {
      const response = await apiRequest<{
        data: {
          data: Array<{
            eventId: number
            eventName: string
            slug: string
            eventDescription: string
            eventPosterUrl: string
            eventCategory: string
            eventLocation: string
            ticketSaleStartDate: string
            ticketSaleEndDate: string
            eventStartDate: string
            eventEndDate: string
            active: boolean
            status: string
            companyId: number
            companyName: string
            totalTicketsSold: number
            totalRevenue: number
            totalPlatformFee: number
            analytics?: {
              dailySalesGraph: string
              currentWeekSales: number
              totalAttendees: number
              totalTicketTypes: number
            }
            ticketSummaries: Array<{
              ticketId: number
              ticketName: string
              totalTicketSaleBalance: number
              ticketPrice: number
              uniqueTicketCount: number
              ticketStatus: string
            }>
          }>
          page?: number
          size?: number
          totalElements?: number
          totalPages?: number
          hasNext?: boolean
          hasPrevious?: boolean
        }
        message: string
        status: boolean
      }>(`/admin/events/all?page=${page}&size=${size}&companyId=${companyId}`, {
        method: 'GET',
      }, true)

      // Normalize the data to match the expected Event interface
      if (response.data && response.data.data) {
        const normalizedEvents = response.data.data.map(event => ({
          id: event.eventId,
          eventName: event.eventName,
          eventDescription: event.eventDescription,
          eventPosterUrl: event.eventPosterUrl,
          eventCategoryId: 0,
          ticketSaleStartDate: event.ticketSaleStartDate,
          ticketSaleEndDate: event.ticketSaleEndDate,
          eventLocation: event.eventLocation,
          eventStartDate: event.eventStartDate,
          eventEndDate: event.eventEndDate,
          isActive: event.active,
          status: event.status, // Add status field (ACTIVE, ONHOLD, etc.)
          tickets: event.ticketSummaries?.map(ticket => ({
            id: ticket.ticketId,
            ticketName: ticket.ticketName,
            ticketPrice: ticket.ticketPrice,
            // Use uniqueTicketCount as soldQuantity (this is the actual sold count)
            quantityAvailable: 0,
            soldQuantity: ticket.uniqueTicketCount || 0,
            isActive: ticket.ticketStatus === 'ACTIVE',
            ticketsToIssue: 1,
            isSoldOut: ticket.ticketStatus === 'SOLDOUT',
            ticketLimitPerPerson: 0,
            numberOfComplementary: 0,
            ticketSaleStartDate: event.ticketSaleStartDate,
            ticketSaleEndDate: event.ticketSaleEndDate,
            isFree: ticket.ticketPrice === 0,
            ticketStatus: ticket.ticketStatus || 'ACTIVE',
            createAt: new Date().toISOString(),
            // Include totalTicketSaleBalance for revenue calculation
            totalTicketSaleBalance: ticket.totalTicketSaleBalance,
          })) || [],
          createdById: 0,
          companyId: event.companyId,
          companyName: event.companyName,
          comission: 0,
          category: event.eventCategory,
          date: event.eventStartDate,
          time: new Date(event.eventStartDate).toLocaleTimeString(),
          isFeatured: false,
          price: event.ticketSummaries?.[0]?.ticketPrice || 0,
          slug: event.slug,
          currency: 'KES',
          // Add the actual totals from event level (most important for display)
          totalTicketsSold: event.totalTicketsSold,
          totalRevenue: event.totalRevenue,
          totalPlatformFee: event.totalPlatformFee,
          analytics: event.analytics,
        }))

        return {
          message: response.message || 'Events fetched successfully',
          events: normalizedEvents,
          pagination: response.data.page !== undefined ? {
            page: response.data.page,
            size: response.data.size || size,
            totalElements: response.data.totalElements || normalizedEvents.length,
            totalPages: response.data.totalPages || 1,
            hasNext: response.data.hasNext,
            hasPrevious: response.data.hasPrevious,
          } : undefined,
        }
      }

      return { message: 'No events found', events: [], pagination: undefined }
    },
    createEvent: async (eventData: {
      eventName: string
      eventDescription: string
      eventPosterUrl: string
      eventCategory: { id: number }
      ticketSaleStartDate: string
      ticketSaleEndDate: string
      eventLocation: string
      eventStartDate: string
      eventEndDate: string
      percentageComission: number
      users: { id: number }
      company: { id: number }
      slug: string
      currency: string
    }) => {
      return apiRequest<{
        message: string
        event_id?: number
        event?: {
          id: number
          eventName: string
          eventDescription: string
          eventPosterUrl: string
          eventLocation: string
          eventStartDate: string
          eventEndDate: string
          ticketSaleStartDate: string
          ticketSaleEndDate: string
          slug: string
          currency: string
        }
        status: boolean
      }>('/event/create', {
        method: 'POST',
        body: JSON.stringify(eventData),
      }, true)
    },
    createTicket: async (ticketData: {
      event: { id: number }
      ticketName: string
      ticketPrice: number
      quantityAvailable: number
      ticketsToIssue: number
      ticketLimitPerPerson: number
      numberOfComplementary: number
      ticketSaleStartDate: string
      ticketSaleEndDate: string
      isFree: boolean
    }) => {
      return apiRequest<{
        message: string
        ticket: {
          id: number
          ticketName: string
          ticketPrice: number
          quantityAvailable: number
          ticketsToIssue: number
          ticketLimitPerPerson: number
          numberOfComplementary: number
          ticketSaleStartDate: string
          ticketSaleEndDate: string
          isFree: boolean
        }
        status: boolean
      }>('/event/ticket/create', {
        method: 'POST',
        body: JSON.stringify(ticketData),
      }, true)
    },
    getAttendees: async (eventId: number) => {
      return apiRequest<{
        attendees: Array<{
          firstName: string
          lastName: string
          mobileNumber: string
          ticketName: string
          ticketPrice: number
          ticketId: string
          ticketIdLong: number
          email: string
          ticketGroupCode: string
          lastTimeUpdated: string
          scannedBy: string | null
          issuedBy: string | null
          eventName: string
          purchaseTime: string
          customerTicketId: number
          transactionId: string
          scanned: boolean
          complementary: boolean
        }>
        message: string
        status: boolean
      }>(`/gl/event/attendees/list?eventId=${eventId}`, {
        method: 'GET',
      }, true)
    },
  },

  // Transactions endpoints
  transactions: {
    fetchDetailed: async (params: {
      id: number
      idType: 'company' | 'event' | 'user'
      transactionType?: string
      page?: number
      size?: number
    }) => {
      return apiRequest<{
        data: {
          data: Array<{
            id: number
            companyId: number
            event: {
              id: number
              eventName: string
              eventDescription: string
              eventPosterUrl: string
              eventCategoryId: number
              ticketSaleStartDate: string
              ticketSaleEndDate: string
              eventLocation: string
              eventStartDate: string
              eventEndDate: string
              isActive: boolean
              createdById: number
              companyName: string
              comission: number
              category: string
              date: string
              time: string
              isFeatured: boolean
              price: number
              slug: string
              currency: string
            }
            ticket: {
              id: number
              ticketName: string
              ticketPrice: number
              quantityAvailable: number
              soldQuantity: number
              isActive: boolean
              ticketsToIssue: number
              isSoldOut: boolean
              ticketLimitPerPerson: number
              numberOfComplementary: number
              ticketSaleStartDate: string
              ticketSaleEndDate: string
              isFree: boolean
              ticketStatus: string
              createAt: string
            }
            buyer: {
              id: number
              email: string | null
              mobileNumber: string
              firstName: string | null
              lastName: string | null
              createdAt: string
            }
            barcode: string
            transactionId: string
            transactionType: string
            transactionAmount: number
            cashAccountBalance: number
            ticketSaleBalance: number
            platformFee: number
            createdAt: string
          }>
          page: number
          size: number
          totalElements: number
          totalPages: number
          hasNext: boolean
          hasPrevious: boolean
        }
        stats: {
          ticketsSold: number
          platformLiability: number
          totalSales: number
        }
        message: string
        status: boolean
      }>('/transactions/detailed', {
        method: 'POST',
        body: JSON.stringify({
          id: params.id,
          idType: params.idType,
          transactionType: params.transactionType || 'TICKET_SALE',
          page: params.page || 0,
          size: params.size || 50,
        }),
      }, true) // Use proxy route
    },
  },
}

