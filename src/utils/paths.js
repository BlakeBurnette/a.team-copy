// Normalize any path to a guaranteed /app/... absolute URL.
export function ensureAppPath(p) {
  if (!p) return '/app';
  if (p.startsWith('/app')) return p;
  if (p.startsWith('/')) return `/app${p}`;
  return `/app/${p.replace(/^\/+/, '')}`;
}
