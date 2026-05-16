import {
  extractPermissionsFromClaims,
  extractRolesFromClaims,
  hasPermission,
  hasAnyPermission,
  hasRole,
  hasAnyRole,
} from '../auth/rbac';

describe('rbac helpers', () => {
  it('extracts permissions from claims.permissions', () => {
    const claims = { permissions: ['read:all', 'read:all', 'payments:view ', 42, null] };
    expect(extractPermissionsFromClaims(claims)).toEqual(['read:all', 'payments:view', '42']);
    expect(extractPermissionsFromClaims(null)).toEqual([]);
  });

  it('extracts roles from custom claim and roles fallback', () => {
    const claims = {
      'https://example.com/roles': ['admin', 'admin', 'manager '],
      roles: ['viewer'],
    };
    expect(extractRolesFromClaims(claims, 'https://example.com/roles')).toEqual(['admin', 'manager', 'viewer']);
    expect(extractRolesFromClaims({}, 'https://example.com/roles')).toEqual([]);
  });

  it('checks permissions correctly', () => {
    const perms = ['read:all', 'payments:view'];
    expect(hasPermission(perms, 'read:all')).toBe(true);
    expect(hasPermission(perms, 'missing')).toBe(false);
    expect(hasAnyPermission(perms, ['missing', 'payments:view'])).toBe(true);
    expect(hasAnyPermission(perms, ['missing'])).toBe(false);
  });

  it('checks roles correctly', () => {
    const roles = ['admin', 'owner'];
    expect(hasRole(roles, 'owner')).toBe(true);
    expect(hasRole(roles, 'user')).toBe(false);
    expect(hasAnyRole(roles, ['user', 'admin'])).toBe(true);
    expect(hasAnyRole(roles, ['user'])).toBe(false);
  });
});
