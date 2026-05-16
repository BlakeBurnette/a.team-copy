// src/hooks/usePlatformBilling.js
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

export default function usePlatformBilling(authHeader) {
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState({
    loading: true,
    subscription_id: null,
    subscription_status: 'none',
    customer_id: null,
    default_pm: null,
    default_pm_summary: null,
    billing_paused: false,
    next_payment: null,
  });
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const isAuthenticated = !!user && !!user.id;
    const isOwner = String(user?.role || '').toLowerCase() === 'owner';
    if (authLoading || !isAuthenticated || !isOwner) return;
    try {
      setError('');
      setStatus((s) => ({ ...s, loading: true }));
      console.log('[billing-status] fetch', { isAuthenticated, userId: user?.id, role: user?.role });
      const { data } = await axios.get('/api/organization/billing-status', {
        headers: authHeader,
        withCredentials: true,
      });
      if (data?.ok) {
        setStatus({
          loading: false,
          subscription_id: data.platform_subscription_id || null,
          subscription_status: data.subscription_status || 'none',
          customer_id: data.platform_customer_id || null,
          default_pm: typeof data.default_payment_method === 'string'
            ? data.default_payment_method
            : data.default_payment_method?.id || null,
          default_pm_summary: data.default_pm_summary || null,
          billing_paused: data.cancel_at_period_end || data.status === 'canceled' || false,
          next_payment: data.next_payment || null,
        });
      } else {
        setStatus((s) => ({ ...s, loading: false }));
        setError('Failed to load platform billing status');
      }
    } catch (e) {
      setStatus((s) => ({ ...s, loading: false }));
      setError(e?.response?.data?.error || 'Failed to load platform billing status');
    }
  }, [authHeader, authLoading, user]);

  useEffect(() => { reload(); }, [reload]);

  const createSetupIntent = useCallback(
    async (pm_types = ['card', 'us_bank_account']) => {
      const { data } = await axios.post(
        '/api/owner/platform-billing/set-payment-method',
        { pm_types },
        { headers: authHeader, withCredentials: true }
      );
      return data;
    },
    [authHeader]
  );

  const setDefaultPm = useCallback(
    async (payment_method_id, setup_intent_id = null) => {
      const { data } = await axios.post(
        '/api/owner/platform-billing/save-payment-method',
        { payment_method_id, setup_intent_id },
        { headers: authHeader, withCredentials: true }
      );
      await reload();
      return data;
    },
    [authHeader, reload]
  );

  const startSubscription = useCallback(
    async () => {
      const { data } = await axios.post(
        '/api/owner/platform-billing/confirm-subscription',
        {},
        { headers: authHeader, withCredentials: true }
      );
      await reload();
      return data;
    },
    [authHeader, reload]
  );

  const pauseSubscription = useCallback(
    async () => {
      const { data } = await axios.post(
        '/api/owner/platform-billing/cancel',
        {},
        { headers: authHeader, withCredentials: true }
      );
      await reload();
      return data;
    },
    [authHeader, reload]
  );

  const resumeSubscription = useCallback(
    async () => {
      const { data } = await axios.post(
        '/api/owner/platform-billing/restart',
        {},
        { headers: authHeader, withCredentials: true }
      );
      await reload();
      return data;
    },
    [authHeader, reload]
  );

  return {
    status,
    error,
    reload,
    createSetupIntent,
    setDefaultPm,
    startSubscription,
    pauseSubscription,
    resumeSubscription,
  };
}
