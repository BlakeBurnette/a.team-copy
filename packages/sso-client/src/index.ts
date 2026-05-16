/**
 * PayHive SSO Client Library
 *
 * Provides utilities for OAuth2 PKCE authentication flow with hive-identity.
 */

// Storage keys
const PKCE_VERIFIER_KEY = 'pkce_verifier'
const OAUTH_STATE_KEY = 'oauth_state'
const RETURN_PATH_KEY = 'sso_return_path'

/**
 * Configuration for the SSO client
 */
export interface SSOConfig {
  /** The OAuth client ID for this application */
  clientId: string
  /** The hive-identity URL (e.g., https://id.thepayhive.com) */
  identityUrl: string
  /** The callback path for this application (e.g., /auth/callback) */
  callbackPath?: string
}

/**
 * Token response from the OAuth token endpoint
 */
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  id_token?: string
  scope?: string
}

/**
 * Decoded ID token claims
 */
export interface IdTokenClaims {
  sub: string
  email: string
  name: string
  iat: number
  exp: number
  iss: string
  aud: string
}

/**
 * Generate a cryptographically random string
 */
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a URL-safe base64 encoded string
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE(): Promise<{
  verifier: string
  challenge: string
}> {
  // Generate a random 32-byte verifier
  const verifierBytes = new Uint8Array(32)
  crypto.getRandomValues(verifierBytes)
  const verifier = base64UrlEncode(verifierBytes.buffer)

  // Generate SHA-256 challenge
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = base64UrlEncode(hash)

  return { verifier, challenge }
}

/**
 * Store PKCE verifier and OAuth state in session storage
 */
export function storePKCEData(verifier: string, state: string, returnPath?: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  if (returnPath) {
    sessionStorage.setItem(RETURN_PATH_KEY, returnPath)
  }
}

/**
 * Retrieve stored PKCE data from session storage
 */
export function getPKCEData(): {
  verifier: string | null
  state: string | null
  returnPath: string | null
} {
  return {
    verifier: sessionStorage.getItem(PKCE_VERIFIER_KEY),
    state: sessionStorage.getItem(OAUTH_STATE_KEY),
    returnPath: sessionStorage.getItem(RETURN_PATH_KEY),
  }
}

/**
 * Clear stored PKCE data from session storage
 */
export function clearPKCEData(): void {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(RETURN_PATH_KEY)
}

/**
 * Build the OAuth authorization URL
 */
export function buildAuthorizationUrl(
  config: SSOConfig,
  options: {
    state: string
    codeChallenge: string
    returnPath?: string
    scope?: string
  }
): string {
  const { clientId, identityUrl, callbackPath = '/auth/callback' } = config
  const { state, codeChallenge, scope } = options

  const redirectUri = `${window.location.origin}${callbackPath}`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  if (scope) {
    params.set('scope', scope)
  }

  return `${identityUrl}/oauth/authorize?${params.toString()}`
}

/**
 * Redirect to the SSO login page
 *
 * @param config - SSO configuration
 * @param returnPath - Path to return to after successful login (default: current path)
 */
export async function redirectToLogin(
  config: SSOConfig,
  returnPath?: string
): Promise<void> {
  const { verifier, challenge } = await generatePKCE()
  const state = generateRandomString(32)

  const currentPath = returnPath || window.location.pathname + window.location.search

  storePKCEData(verifier, state, currentPath)

  const authUrl = buildAuthorizationUrl(config, {
    state,
    codeChallenge: challenge,
    returnPath: currentPath,
  })

  window.location.href = authUrl
}

/**
 * Handle the OAuth callback
 *
 * @param config - SSO configuration
 * @param code - Authorization code from URL
 * @param state - State parameter from URL
 * @returns Token response
 */
export async function handleCallback(
  config: SSOConfig,
  code: string,
  state: string
): Promise<TokenResponse> {
  const { verifier, state: storedState, returnPath } = getPKCEData()

  // Validate state
  if (!storedState || state !== storedState) {
    clearPKCEData()
    throw new Error('Invalid state parameter - possible CSRF attack')
  }

  if (!verifier) {
    clearPKCEData()
    throw new Error('No PKCE verifier found - session may have expired')
  }

  const { clientId, identityUrl, callbackPath = '/auth/callback' } = config
  const redirectUri = `${window.location.origin}${callbackPath}`

  // Exchange authorization code for tokens
  const response = await fetch(`${identityUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'token_exchange_failed' }))
    clearPKCEData()
    throw new Error(error.error_description || error.error || 'Token exchange failed')
  }

  const tokens: TokenResponse = await response.json()
  clearPKCEData()

  return tokens
}

/**
 * Get the return path stored during login initiation
 */
export function getReturnPath(): string {
  return sessionStorage.getItem(RETURN_PATH_KEY) || '/'
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  config: SSOConfig,
  refreshToken: string
): Promise<TokenResponse> {
  const { clientId, identityUrl } = config

  const response = await fetch(`${identityUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'refresh_failed' }))
    throw new Error(error.error_description || error.error || 'Token refresh failed')
  }

  return response.json()
}

/**
 * Decode a JWT token without verification (client-side only)
 * Note: This does NOT verify the signature - use only for reading claims
 */
export function decodeIdToken(idToken: string): IdTokenClaims {
  const parts = idToken.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  const payload = parts[1]
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(decoded)
}

/**
 * Build the SSO logout URL
 */
