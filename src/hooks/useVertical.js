import { useUserProfile } from '../context/AuthContext';
import { getVerticalConfig } from '../config/verticals';

export default function useVertical() {
  const { user } = useUserProfile();
  const vertical = user?.organization?.vertical || null;
  const config = getVerticalConfig(vertical);
  return { vertical, ...config };
}
