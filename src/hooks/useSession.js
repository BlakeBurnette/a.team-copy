import { useUserProfile } from '../context/AuthContext';

export default function useSession() {
  const { hasRole, profile } = useUserProfile() || {};
  const isAdmin = typeof hasRole === 'function' ? !!hasRole('admin') : false;
  const userId = profile?.id || profile?.user_id || profile?.sub || null;
  return { isAdmin, userId };
}
