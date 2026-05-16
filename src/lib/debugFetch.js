import { traceHeaders } from './trace';

export async function debugFetch(traceId, url, options = {}) {
  const opts = { ...(options || {}) };
  opts.credentials = 'include';
  const headers = {
    ...(opts.headers || {}),
    ...traceHeaders(traceId),
  };
  // Force no-cache for auth/me
  if (typeof url === 'string' && url.includes('/api/auth/me')) {
    headers['Cache-Control'] = 'no-store';
    headers.Pragma = 'no-cache';
  }
  opts.headers = headers;

  const method = (opts.method || 'GET').toUpperCase();
  console.log('[http] ->', { traceId, method, url, credentials: opts.credentials });
  const res = await fetch(url, opts);
  console.log('[http] <-', { traceId, method, url, status: res.status, ok: res.ok, redirected: res.redirected });
  let data = null;
  try { data = await res.json(); } catch {}
  console.log('[http] body', {
    traceId,
    url,
    hasOk: !!data?.ok,
    userId: data?.user?.id ?? null,
  });
  return { res, data };
}
