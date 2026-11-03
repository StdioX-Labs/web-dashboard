/** Only same-site paths: never an absolute or protocol-relative URL. */
export function safeReturnTo(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value.startsWith('/api/auth/')) return fallback
  return value
}
