// src/components/OnboardingBanner.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useUserProfile } from '../context/AuthContext';
import { useBillingStatus } from '../context/BillingStatusContext';
import { X } from 'lucide-react';

const DISMISS_KEY = 'onboarding:banner:dismissed';

export default function OnboardingBanner() {
  const auth = useUserProfile() || {};
  const { status: billingStatus, loading: billingLoading } = useBillingStatus();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const isOwner = auth.isOwner || auth.profile?.role === 'owner' || auth.user?.role === 'owner';

  // Fetch services and customers (billing comes from shared context)
  const [extraData, setExtraData] = useState(null);
  const [extraLoading, setExtraLoading] = useState(true);

  useEffect(() => {
    if (!isOwner || dismissed) {
      setExtraLoading(false);
      return;
    }

    const fetchExtra = async () => {
      try {
        const [servicesRes, customersRes] = await Promise.all([
          axios.get('/api/owner/services', { withCredentials: true }).catch(() => ({ data: [] })),
          axios.get('/api/owner/customers', { withCredentials: true }).catch(() => ({ data: [] })),
        ]);
        setExtraData({
          services: Array.isArray(servicesRes.data) ? servicesRes.data : [],
          customers: Array.isArray(customersRes.data) ? customersRes.data : [],
        });
      } catch (e) {
        console.log('[OnboardingBanner] fetch error:', e);
        setExtraData({ services: [], customers: [] });
      } finally {
        setExtraLoading(false);
      }
    };

    fetchExtra();
  }, [isOwner, dismissed]);

  const loading = billingLoading || extraLoading;

  // Derive status from shared billing context + local data
  const status = billingStatus && extraData ? {
    stripeComplete: billingStatus.stripe_onboarding_complete || billingStatus.charges_enabled,
    servicesCreated: extraData.services.length > 0,
    customersCreated: extraData.customers.length > 0,
  } : null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  // Don't show if not owner, dismissed, loading, or all complete
  if (!isOwner || dismissed || loading) return null;
  if (!status) return null;

  const isComplete = status.stripeComplete && status.servicesCreated && status.customersCreated;
  if (isComplete) return null;

  const completedCount = [status.stripeComplete, status.servicesCreated, status.customersCreated].filter(Boolean).length;
  const totalCount = 3;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            {completedCount}/{totalCount}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm sm:text-base">Finish setting up your business</div>
            <div className="text-xs sm:text-sm text-amber-100 truncate">
              {!status.stripeComplete && 'Complete Stripe verification'}
              {status.stripeComplete && !status.servicesCreated && 'Add your first service'}
              {status.stripeComplete && status.servicesCreated && !status.customersCreated && 'Add your first customer'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/app/settings?tab=Organization"
            className="px-3 sm:px-4 py-1.5 bg-white text-amber-600 rounded-full text-xs sm:text-sm font-semibold hover:bg-amber-50 transition-colors whitespace-nowrap"
          >
            Continue Setup
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
            aria-label="Dismiss for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
