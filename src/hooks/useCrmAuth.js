import { useUserProfile } from '../context/AuthContext';

/**
 * Thin adapter so CRM pages can call useAuth() and get the shape they expect
 * from the original CRM AuthContext.
 */
export function useAuth() {
  const ctx = useUserProfile();
  return {
    user: ctx?.profile,
    workspace: null,
    loading: ctx?.loading,
    isAdmin: ctx?.isAdmin || ctx?.isOwner,
    isSuperAdmin: ctx?.isSuperAdmin,
    isInternalAdmin: ctx?.isSuperAdmin,
  };
}
