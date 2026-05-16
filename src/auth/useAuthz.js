import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export default function useAuthz() {
  const { user, profile, roles = [], permissions = [], loading, loadingProfile } = useAuth() || {};
  const currentUser = user || profile;
  const isLoading = !!(loading || loadingProfile);

  return useMemo(() => ({
    isAuthenticated: !!currentUser,
    isLoading,
    user: currentUser,
    roles,
    permissions,
  }), [currentUser, isLoading, roles, permissions]);
}
