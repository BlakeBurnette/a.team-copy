import React from 'react';
import useAuthz from './useAuthz';
import { hasPermission } from './rbac';

export default function RequirePermission({ permission, fallback = null, children }) {
  const { isAuthenticated, isLoading, permissions } = useAuthz();

  if (!permission) return fallback || null;
  if (isLoading) return fallback || null;
  if (!isAuthenticated) return fallback || null;
  if (!hasPermission(permissions, permission)) return fallback || null;

  return <>{children}</>;
}
