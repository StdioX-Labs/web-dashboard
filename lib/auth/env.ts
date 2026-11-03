// Server-side configuration for Keycloak sign-in and the SoldOut API.
// Read lazily so `next build` works without the variables set; each getter
// throws a clear error the first time a request actually needs it.

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

const trimSlash = (url: string) => url.replace(/\/+$/, '')

export const authEnv = {
  /** Public issuer: the `iss` claim and every URL the browser is sent to. */
  get issuer() {
    return trimSlash(required('KEYCLOAK_ISSUER'))
  },
  /** Same realm reached from inside the cluster, for token, refresh and JWKS calls. */
  get internalIssuer() {
    return trimSlash(process.env.KEYCLOAK_INTERNAL_ISSUER || required('KEYCLOAK_ISSUER'))
  },
  /** client_credentials endpoint; defaults to the internal issuer's token endpoint. */
  get tokenUrl() {
    return process.env.KEYCLOAK_TOKEN_URL || `${this.internalIssuer}/protocol/openid-connect/token`
  },
  get clientId() {
    return required('KEYCLOAK_CLIENT_ID')
  },
  get clientSecret() {
    return required('KEYCLOAK_CLIENT_SECRET')
  },
  get secret() {
    const secret = required('AUTH_SECRET')
    if (secret.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters')
    return secret
  },
  /** The dashboard's own public origin, e.g. https://staging-dashboard.soldoutafrica.com */
  get appUrl() {
    return trimSlash(required('APP_URL'))
  },
  get redirectUri() {
    return `${this.appUrl}/api/auth/callback`
  },
}

/** Base URL of the SoldOut core API, including /api/v1. */
export function soldoutApiBaseUrl(): string {
  return trimSlash(process.env.SOLDOUT_API_BASE_URL || 'https://api.soldoutafrica.com/api/v1')
}

/** Cookies are Secure whenever the app is served over https (always, outside local dev). */
export function secureCookies(): boolean {
  const appUrl = process.env.APP_URL
  return appUrl ? appUrl.startsWith('https://') : process.env.NODE_ENV === 'production'
}
