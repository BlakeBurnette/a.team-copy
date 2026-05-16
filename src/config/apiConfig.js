const ENV_KEYS = {
  apiOrigin: ['VITE_API_ORIGIN', 'REACT_APP_API_ORIGIN'],
  identityUrl: ['VITE_HIVE_IDENTITY_URL', 'REACT_APP_HIVE_IDENTITY_URL'],
  ssoClientId: ['VITE_SSO_CLIENT_ID', 'REACT_APP_SSO_CLIENT_ID'],
  useQueryTokenFallback: ['VITE_API_USE_QUERY_TOKEN_FALLBACK', 'REACT_APP_API_USE_QUERY_TOKEN_FALLBACK'],
};

function readEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta?.env && key in import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process?.env && key in process.env) {
    return process.env[key];
  }
  return undefined;
}

function pickFirst(keys) {
  for (const k of keys) {
    const val = readEnv(k);
    if (val !== undefined) return val;
  }
  return undefined;
}

function requireUrl(keys) {
  const val = pickFirst(keys);
  if (!val || typeof val !== 'string') {
    throw new Error(`[config] Missing required API origin. Set one of: ${keys.join(', ')}`);
  }
  try {
    const url = new URL(val.trim());
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`[config] Invalid API origin URL. Set a valid URL in: ${keys.join(', ')}`);
  }
}

// Accept env with or without "/api" and normalize to the bare origin (no trailing /api).
const apiOriginRaw = requireUrl(ENV_KEYS.apiOrigin).replace(/\/+$/, '');
const apiOrigin = apiOriginRaw.toLowerCase().endsWith('/api')
  ? apiOriginRaw.slice(0, -4)
  : apiOriginRaw;

const fallbackRaw = pickFirst(ENV_KEYS.useQueryTokenFallback);
const useQueryTokenFallback = String(fallbackRaw || '').toLowerCase() === 'true';

// Identity URL for SSO - defaults based on environment.
// Prefer the API host (api.id.thepayhive.com) in prod so server routes
// like /api/auth/token/exchange resolve; fall back to id.thepayhive.com.
const identityUrlRaw = pickFirst(ENV_KEYS.identityUrl);
const identityUrl = identityUrlRaw
  ? identityUrlRaw.replace(/\/+$/, '')
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4010'
    : 'https://api.id.thepayhive.com');

const ssoClientIdRaw = pickFirst(ENV_KEYS.ssoClientId);
const ssoClientId = (ssoClientIdRaw && String(ssoClientIdRaw).trim()) || 'payhive';

export const apiConfig = {
  apiOrigin,
  apiBasePath: `${apiOrigin}/api`,
  identityUrl,
  ssoClientId,
  useQueryTokenFallback,
};

export default apiConfig;
