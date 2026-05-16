import apiConfig from '../config/apiConfig';

// CSRF token storage
let csrfToken = null;

function buildUrl(path, query) {
  const cleanedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${apiConfig.apiOrigin}${cleanedPath}`);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') return;
      url.searchParams.set(key, String(val));
    });
  }
  return url;
}

function mergeHeaders(base = {}, extra = {}) {
  return Object.entries({ ...base, ...extra }).reduce((acc, [k, v]) => {
    if (v == null) return acc;
    acc[k] = v;
    return acc;
  }, {});
}

// Fetch CSRF token from /api/me
export async function fetchCsrfToken() {
  try {
    const url = buildUrl('/api/me');
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      if (data.csrfToken) {
        csrfToken = data.csrfToken;
        return csrfToken;
      }
    }
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
  }
  return null;
}

// Clear CSRF token (call on logout)
export function clearCsrfToken() {
  csrfToken = null;
}

// Get current CSRF token
export function getCsrfToken() {
  return csrfToken;
}

export async function apiFetch(path, { method = 'GET', headers = {}, body, token, query } = {}) {
  let url = buildUrl(path, query);
  const opts = { method, headers: {}, credentials: 'include' };

  if (body !== undefined) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    opts.headers['Content-Type'] = 'application/json';
  }

  // Add CSRF token for state-changing requests
  if (method && method !== 'GET' && csrfToken) {
    opts.headers['X-CSRF-Token'] = csrfToken;
  }

  opts.headers = mergeHeaders(opts.headers, headers);

  let response;
  try {
    response = await fetch(url.toString(), opts);
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: { code: 'network_error', message: e?.message || 'Network error' },
      requestId: null,
    };
  }

  const requestId = response.headers?.get?.('x-request-id') || null;
  const status = response.status;
  const text = await response.text();

  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (response.ok) {
    return { ok: true, status, data: parsed, requestId };
  }

  const errorObj = parsed && typeof parsed === 'object' ? parsed.error || parsed : null;
  const code = errorObj?.code || errorObj?.error || 'unknown_error';
  const message = errorObj?.message || 'Request failed';
  const details = errorObj?.details || null;

  return {
    ok: false,
    status,
    error: { code, message, details },
    requestId,
  };
}

export default apiFetch;