export function buildLogoutUrl(
  config: SSOConfig,
  options?: {
    postLogoutRedirectUri?: string
    idTokenHint?: string
  }
): string {
  const { identityUrl } = config
  const params = new URLSearchParams()

  if (options?.postLogoutRedirectUri) {
    params.set('post_logout_redirect_uri', options.postLogoutRedirectUri)
  }

  if (options?.idTokenHint) {
    params.set('id_token_hint', options.idTokenHint)
  }

  const queryString = params.toString()
  return `${identityUrl}/oauth/logout${queryString ? `?${queryString}` : ''}`
}

/**
 * Redirect to SSO logout
 */
export function redirectToLogout(
  config: SSOConfig,
  options?: {
    postLogoutRedirectUri?: string
    idTokenHint?: string
  }
): void {
  const logoutUrl = buildLogoutUrl(config, {
    postLogoutRedirectUri: options?.postLogoutRedirectUri || window.location.origin,
    idTokenHint: options?.idTokenHint,
  })

  window.location.href = logoutUrl
}

/**
 * Create an SSO client instance with the given configuration
 */
export function createSSOClient(config: SSOConfig) {
  return {
    login: (returnPath?: string) => redirectToLogin(config, returnPath),
    handleCallback: (code: string, state: string) => handleCallback(config, code, state),
    refreshToken: (refreshToken: string) => refreshAccessToken(config, refreshToken),
    logout: (options?: { postLogoutRedirectUri?: string; idTokenHint?: string }) =>
      redirectToLogout(config, options),
    getReturnPath,
    buildAuthorizationUrl: (options: { state: string; codeChallenge: string }) =>
      buildAuthorizationUrl(config, options),
    buildLogoutUrl: (options?: { postLogoutRedirectUri?: string; idTokenHint?: string }) =>
      buildLogoutUrl(config, options),
  }
}

// Export default configuration helper
export function getDefaultIdentityUrl(): string {
  // Check for environment variable first
  if (typeof process !== 'undefined' && process.env?.HIVE_IDENTITY_URL) {
    return process.env.HIVE_IDENTITY_URL
  }

  // Check for window variable (for client-side apps)
  if (typeof window !== 'undefined') {
    // @ts-ignore
    if (window.__HIVE_IDENTITY_URL__) {
      // @ts-ignore
      return window.__HIVE_IDENTITY_URL__
    }

    // Default based on hostname
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:4010'
    }
  }

  // Production default
  return 'https://id.thepayhive.com'
}

// ============================================================================
// App Switching Utilities
// ============================================================================

/**
 * Hive app configuration returned from hive-identity /api/apps endpoint
 */
export interface HiveApp {
  id: string
  name: string
  description: string
  url: string
  ssoPath: string
  color: string
  letter: string
  adminOnly?: boolean
  current?: boolean
}

/**
 * Response from fetching apps list
 */
export interface FetchAppsResponse {
  apps: HiveApp[]
}

/**
 * Result from generating an SSO token for app switching
 */
export interface SwitchAppResult {
  token: string
  redirect_url: string
  expires_in: number
}

/**
 * Fetch the list of available Hive apps from hive-identity
 *
 * @param identityUrl - The hive-identity URL (e.g., https://id.thepayhive.com)
 * @param currentApp - Optional app ID to mark as current
 * @returns List of Hive apps with their configuration
 */
export async function fetchApps(
  identityUrl: string,
  currentApp?: string
): Promise<HiveApp[]> {
  const url = new URL('/api/apps', identityUrl)
  if (currentApp) {
    url.searchParams.set('current', currentApp)
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Failed to fetch apps: ${response.status}`)
  }

  const data: FetchAppsResponse = await response.json()

  // Transform snake_case from API to camelCase
  return data.apps.map((app) => ({
    id: app.id,
    name: app.name,
    description: app.description,
    url: app.url,
    ssoPath: (app as any).sso_path || app.ssoPath,
    color: app.color,
    letter: app.letter,
    adminOnly: (app as any).admin_only ?? app.adminOnly,
    current: app.current,
  }))
}

/**
 * Generate an SSO token for switching to another Hive app
 *
 * @param identityUrl - The hive-identity URL
 * @param globalUserId - The user's global_user_id from hive-identity
 * @param targetApp - The target app ID to switch to
 * @param ttlSeconds - Optional token TTL (default: 300 seconds)
 * @returns SSO token and redirect URL
 */
export async function switchToApp(
  identityUrl: string,
  globalUserId: string,
  targetApp: string,
  ttlSeconds: number = 300
): Promise<SwitchAppResult> {
  const response = await fetch(`${identityUrl}/api/sso/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: globalUserId,
      service: targetApp,
      ttl_seconds: ttlSeconds,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `Failed to generate SSO token: ${response.status}`)
  }

  return response.json()
}

/**
 * Filter apps based on user permissions
 *
 * @param apps - List of all apps
 * @param allowedApps - User's allowed_apps array (can restrict access to specific apps)
 * @param isAdmin - Whether the user is an admin
 * @returns Filtered list of apps the user can access
 */
export function filterAppsByPermission(
  apps: HiveApp[],
  allowedApps: string[],
  isAdmin: boolean
): HiveApp[] {
  return apps.filter((app) => {
    // Admins can access all apps
    if (isAdmin) {
      return true
    }

    // Admin-only apps require admin status
    if (app.adminOnly) {
      return false
    }

    // Non-admin apps are visible to all authenticated users
    // If allowedApps is non-empty, it acts as a whitelist
    // If allowedApps is empty, show all non-admin apps
    if (allowedApps.length > 0) {
      return allowedApps.includes(app.id)
    }

    return true
  })
}
