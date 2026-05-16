import { useUserProfile } from '../context/AuthContext';

export function useAuth() {
  const ctx = useUserProfile();
  return {
    user: ctx?.profile ? {
      ...ctx.profile,
      name: ctx.profile.name || `${ctx.profile.first_name || ''} ${ctx.profile.last_name || ''}`.trim(),
    } : null,
    loading: ctx?.loading,
    isAuthenticated: !!ctx?.profile,
  };
}
