/**
 * PayHive SSO Client Library
 *
 * Provides utilities for OAuth2 PKCE authentication flow with hive-identity.
 */
/**
 * Configuration for the SSO client
 */
interface SSOConfig {
    /** The OAuth client ID for this application */
    clientId: string;
    /** The hive-identity URL (e.g., https://id.thepayhive.com) */
    identityUrl: string;
    /** The callback path for this application (e.g., /auth/callback) */
    callbackPath?: string;
}
/**
 * Token response from the OAuth token endpoint
 */
interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    id_token?: string;
    scope?: string;
}
/**
 * Decoded ID token claims
 */
interface IdTokenClaims {
    sub: string;
    email: string;
    name: string;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
}
/**
 * Generate a cryptographically random string
 */
declare function generateRandomString(length: number): string;
/**
 * Generate PKCE code verifier and challenge
 */
declare function generatePKCE(): Promise<{
    verifier: string;
    challenge: string;
}>;
/**
 * Store PKCE verifier and OAuth state in session storage
 */
declare function storePKCEData(verifier: string, state: string, returnPath?: string): void;
/**
 * Retrieve stored PKCE data from session storage
 */
declare function getPKCEData(): {
    verifier: string | null;
    state: string | null;
    returnPath: string | null;
};
/**
 * Clear stored PKCE data from session storage
 */
declare function clearPKCEData(): void;
/**
 * Build the OAuth authorization URL
 */
declare function buildAuthorizationUrl(config: SSOConfig, options: {
    state: string;
    codeChallenge: string;
    returnPath?: string;
    scope?: string;
}): string;
/**
 * Redirect to the SSO login page
 *
 * @param config - SSO configuration
 * @param returnPath - Path to return to after successful login (default: current path)
 */
declare function redirectToLogin(config: SSOConfig, returnPath?: string): Promise<void>;
/**
 * Handle the OAuth callback
 *
 * @param config - SSO configuration
 * @param code - Authorization code from URL
 * @param state - State parameter from URL
 * @returns Token response
 */
declare function handleCallback(config: SSOConfig, code: string, state: string): Promise<TokenResponse>;
/**
 * Get the return path stored during login initiation
 */
declare function getReturnPath(): string;
/**
 * Refresh access token using refresh token
 */
declare function refreshAccessToken(config: SSOConfig, refreshToken: string): Promise<TokenResponse>;
/**
 * Decode a JWT token without verification (client-side only)
 * Note: This does NOT verify the signature - use only for reading claims
 */
declare function decodeIdToken(idToken: string): IdTokenClaims;
/**
 * Build the SSO logout URL
 */
declare function buildLogoutUrl(config: SSOConfig, options?: {
    postLogoutRedirectUri?: string;
    idTokenHint?: string;
}): string;
/**
 * Redirect to SSO logout
 */
declare function redirectToLogout(config: SSOConfig, options?: {
    postLogoutRedirectUri?: string;
    idTokenHint?: string;
}): void;
/**
 * Create an SSO client instance with the given configuration
 */
declare function createSSOClient(config: SSOConfig): {
    login: (returnPath?: string) => Promise<void>;
    handleCallback: (code: string, state: string) => Promise<TokenResponse>;
    refreshToken: (refreshToken: string) => Promise<TokenResponse>;
    logout: (options?: {
        postLogoutRedirectUri?: string;
        idTokenHint?: string;
    }) => void;
    getReturnPath: typeof getReturnPath;
    buildAuthorizationUrl: (options: {
        state: string;
        codeChallenge: string;
    }) => string;
    buildLogoutUrl: (options?: {
        postLogoutRedirectUri?: string;
        idTokenHint?: string;
    }) => string;
};
declare function getDefaultIdentityUrl(): string;
/**
 * Hive app configuration returned from hive-identity /api/apps endpoint
 */
interface HiveApp {
    id: string;
    name: string;
    description: string;
    url: string;
    ssoPath: string;
    color: string;
    letter: string;
    adminOnly?: boolean;
    current?: boolean;
}
/**
 * Response from fetching apps list
 */
interface FetchAppsResponse {
    apps: HiveApp[];
}
/**
 * Result from generating an SSO token for app switching
 */
interface SwitchAppResult {
    token: string;
    redirect_url: string;
    expires_in: number;
}
/**
 * Fetch the list of available Hive apps from hive-identity
 *
 * @param identityUrl - The hive-identity URL (e.g., https://id.thepayhive.com)
 * @param currentApp - Optional app ID to mark as current
 * @returns List of Hive apps with their configuration
 */
declare function fetchApps(identityUrl: string, currentApp?: string): Promise<HiveApp[]>;
/**
 * Generate an SSO token for switching to another Hive app
 *
 * @param identityUrl - The hive-identity URL
 * @param globalUserId - The user's global_user_id from hive-identity
 * @param targetApp - The target app ID to switch to
 * @param ttlSeconds - Optional token TTL (default: 300 seconds)
 * @returns SSO token and redirect URL
 */
declare function switchToApp(identityUrl: string, globalUserId: string, targetApp: string, ttlSeconds?: number): Promise<SwitchAppResult>;
/**
 * Filter apps based on user permissions
 *
 * @param apps - List of all apps
 * @param allowedApps - User's allowed_apps array (can restrict access to specific apps)
 * @param isAdmin - Whether the user is an admin
 * @returns Filtered list of apps the user can access
 */
declare function filterAppsByPermission(apps: HiveApp[], allowedApps: string[], isAdmin: boolean): HiveApp[];

export { type FetchAppsResponse, type HiveApp, type IdTokenClaims, type SSOConfig, type SwitchAppResult, type TokenResponse, buildAuthorizationUrl, buildLogoutUrl, clearPKCEData, createSSOClient, decodeIdToken, fetchApps, filterAppsByPermission, generatePKCE, generateRandomString, getDefaultIdentityUrl, getPKCEData, getReturnPath, handleCallback, redirectToLogin, redirectToLogout, refreshAccessToken, storePKCEData, switchToApp };
