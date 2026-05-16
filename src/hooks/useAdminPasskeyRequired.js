// src/hooks/useAdminPasskeyRequired.js
// Hook to check if admin user has passkeys set up
import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '../context/AuthContext';
import { listCredentials } from '../api/webauthn';

export default function useAdminPasskeyRequired() {
  const { profile, roles = [] } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [error, setError] = useState(null);

  const isAdmin = roles.includes('admin') || profile?.role === 'admin';

  const checkPasskeys = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      setHasPasskey(true); // Non-admins don't need passkeys
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listCredentials({});
      const credentials = Array.isArray(data?.credentials)
        ? data.credentials
        : Array.isArray(data) ? data : [];
      setHasPasskey(credentials.length > 0);
    } catch (e) {
      // If the endpoint doesn't exist yet (404), skip the passkey requirement
      if (e?.response?.status === 404) {
        setHasPasskey(true);
      } else {
        setError(e?.message || 'Failed to check passkeys');
        setHasPasskey(false);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    checkPasskeys();
  }, [checkPasskeys]);

  return {
    loading,
    hasPasskey,
    isAdmin,
    error,
    recheckPasskeys: checkPasskeys,
    // Admin needs passkey if they're admin and don't have one
    requiresPasskeySetup: isAdmin && !loading && !hasPasskey,
  };
}
