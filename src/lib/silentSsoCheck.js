/**
 * Silent SSO Check
 *
 * Attempts to authenticate via hive-identity's silent SSO check endpoint.
 * This enables cross-domain single sign-on across Hive apps.
 *
 * Flow:
 * 1. App detects no local session
 * 2. Redirect to hive-identity /api/sso/check with redirect_uri and app ID
 * 3. hive-identity checks for existing session cookie
 * 4. If valid: redirects back with SSO token
 * 5. If no session: redirects back with error=not_authenticated
 */

const SSO_CHECK_KEY = 'sso_check_attempted';
const SSO_CHECK_EXPIRY_KEY = 'sso_check_expiry';
const CHECK_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if we've recently attempted silent SSO
 */
export function hasSsoCheckBeenAttempted() {
  try {
    const attempted = sessionStorage.getItem(SSO_CHECK_KEY);
    const expiry = sessionStorage.getItem(SSO_CHECK_EXPIRY_KEY);

    if (!attempted || !expiry) return false;

    // Check if the attempt has expired
    if (Date.now() > parseInt(expiry, 10)) {
      clearSsoCheckAttempt();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Mark that we've attempted silent SSO check
 */
export function markSsoCheckAttempted() {
  try {
    sessionStorage.setItem(SSO_CHECK_KEY, 'true');
    sessionStorage.setItem(SSO_CHECK_EXPIRY_KEY, String(Date.now() + CHECK_EXPIRY_MS));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear the SSO check attempt flag
 */
export function clearSsoCheckAttempt() {
  try {
    sessionStorage.removeItem(SSO_CHECK_KEY);
    sessionStorage.removeItem(SSO_CHECK_EXPIRY_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if current URL indicates we're returning from SSO check
 * Returns the error type if present, null otherwise
 */
export function getSsoCheckError() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('error');
}

/**
 * Perform silent SSO check by redirecting to hive-identity
 *
 * @param {Object} config
 * @param {string} config.identityUrl - hive-identity base URL
 * @param {string} config.appId - The app identifier (e.g., 'payhive')
 * @param {string} [config.redirectPath] - Path to redirect to after SSO (default: /auth/sso)
 * @param {string} [config.loginUrl] - Optional login URL if user is not authenticated
 */
export function performSilentSsoCheck({ identityUrl, appId, redirectPath = '/auth/sso', loginUrl }) {
  if (typeof window === 'undefined') return;

  // Don't attempt if we've already tried recently
  if (hasSsoCheckBeenAttempted()) {
    return;
  }

  // Mark that we're attempting
  markSsoCheckAttempted();

  // Build the redirect URI (where hive-identity will send the user back)
  const redirectUri = `${window.location.origin}${redirectPath}`;

  // Build the SSO check URL
  const ssoCheckUrl = new URL(`${identityUrl}/api/sso/check`);
  ssoCheckUrl.searchParams.set('redirect_uri', redirectUri);
  ssoCheckUrl.searchParams.set('app', appId);

  if (loginUrl) {
    ssoCheckUrl.searchParams.set('login_url', loginUrl);
  }

  // Redirect to hive-identity for silent check
  window.location.href = ssoCheckUrl.toString();
}

/**
 * Check if silent SSO should be attempted
 *
 * @param {Object} options
 * @param {boolean} options.hasSession - Whether the app has a local session
 * @param {string[]} [options.excludePaths] - Paths where SSO check should be skipped
 * @returns {boolean}
 */
export function shouldAttemptSilentSso({ hasSession, excludePaths = [] }) {
  if (typeof window === 'undefined') return false;

  // Already have a session
  if (hasSession) return false;

  // Already attempted recently
  if (hasSsoCheckBeenAttempted()) return false;

  // Check if we're returning with an error (don't retry)
  if (getSsoCheckError()) return false;

  // Check if current path should be excluded
  const currentPath = window.location.pathname;

  // Default excluded paths
  const defaultExcluded = [
    '/',           // Landing page
    '/login',      // Login page
    '/auth/sso',   // SSO callback
    '/auth/callback',
    '/signup',
    '/reset-password',
    '/forgot-password',
  ];

  const allExcluded = [...defaultExcluded, ...excludePaths];

  for (const path of allExcluded) {
    if (currentPath === path || currentPath.startsWith(`${path}/`)) {
      return false;
    }
  }

  return true;
}
