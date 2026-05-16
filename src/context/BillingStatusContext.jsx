// src/context/BillingStatusContext.jsx
// Shared billing status to avoid duplicate /api/organization/billing-status calls
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useUserProfile } from './AuthContext';

const BillingStatusContext = createContext(null);

// Cache TTL in ms (30 seconds)
const CACHE_TTL = 30000;

export function BillingStatusProvider({ children }) {
  const auth = useUserProfile() || {};
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef(0);
  const fetchingRef = useRef(false);

  const isOwner = auth.isOwner || auth.profile?.role === 'owner' || auth.user?.role === 'owner';

  const fetchStatus = useCallback(async (force = false) => {
    // Skip if not owner
    if (!isOwner) {
      setLoading(false);
      return null;
    }

    // Skip if already fetching
    if (fetchingRef.current) {
      return status;
    }

    // Skip if cache is still valid (unless forced)
    const now = Date.now();
    if (!force && status && (now - lastFetchRef.current) < CACHE_TTL) {
      return status;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get('/api/organization/billing-status', {
        withCredentials: true,
      });

      const newStatus = {
        ok: data.ok,
        billing_enabled: data.billing_enabled,
        stripe_account_id: data.stripe_account_id,
        charges_enabled: data.charges_enabled,
        payouts_enabled: data.payouts_enabled,
        details_submitted: data.details_submitted,
        stripe_onboarding_complete: data.stripe_onboarding_complete,
        // Platform billing fields (if present)
        platform_customer_id: data.platform_customer_id,
        platform_subscription_id: data.platform_subscription_id,
        subscription_status: data.subscription_status,
        default_payment_method: data.default_payment_method,
        default_pm_summary: data.default_pm_summary,
        next_payment: data.next_payment,
        cancel_at_period_end: data.cancel_at_period_end,
        amount_preview_cents: data.amount_preview_cents,
      };

      setStatus(newStatus);
      lastFetchRef.current = Date.now();
      return newStatus;
    } catch (e) {
      console.error('[BillingStatusContext] fetch error:', e);
      setError(e?.response?.data?.error || e?.message || 'Failed to load billing status');
      return null;
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [isOwner, status]);

  // Fetch on mount if owner
  useEffect(() => {
    if (isOwner && !status && !fetchingRef.current) {
      fetchStatus();
    } else if (!isOwner) {
      setLoading(false);
    }
  }, [isOwner, status, fetchStatus]);

  const refresh = useCallback(() => fetchStatus(true), [fetchStatus]);

  return (
    <BillingStatusContext.Provider value={{ status, loading, error, refresh, isOwner }}>
      {children}
    </BillingStatusContext.Provider>
  );
}

export function useBillingStatus() {
  const context = useContext(BillingStatusContext);
  if (!context) {
    // Return a fallback for components outside the provider
    return { status: null, loading: true, error: null, refresh: () => {}, isOwner: false };
  }
  return context;
}

export default BillingStatusContext;
