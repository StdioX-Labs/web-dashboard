// Event cache manager with encryption
class EventCacheManager {
  private static instance: EventCacheManager
  private cache: Map<string, { data: string; timestamp: number; loading: boolean }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private pendingRequests: Map<string, Promise<unknown>> = new Map()

  private constructor() {}

  static getInstance(): EventCacheManager {
    if (!EventCacheManager.instance) {
      EventCacheManager.instance = new EventCacheManager()
    }
    return EventCacheManager.instance
  }

  // Simple encryption (XOR with key derived from user session)
  // Uses TextEncoder/TextDecoder for proper Unicode handling
  private encrypt(data: string, key: string): string {
    // Convert string to UTF-8 bytes
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    const keyBytes = encoder.encode(key)

    // XOR encryption
    const encrypted = new Uint8Array(dataBytes.length)
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length]
    }

    // Convert to base64 in chunks to avoid call stack overflow
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < encrypted.length; i += chunkSize) {
      const chunk = encrypted.slice(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }

    return btoa(binary)
  }

  private decrypt(encryptedData: string, key: string): string {
    // Decode from base64
    const binary = atob(encryptedData)
    const encrypted = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      encrypted[i] = binary.charCodeAt(i)
    }

    // XOR decryption
    const encoder = new TextEncoder()
    const keyBytes = encoder.encode(key)
    const decrypted = new Uint8Array(encrypted.length)

    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }

    // Convert bytes back to UTF-8 string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  private getEncryptionKey(companyId: number): string {
    // Generate a key based on company ID and session
    return `${companyId}-${typeof window !== 'undefined' ? window.location.hostname : 'server'}-soldout`
  }

  isCacheValid(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION
    return !isExpired
  }

  isLoading(key: string): boolean {
    const cached = this.cache.get(key)
    return cached?.loading || false
  }

  async getOrFetch<T>(
    key: string,
    companyId: number,
    fetchFn: () => Promise<T>
  ): Promise<T | null> {
    // Check if data is cached and valid
    if (this.isCacheValid(key)) {
      const cached = this.cache.get(key)
      if (cached && !cached.loading) {
        try {
          const decrypted = this.decrypt(cached.data, this.getEncryptionKey(companyId))
          return JSON.parse(decrypted)
        } catch (error) {
          console.error('Failed to decrypt cache:', error)
          this.cache.delete(key)
        }
      }
    }

    // Check if there's already a pending request
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>
    }

    // Set loading state
    this.cache.set(key, { data: '', timestamp: Date.now(), loading: true })

    // Create new request
    const request = fetchFn()
      .then((data) => {
        const jsonData = JSON.stringify(data)
        const encrypted = this.encrypt(jsonData, this.getEncryptionKey(companyId))

        this.cache.set(key, {
          data: encrypted,
          timestamp: Date.now(),
          loading: false,
        })

        this.pendingRequests.delete(key)
        return data
      })
      .catch((error) => {
        this.cache.delete(key)
        this.pendingRequests.delete(key)
        throw error
      })

    this.pendingRequests.set(key, request)
    return request
  }

  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key)
      this.pendingRequests.delete(key)
    } else {
      this.cache.clear()
      this.pendingRequests.clear()
    }
  }

  getPendingRequest(key: string): Promise<unknown> | undefined {
    return this.pendingRequests.get(key)
  }
}

export const eventCache = EventCacheManager.getInstance()

