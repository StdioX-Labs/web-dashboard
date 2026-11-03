// The signed-in organizer as the dashboard pages see it. Same shape the old
// OTP login stored in localStorage, so pages read the same fields.
export interface UserSession {
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
  fullName?: string
  roles?: string[]
}

export interface AccessTokenClaims {
  sub?: string
  exp?: number
  preferred_username?: string
  email?: string
  name?: string
  company_id?: string | number
  soa_user_id?: string | number
  realm_access?: { roles?: string[] }
}

/** Highest-privilege dashboard role first. */
const ROLE_ORDER = ['SUPER_ADMIN', 'COMPANY_OWNER', 'EVENT_ORGANIZER', 'STAFF']

export function primaryRole(roles: string[]): string {
  return ROLE_ORDER.find((role) => roles.includes(role)) ?? roles.find((r) => r !== 'SYSTEM') ?? ''
}

/**
 * Reads the access token's payload. The token came straight from Keycloak's
 * token endpoint over the back channel (and the ID token next to it was
 * verified), so it is decoded here without re-verifying its signature.
 */
export function decodeAccessToken(token: string): AccessTokenClaims {
  const [, payload] = token.split('.')
  if (!payload) return {}
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

const toInt = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : 0
}

export function userFromClaims(claims: AccessTokenClaims): UserSession {
  const roles = claims.realm_access?.roles ?? []
  return {
    phoneNumber: claims.preferred_username ?? '',
    email: claims.email ?? '',
    fullName: claims.name,
    role: primaryRole(roles),
    roles,
    is_active: true,
    kycStatus: '',
    profile_type: null,
    company_id: toInt(claims.company_id),
    user_id: toInt(claims.soa_user_id),
    company_name: '',
    currency: 'KES',
  }
}
