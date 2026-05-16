import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserProfile } from './context/AuthContext';

const PrivateRoute = ({ children, requiredRole, requiredPermissions = [] }) => {
  const location = useLocation();
  const ctx = useUserProfile() || {};
  const { user, profile, roles = [], permissions = [], loading, loadingProfile, hasRole, login } = ctx;

  const currentUser = user || profile;
  const isLoading = loading || loadingProfile;

  // Redirect unauthenticated users directly to hive-identity PKCE flow
  useEffect(() => {
    if (!isLoading && !currentUser && login) {
      const returnPath = location.pathname + location.search;
      login(returnPath);
    }
  }, [isLoading, currentUser, login, location]);

  if (isLoading || !currentUser) {
    return <div className="p-6 text-gray-600">Loading...</div>;
  }

  if (requiredRole) {
    if (typeof hasRole === 'function' ? !hasRole(requiredRole) : !(roles || []).includes(requiredRole)) {
      return (
        <div className="p-6 text-red-600">
          You do not have permission to access this page.
        </div>
      );
    }
  }

  if (requiredPermissions.length > 0) {
    const list = Array.isArray(permissions) ? permissions : [];
    const hasAll = requiredPermissions.every((p) => list.includes(p));
    if (!hasAll) {
      return (
        <div className="p-6 text-red-600">
          You do not have permission to access this page.
        </div>
      );
    }
  }

  return children;
};

export default PrivateRoute;
