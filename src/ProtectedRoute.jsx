import React, { useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserProfile } from './context/AuthContext';

/**
 * Usage:
 * <ProtectedRoute roles={['owner','admin']}>
 *   <Page />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ roles = [], permissions = [], children }) {
  const location = useLocation();
  const ctx = useUserProfile() || {};
  const {
    user,
    profile,
    roles: userRoles = [],
    permissions: userPermissions = [],
    loading,
    loadingProfile,
    profileError,
    hasRole,
    refreshMe,
    login,
  } = ctx;

  const currentUser = user || profile;
  const isLoading = loading || loadingProfile;

  // Opportunistically refresh the session if we're missing a user object.
  useEffect(() => {
    if (!currentUser && typeof refreshMe === 'function') {
      refreshMe().catch(() => {});
    }
  }, [currentUser, refreshMe]);

  // Redirect unauthenticated users directly to hive-identity PKCE flow
  useEffect(() => {
    if (!isLoading && !currentUser && login) {
      const returnPath = location.pathname + location.search;
      login(returnPath);
    }
  }, [isLoading, currentUser, login, location]);

  const isAllowed = useMemo(() => {
    if (!roles || roles.length === 0) return true;
    if (typeof hasRole === 'function') return roles.some(r => hasRole(r));
    const list = Array.isArray(userRoles) ? [...userRoles] : [];
    if (currentUser?.role && !list.includes(currentUser.role)) list.push(currentUser.role);
    return roles.some(r => list.includes(r));
  }, [roles, hasRole, userRoles, currentUser]);

  const hasPermissions = useMemo(() => {
    if (!permissions || permissions.length === 0) return true;
    const list = Array.isArray(userPermissions) ? userPermissions : [];
    return permissions.every((p) => list.includes(p));
  }, [permissions, userPermissions]);

  if (isLoading || !currentUser) {
    return <div className="p-6 text-neutral-600">Checking access…</div>;
  }

  if (profileError) {
    return (
      <div className="p-6 text-red-600">
        Authentication error: {String(profileError?.message || profileError)}
      </div>
    );
  }

  if (!isAllowed || !hasPermissions) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
