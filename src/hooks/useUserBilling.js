// src/hooks/useUserBilling.js
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useUserBilling
 *
 * Hook for end-customer (role: "user") billing flows on connected accounts.
 * Mirrors your existing usePlatformBilling, but hits /api/users/billing/* endpoints.
 *
 * Params:
 * - authHeader: { Authorization: string } (required)
 * - organizationId: number | null (optional) — defaults to backend auto-resolution
 */
export default function useUserBilling(authHeader, organizationId = null) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);
  const [error, setError]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // track mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const withTimeout = (promise, ms, label = 'request') =>
    Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms)),
    ]);

  const json = async (res) => {
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok) {
      const msg = body?.error || body?.message || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = organizationId ? `?organization_id=${organizationId}` : '';
      const res = await withTimeout(
        fetch(`/api/users/billing/status${qs}`, {
          headers: { 'Content-Type': 'application/json', ...authHeader },
          credentials: 'include',
        }),
        8000,
        'billing/status'
      );
      const data = await json(res);
      if (mountedRef.current) {
        setStatus(data);
        setLastUpdated(Date.now());
      }
    } catch (e) {
      console.error('[useUserBilling] fetchStatus error:', e);
      if (mountedRef.current) {
        // Provide a friendlier message for common status codes
        const friendly =
          (e.status === 401 && 'Your session expired. Please log in again.') ||
          (e.status === 403 && 'Not allowed to view billing for this organization.') ||
          e.message || 'Failed to load';
        setError(friendly);
      }
    } finally {
      mountedRef.current && setLoading(false);
    }
  }, [authHeader, organizationId]);

  const createSetupIntent = useCallback(
    async (pmTypes = ['us_bank_account', 'card']) => {
      const res = await withTimeout(
        fetch(`/api/users/billing/setup-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          credentials: 'include',
          body: JSON.stringify({ pm_types: pmTypes, organization_id: organizationId }),
        }),
        10000,
        'setup-intent'
      );
      return json(res);
    },
    [authHeader, organizationId]
  );

  const setDefaultPaymentMethod = useCallback(
    async (paymentMethodId) => {
      const res = await withTimeout(
        fetch(`/api/users/billing/set-default`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          credentials: 'include',
          body: JSON.stringify({ payment_method_id: paymentMethodId, organization_id: organizationId }),
        }),
        10000,
        'set-default'
      );
      return json(res);
    },
    [authHeader, organizationId]
  );

  const detachPaymentMethod = useCallback(
    async (paymentMethodId) => {
      const res = await withTimeout(
        fetch(`/api/users/billing/detach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          credentials: 'include',
          body: JSON.stringify({ payment_method_id: paymentMethodId, organization_id: organizationId }),
        }),
        10000,
        'detach'
      );
      return json(res);
    },
    [authHeader, organizationId]
  );

  const openPortal = useCallback(async () => {
    const res = await withTimeout(
      fetch(`/api/users/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        credentials: 'include',
        body: JSON.stringify({ organization_id: organizationId }),
      }),
      10000,
      'portal'
    );
    return json(res);
  }, [authHeader, organizationId]);

  // Fetch on mount / when org changes
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  return {
    loading,
    status,
    error,
    lastUpdated,
    refresh: fetchStatus,
    createSetupIntent,
    setDefaultPaymentMethod,
    detachPaymentMethod,
    openPortal,
    clearError: () => setError(null),
  };
}
