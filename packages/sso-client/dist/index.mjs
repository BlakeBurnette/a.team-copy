// src/index.ts
var PKCE_VERIFIER_KEY = "pkce_verifier";
var OAUTH_STATE_KEY = "oauth_state";
var RETURN_PATH_KEY = "sso_return_path";
function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function generatePKCE() {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const verifier = base64UrlEncode(verifierBytes.buffer);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64UrlEncode(hash);
  return { verifier, challenge };
}
function storePKCEData(verifier, state, returnPath) {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  if (returnPath) {
    sessionStorage.setItem(RETURN_PATH_KEY, returnPath);
  }
}
function getPKCEData() {
  return {
    verifier: sessionStorage.getItem(PKCE_VERIFIER_KEY),
    state: sessionStorage.getItem(OAUTH_STATE_KEY),
    returnPath: sessionStorage.getItem(RETURN_PATH_KEY)
  };
}
function clearPKCEData() {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
}
function buildAuthorizationUrl(config, options) {
  const { clientId, identityUrl, callbackPath = "/auth/callback" } = config;
  const { state, codeChallenge, scope } = options;
  const redirectUri = `${window.location.origin}${callbackPath}`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });
  if (scope) {
    params.set("scope", scope);
  }
  return `${identityUrl}/oauth/authorize?${params.toString()}`;
}
async function redirectToLogin(config, returnPath) {
  const { verifier, challenge } = await generatePKCE();
  const state = generateRandomString(32);
  const currentPath = returnPath || window.location.pathname + window.location.search;
  storePKCEData(verifier, state, currentPath);
  const authUrl = buildAuthorizationUrl(config, {
    state,
    codeChallenge: challenge,
    returnPath: currentPath
  });
  window.location.href = authUrl;
}
async function handleCallback(config, code, state) {
  const { verifier, state: storedState, returnPath } = getPKCEData();
  if (!storedState || state !== storedState) {
    clearPKCEData();
    throw new Error("Invalid state parameter - possible CSRF attack");
  }
  if (!verifier) {
    clearPKCEData();
    throw new Error("No PKCE verifier found - session may have expired");
  }
  const { clientId, identityUrl, callbackPath = "/auth/callback" } = config;
  const redirectUri = `${window.location.origin}${callbackPath}`;
  const response = await fetch(`${identityUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "token_exchange_failed" }));
    clearPKCEData();
    throw new Error(error.error_description || error.error || "Token exchange failed");
  }
  const tokens = await response.json();
  clearPKCEData();
  return tokens;
}
function getReturnPath() {
  return sessionStorage.getItem(RETURN_PATH_KEY) || "/";
}
async function refreshAccessToken(config, refreshToken) {
  const { clientId, identityUrl } = config;
  const response = await fetch(`${identityUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "refresh_failed" }));
    throw new Error(error.error_description || error.error || "Token refresh failed");
  }
  return response.json();
}
function decodeIdToken(idToken) {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decoded);
}
function buildLogoutUrl(config, options) {
  const { identityUrl } = config;
  const params = new URLSearchParams();
  if (options?.postLogoutRedirectUri) {
    params.set("post_logout_redirect_uri", options.postLogoutRedirectUri);
  }
  if (options?.idTokenHint) {
    params.set("id_token_hint", options.idTokenHint);
  }
  const queryString = params.toString();
  return `${identityUrl}/oauth/logout${queryString ? `?${queryString}` : ""}`;
}
function redirectToLogout(config, options) {
  const logoutUrl = buildLogoutUrl(config, {
    postLogoutRedirectUri: options?.postLogoutRedirectUri || window.location.origin,
    idTokenHint: options?.idTokenHint
  });
  window.location.href = logoutUrl;
}
function createSSOClient(config) {
  return {
    login: (returnPath) => redirectToLogin(config, returnPath),
    handleCallback: (code, state) => handleCallback(config, code, state),
    refreshToken: (refreshToken) => refreshAccessToken(config, refreshToken),
    logout: (options) => redirectToLogout(config, options),
    getReturnPath,
    buildAuthorizationUrl: (options) => buildAuthorizationUrl(config, options),
    buildLogoutUrl: (options) => buildLogoutUrl(config, options)
  };
}
function getDefaultIdentityUrl() {
  if (typeof process !== "undefined" && process.env?.HIVE_IDENTITY_URL) {
    return process.env.HIVE_IDENTITY_URL;
  }
  if (typeof window !== "undefined") {
    if (window.__HIVE_IDENTITY_URL__) {
      return window.__HIVE_IDENTITY_URL__;
    }
    if (window.location.hostname === "localhost") {
      return "http://localhost:4010";
    }
  }
  return "https://id.thepayhive.com";
}
async function fetchApps(identityUrl, currentApp) {
  const url = new URL("/api/apps", identityUrl);
  if (currentApp) {
    url.searchParams.set("current", currentApp);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch apps: ${response.status}`);
  }
  const data = await response.json();
  return data.apps.map((app) => ({
    id: app.id,
    name: app.name,
    description: app.description,
    url: app.url,
    ssoPath: app.sso_path || app.ssoPath,
    color: app.color,
    letter: app.letter,
    adminOnly: app.admin_only ?? app.adminOnly,
    current: app.current
  }));
}
async function switchToApp(identityUrl, globalUserId, targetApp, ttlSeconds = 300) {
  const response = await fetch(`${identityUrl}/api/sso/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id: globalUserId,
      service: targetApp,
      ttl_seconds: ttlSeconds
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `Failed to generate SSO token: ${response.status}`);
  }
  return response.json();
}
function filterAppsByPermission(apps, allowedApps, isAdmin) {
  return apps.filter((app) => {
    if (isAdmin) {
      return true;
    }
    if (app.adminOnly) {
      return false;
    }
    if (allowedApps.length > 0) {
      return allowedApps.includes(app.id);
    }
    return true;
  });
}
export {
  buildAuthorizationUrl,
  buildLogoutUrl,
  clearPKCEData,
  createSSOClient,
  decodeIdToken,
  fetchApps,
  filterAppsByPermission,
  generatePKCE,
  generateRandomString,
  getDefaultIdentityUrl,
  getPKCEData,
  getReturnPath,
  handleCallback,
  redirectToLogin,
  redirectToLogout,
  refreshAccessToken,
  storePKCEData,
  switchToApp
};
