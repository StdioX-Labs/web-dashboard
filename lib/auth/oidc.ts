import * as client from 'openid-client'
import { authEnv } from './env'

// Keycloak runs with KC_HOSTNAME set to the public URL, so every token carries
// the public issuer even when it was minted through the in-cluster URL. The
// metadata is therefore assembled here rather than discovered: the browser is
// sent to the public authorization and logout endpoints, the server talks to
// the internal token and JWKS endpoints, and the ID token's `iss` is checked
// against the public issuer. Discovery through the internal URL would report
// the public issuer and fail openid-client's issuer-equals-URL check.

let cached: { key: string; config: client.Configuration } | null = null

export function oidcConfig(): client.Configuration {
  const issuer = authEnv.issuer
  const internal = authEnv.internalIssuer
  const key = `${issuer}|${internal}|${authEnv.clientId}`
  if (cached?.key === key) return cached.config

  const server: client.ServerMetadata = {
    issuer,
    authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
    end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
    token_endpoint: `${internal}/protocol/openid-connect/token`,
    jwks_uri: `${internal}/protocol/openid-connect/certs`,
    userinfo_endpoint: `${internal}/protocol/openid-connect/userinfo`,
    revocation_endpoint: `${internal}/protocol/openid-connect/revoke`,
    code_challenge_methods_supported: ['S256'],
  }

  // client_secret_post, not client_secret_basic: no HTTP Basic anywhere.
  const config = new client.Configuration(
    server,
    authEnv.clientId,
    { token_endpoint_auth_method: 'client_secret_post' },
    client.ClientSecretPost(authEnv.clientSecret)
  )
  if (internal.startsWith('http://')) {
    // In-cluster Service URL (http://keycloak.staging.svc:8080). Never leaves the cluster.
    client.allowInsecureRequests(config)
  }
  cached = { key, config }
  return config
}

export interface LoginChecks {
  codeVerifier: string
  state: string
  nonce: string
  returnTo: string
}

export async function buildLoginRedirect(returnTo: string, loginHint?: string | null) {
  const config = oidcConfig()
  const checks: LoginChecks = {
    codeVerifier: client.randomPKCECodeVerifier(),
    state: client.randomState(),
    nonce: client.randomNonce(),
    returnTo,
  }
  const params: Record<string, string> = {
    redirect_uri: authEnv.redirectUri,
    scope: 'openid profile email',
    response_type: 'code',
    code_challenge: await client.calculatePKCECodeChallenge(checks.codeVerifier),
    code_challenge_method: 'S256',
    state: checks.state,
    nonce: checks.nonce,
  }
  if (loginHint) params.login_hint = loginHint
  return { url: client.buildAuthorizationUrl(config, params), checks }
}

/** Exchanges the authorization code. `search` is the callback's query string. */
export async function exchangeCode(search: string, checks: LoginChecks) {
  const callbackUrl = new URL(`${authEnv.redirectUri}${search}`)
  return client.authorizationCodeGrant(oidcConfig(), callbackUrl, {
    pkceCodeVerifier: checks.codeVerifier,
    expectedState: checks.state,
    expectedNonce: checks.nonce,
    idTokenExpected: true,
  })
}

export async function refreshTokens(refreshToken: string) {
  return client.refreshTokenGrant(oidcConfig(), refreshToken)
}

/** `afterPath` must fall under the client's "Valid post logout redirect URIs" (APP_URL/*). */
export function buildLogoutUrl(idToken?: string, afterPath = '/'): URL {
  const params: Record<string, string> = {
    post_logout_redirect_uri: `${authEnv.appUrl}${afterPath}`,
    client_id: authEnv.clientId,
  }
  if (idToken) params.id_token_hint = idToken
  return client.buildEndSessionUrl(oidcConfig(), params)
}

// ---- Service-account token for the public routes (signup, lead capture) ----

let serviceToken: { token: string; expiresAt: number } | null = null

/**
 * A client_credentials token for the dashboard's own service account. Only the
 * public routes that create an account or a lead use it, because there is no
 * signed-in user to act as. Requires "Service accounts" to be enabled on the
 * soa-dashboard-web client in Keycloak.
 */
export async function serviceAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (serviceToken && serviceToken.expiresAt - 30 > now) return serviceToken.token

  const response = await fetch(authEnv.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: authEnv.clientId,
      client_secret: authEnv.clientSecret,
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    throw new Error(`Service token request failed (${response.status})`)
  }
  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('Service token response had no access_token')
  serviceToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 60) }
  return serviceToken.token
}
