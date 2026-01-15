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
}

