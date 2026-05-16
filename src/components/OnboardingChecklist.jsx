// src/components/OnboardingChecklist.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useUserProfile } from '../context/AuthContext';
import { useBillingStatus } from '../context/BillingStatusContext';
import { Check, Circle, ArrowRight } from 'lucide-react';

const ChecklistItem = ({ done, title, description, linkTo, linkLabel }) => (
  <div className={`flex items-start gap-3 p-4 rounded-lg border ${done ? 'bg-green-50 border-green-200' : 'bg-white border-neutral-200'}`}>
    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'border-2 border-neutral-300'}`}>
      {done ? <Check className="w-4 h-4" /> : <Circle className="w-3 h-3 text-neutral-300" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className={`font-medium ${done ? 'text-green-800' : 'text-neutral-800'}`}>{title}</div>
      <div className={`text-sm ${done ? 'text-green-600' : 'text-neutral-500'}`}>{description}</div>
      {!done && linkTo && (
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          {linkLabel || 'Get started'} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  </div>
);

export default function OnboardingChecklist() {
  const auth = useUserProfile() || {};
  const { status: billingStatus, loading: billingLoading } = useBillingStatus();
  const [extraData, setExtraData] = useState(null);
  const [extraLoading, setExtraLoading] = useState(true);

  const isOwner = auth.isOwner || auth.profile?.role === 'owner' || auth.user?.role === 'owner';

  // Only fetch services/customers (billing comes from shared context)
  useEffect(() => {
    if (!isOwner) {
      setExtraLoading(false);
      return;
    }

    const fetchExtra = async () => {
      try {
        const [servicesRes, customersRes] = await Promise.all([
          axios.get('/api/owner/services', { withCredentials: true }).catch(() => ({ data: [] })),
          axios.get('/api/owner/customers', { withCredentials: true }).catch(() => ({ data: [] })),
        ]);

        const services = Array.isArray(servicesRes.data) ? servicesRes.data : [];
        const customers = Array.isArray(customersRes.data) ? customersRes.data : [];

        setExtraData({ services, customers });
      } catch (e) {
        console.warn('OnboardingChecklist extra fetch failed:', e);
        setExtraData({ services: [], customers: [] });
      } finally {
        setExtraLoading(false);
      }
    };

    fetchExtra();
  }, [isOwner]);

  const loading = billingLoading || extraLoading;

  // Derive status from shared billing context + local data
  const status = billingStatus && extraData ? {
    stripeComplete: billingStatus.stripe_onboarding_complete || billingStatus.charges_enabled,
    paymentMethodAdded: !!billingStatus.default_payment_method,
    subscriptionActive: billingStatus.subscription_status === 'active',
    servicesCreated: extraData.services.length > 0,
    servicesCount: extraData.services.length,
    customersCreated: extraData.customers.length > 0,
    customersCount: extraData.customers.length,
  } : null;

  if (!isOwner) return null;
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-neutral-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-neutral-200 rounded w-1/3"></div>
          <div className="h-16 bg-neutral-100 rounded"></div>
          <div className="h-16 bg-neutral-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const items = [
    {
      key: 'stripe',
      done: status.stripeComplete,
      title: 'Complete Stripe verification',
      description: status.stripeComplete
        ? 'Your Stripe account is verified and ready to accept payments'
        : 'Verify your identity to accept customer payments',
      linkTo: '/app/settings?tab=Billing',
      linkLabel: 'Resume verification',
    },
    {
      key: 'services',
      done: status.servicesCreated,
      title: 'Add your services',
      description: status.servicesCreated
        ? `You have ${status.servicesCount} service${status.servicesCount !== 1 ? 's' : ''} set up`
        : 'Define the services you offer and their pricing',
      linkTo: '/app/admin/services',
      linkLabel: 'Add services',
    },
    {
      key: 'customers',
      done: status.customersCreated,
      title: 'Add your customers',
      description: status.customersCreated
        ? `You have ${status.customersCount} customer${status.customersCount !== 1 ? 's' : ''} added`
        : 'Add your first customer to start scheduling services',
      linkTo: '/app/customers',
      linkLabel: 'Add customers',
    },
    // Payment method and subscription are optional (premium feature - coming soon)
  ];

  const completedCount = items.filter(i => i.done).length;
  const allComplete = completedCount === items.length;

  if (allComplete) return null;

  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="bg-white rounded-lg shadow border border-neutral-200">
      <div className="px-4 py-3 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-neutral-800">Setup Checklist</h3>
          <span className="text-sm text-neutral-500">{completedCount} of {items.length} complete</span>
        </div>
        <div className="mt-2 h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {items.map(({ key, ...itemProps }) => (
          <ChecklistItem key={key} {...itemProps} />
        ))}
      </div>
    </div>
  );
}
