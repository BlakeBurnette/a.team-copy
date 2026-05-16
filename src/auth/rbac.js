function normalizeList(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw
    .map((v) => (typeof v === 'string' || typeof v === 'number') ? String(v).trim() : '')
    .filter(Boolean))];
}

export function extractPermissionsFromClaims(claims) {
  if (!claims || typeof claims !== 'object') return [];
  return normalizeList(claims.permissions);
}

export function extractRolesFromClaims(claims, rolesClaim) {
  if (!claims || typeof claims !== 'object') return [];
  const candidates = [];
  if (rolesClaim) candidates.push(claims[rolesClaim]);
  if ('roles' in claims) candidates.push(claims.roles);
  const combined = candidates.flatMap((c) => normalizeList(c));
  return [...new Set(combined)];
}

export function hasPermission(perms, perm) {
  if (!perm) return false;
  const list = normalizeList(perms);
  return list.includes(String(perm).trim());
}

export function hasAnyPermission(perms, list) {
  if (!Array.isArray(list)) return false;
  return list.some((p) => hasPermission(perms, p));
}

export function hasRole(roles, role) {
  if (!role) return false;
  const list = normalizeList(roles);
  return list.includes(String(role).trim());
}

export function hasAnyRole(roles, list) {
  if (!Array.isArray(list)) return false;
  return list.some((r) => hasRole(roles, r));
}
