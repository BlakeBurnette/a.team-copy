import useSession from './useSession';

export default function useIsAdmin() {
  const { isAdmin } = useSession();
  return !!isAdmin;
}
