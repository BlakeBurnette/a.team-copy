// src/components/owner/PlatformBillingPanel.jsx
// v2.8.8 — remove manual Refresh buttons and Change Due Day UI; keep all other behaviors
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Toast from '../../components/Toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { createPortal } from 'react-dom';
import { useUserProfile } from '../../context/AuthContext';

const PK = import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = PK ? loadStripe(PK) : null;

function fmtUsd(cents) {
  const n = Math.max(0, Number(cents || 0));
  return (n / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}
function isoToLocal(iso) { try { return iso ? new Date(iso).toLocaleString() : '—'; } catch { return '—'; } }

function calcMonthlyCents(userCount) {
  const n = Math.max(0, Number(userCount) || 0);
  const cap = 34900;
  let remaining = n;
  let cents = 0;
  const tiers = [
    { size: 50, rate: 300 },
    { size: 100, rate: 200 },
    { size: 150, rate: 100 },
    { size: Infinity, rate: 50 },
  ];
  for (const { size, rate } of tiers) {
    if (remaining <= 0) break;
    const chunk = size === Infinity ? remaining : Math.min(remaining, size);
    cents += chunk * rate;
    remaining -= chunk;
  }
  return Math.min(cents, cap);
}

const withTimeout = (p, ms, label = 'request') =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);

const Card = ({ title, right, children }) => (
  <div className="rounded-lg border border-neutral-200 bg-white">
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <div className="text-sm font-semibold">{title}</div>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/* --------------------------- Setup PM Modal --------------------------- */
function SetupPmModal({ open, onClose, authHeader, onSaved }) {
  const [clientSecret, setClientSecret] = useState('');
  const [err, setErr] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open) return;
      setErr('');
      setClientSecret('');

      if (!PK || !stripePromise) {
        setErr('Stripe publishable key is not configured.');
        return;
      }

      setLoading(true);
      try {
        const { data } = await axios.post(
          '/api/owner/platform-billing/set-payment-method',
          {},
          { headers: authHeader, withCredentials: true }
        );
        if (!mounted) return;
        if (data?.client_secret) setClientSecret(data.client_secret);
        else setErr('Could not start payment method setup.');
      } catch (e) {
        if (!mounted) return;
        const code = e?.response?.status;
        const msg =
          (code === 401 && 'You need to sign in as an owner to add a payment method.') ||
          (code === 403 && 'You are not permitted to add a payment method for this org.') ||
          e?.response?.data?.error ||
          'Failed to create SetupIntent.';
        setErr(String(msg));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, authHeader]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="
          fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2
          md:-translate-x-1/2 md:-translate-y-1/2
          w-full md:w-[640px]
          bg-white rounded-t-2xl md:rounded-2xl shadow-xl
          max-h-[90vh] overflow-y-auto
          p-0
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Add / Update payment method</div>
          <button className="p-2 -mr-2" aria-label="Close" onClick={onClose}>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-4 pt-2 max-h-[70vh] overflow-y-auto">
          {err && (
            <div className="mb-3 text-sm text-red-600">
              {err}
              {(err.includes('sign in') || err.includes('permitted')) && (
                <div className="mt-2 text-xs text-neutral-600">
                  You can finish onboarding now and add billing later from <strong>Settings → Organization</strong>.
                </div>
              )}
            </div>
          )}

          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { labels: 'floating' } }}>
              <SetupPmForm
                billingName={billingName}
                billingEmail={billingEmail}
                setBillingName={setBillingName}
                setBillingEmail={setBillingEmail}
                onClose={onClose}
                onSaved={onSaved}
                setErr={setErr}
                authHeader={authHeader}
              />
            </Elements>
          ) : (
            !err && (
              <div className="py-6 text-sm text-gray-600">
                {loading ? 'Starting…' : 'Waiting to start…'}
              </div>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function SetupPmForm({
  billingName, billingEmail, setBillingName, setBillingEmail,
  onClose, onSaved, setErr, authHeader
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!stripe || !elements) return;

    setSaving(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: billingName?.trim() || 'Billing Contact',
              email: billingEmail?.trim() || undefined,
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        setErr(error.message || 'Could not confirm payment method');
        return;
      }

      const status = setupIntent?.status;
      const setupIntentId = setupIntent?.id || null;
      const pmId =
        setupIntent?.payment_method ||
        setupIntent?.latest_payment_method ||
        null;

      try {
        await axios.post(
          '/api/owner/platform-billing/save-payment-method',
          { setup_intent_id: setupIntentId, payment_method_id: pmId || undefined },
          { headers: authHeader, withCredentials: true }
        );
      } catch (eSave) {
        const msg = eSave?.response?.data?.error || eSave?.message || 'Save failed (will retry via webhook).';
        setErr(`Saved with Stripe. ${msg}`);
      }

      try { await axios.post('/api/owner/platform-billing/confirm-subscription', {}, { headers: authHeader, withCredentials: true }); } catch {}

      const ok = new Set(['succeeded', 'requires_action', 'processing']);
      if (ok.has(status)) {
        onSaved?.();
        onClose();
      } else {
        setErr(`Unexpected status: ${status || 'unknown'}`);
      }
    } catch (e2) {
      setErr(e2?.message || 'Failed to confirm payment method');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Billing name</label>
          <input
            className="border p-2 w-full"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            placeholder="Jane Smith"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Billing email (optional)</label>
          <input
            type="email"
            className="border p-2 w-full"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder="billing@company.com"
          />
        </div>
      </div>

      <div className="mt-2">
        <div style={{ overflow: 'visible', WebkitOverflowScrolling: 'auto' }}>
          <PaymentElement
            options={{
              fields: {
                billingDetails: { name: 'never', email: 'auto', address: 'auto' },
              },
            }}
            style={{ minHeight: 420 }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3">
        <button type="button" onClick={onClose} className="px-3 py-2 rounded border">
          Cancel
        </button>
        <button type="submit" className="px-3 py-2 rounded bg-zinc-600 text-white" disabled={saving}>
          {saving ? 'Saving…' : 'Save payment method'}
        </button>
      </div>
    </form>
  );
}

/* --------------------------- Main Panel --------------------------- */
export default function PlatformBillingPanel({ authHeader, hideDueDay = false, seedEstimateCustomers = null }) {
  const authCtx = useUserProfile();
  const authedUser = authCtx?.profile || authCtx || null;
  const authLoading = authCtx?.loading || authCtx?.loadingProfile;
  const isAuthenticated = !!authedUser;
  const isOwner = String(authedUser?.role || '').toLowerCase() === 'owner';

  const [toast, setToast] = useState({ show: false, msg: '' });
  const showToast = (msg) => { setToast({ show: true, msg }); setTimeout(() => setToast({ show: false, msg: '' }), 3000); };

  const [status, setStatus] = useState({
    ok: false,
    status: 'inactive',
    invoice_due_day: null,
    platform_customer_id: null,
    platform_subscription_id: null,
    default_payment_method: null,
    default_pm_summary: null,
    subscription_status: null,
    next_payment: null,
    amount_preview_cents: 0,
    active_users: 1,
    amount_current_cents: null
  });

  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pmModalOpen, setPmModalOpen] = useState(false);
  const [banner, setBanner] = useState('');
  const [billingStatus, setBillingStatus] = useState(null);

  const refresh = async () => {
    if (authLoading || !isAuthenticated) return;
    if (!isOwner) {
      setBanner('Owner access required to view billing.');
      return;
    }
    setBanner('');

    try {
      const [orgRes, statRes] = await Promise.allSettled([
        withTimeout(axios.get('/api/owner/my-organization', { headers: authHeader, withCredentials: true }), 8000, 'my-organization'),
        withTimeout(axios.get('/api/organization/billing-status', { headers: authHeader, withCredentials: true }), 8000, 'organization/billing-status'),
      ]);

      if (orgRes.status === 'fulfilled') setOrg(orgRes.value?.data || null);
      if (statRes.status === 'fulfilled') setStatus(statRes.value?.data || { ok: false });

      // Banner building
      const getHTTP = (r) => r?.response?.status || r?.status || null;
      const orgErrCode = orgRes.status === 'rejected' ? getHTTP(orgRes.reason) : null;
      const statusFailed = statRes.status === 'rejected';

      const msgs = [];
      const toMsg = (e) => {
        const code = e?.response?.status;
        return (
          (code === 401 && 'Your session expired. You can still finish onboarding and add billing later from Settings → Organization.') ||
          (code === 403 && 'You are not permitted to view billing for this org right now. You can still finish onboarding and add billing later.') ||
          e?.response?.data?.error || e?.message || 'Failed to load.'
        );
      };

      if (statusFailed) {
        if (orgRes.status === 'rejected') msgs.push(toMsg(orgRes.reason));
        msgs.push(toMsg(statRes.reason));
      } else {
        if (orgRes.status === 'rejected' && ![401, 403].includes(orgErrCode ?? 0)) {
          msgs.push(toMsg(orgRes.reason));
        }
      }

      setBanner(msgs.join(' '));
      if (statRes.status === 'rejected') {
        setBillingStatus(null);
      } else {
        setBillingStatus(statRes.value?.data || null);
      }
    } catch (e) {
      setBanner(e?.message || 'Failed to load billing.');
    }
  };

  useEffect(() => { refresh().catch(() => {}); }, [authLoading, isAuthenticated, isOwner]); // eslint-disable-line

  const hasSubscription = !!status.platform_subscription_id;
  const orgIsPastDue = status?.status === 'past_due' || status?.status === 'canceled';

  const actualUsers = Number(status?.active_users ?? 1);
  const currentAmountCents = useMemo(() => {
    if (Number.isFinite(status?.amount_current_cents)) return Number(status.amount_current_cents);
    return calcMonthlyCents(actualUsers);
  }, [status?.amount_current_cents, actualUsers]);

  const estimatedUsers = useMemo(() => {
    if (seedEstimateCustomers != null) return Number(seedEstimateCustomers) || 0;
    const n = org?.estimated_customers;
    return n == null ? 0 : Number(n) || 0;
  }, [seedEstimateCustomers, org?.estimated_customers]);

  const estimatedAmountCents = useMemo(() => {
    if (seedEstimateCustomers == null && Number.isFinite(status?.amount_preview_cents) && status.amount_preview_cents > 0) {
      return Number(status.amount_preview_cents);
    }
    return calcMonthlyCents(estimatedUsers);
  }, [status?.amount_preview_cents, estimatedUsers, seedEstimateCustomers]);

  const showStripeCta = useMemo(() => {
    // Show CTA if Connect account isn't fully set up (charges not enabled)
    const chargesEnabled = billingStatus?.charges_enabled;
    const acctId = billingStatus?.stripe_account_id;
    return !chargesEnabled || !acctId;
  }, [billingStatus]);

  const resumeOnboarding = async () => {
    try {
      const ctxRaw = typeof window !== 'undefined' ? sessionStorage.getItem('ownerOnboard:ctx') : '';
      const ctx = ctxRaw ? JSON.parse(ctxRaw) : {};
      const code = ctx?.code;
      if (!code) {
        showToast('Missing onboarding code. Return to your invite link to resume.');
        return;
      }
      const res = await fetch(`/api/public/owner-onboard/${encodeURIComponent(code)}/punchout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data?.onboarding_url || data?.stripe_onboarding_url)) {
        showToast(data?.error || 'Could not resume Stripe onboarding.');
        return;
      }
      const url = data.onboarding_url || data.stripe_onboarding_url;
      window.location.assign(url);
    } catch (e) {
      console.error('Resume onboarding failed:', e);
      showToast('Could not resume Stripe onboarding.');
    }
  };

  const confirmSubscription = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/owner/platform-billing/confirm-subscription', {}, { headers: authHeader, withCredentials: true });
      if (data?.ok) {
        showToast('Subscription active');
        await refresh();
      } else {
        showToast('Could not start subscription');
      }
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to start subscription');
    } finally { setLoading(false); }
  };
  const cancelSubscription = async () => {
    if (!window.confirm('Cancel at period end?')) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/owner/platform-billing/cancel', {}, { headers: authHeader, withCredentials: true });
      if (data?.ok) { showToast('Subscription set to cancel at period end'); await refresh(); }
      else { showToast('Could not cancel subscription'); }
    } catch { showToast('Failed to cancel subscription'); }
    finally { setLoading(false); }
  };
  const restartSubscription = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/owner/platform-billing/restart', {}, { headers: authHeader, withCredentials: true });
      if (data?.ok) { showToast('Subscription restarted'); await refresh(); }
      else { showToast('Could not restart subscription'); }
    } catch { showToast('Failed to restart subscription'); }
    finally { setLoading(false); }
  };

  const pmBadgeText = (() => {
    const pm = status?.default_pm_summary;
    if (!pm) return null;
    if (pm.type === 'card') {
      const brand = (pm.brand || '').toUpperCase();
      const last4 = pm.last4 ? `•••• ${pm.last4}` : '';
      const exp = pm.exp_month && pm.exp_year ? ` · exp ${String(pm.exp_month).padStart(2, '0')}/${String(pm.exp_year).slice(-2)}` : '';
      return `${brand} ${last4}${exp}`;
    }
    if (pm.type === 'us_bank_account') {
      const bank = pm.bank_name || 'US bank account';
      const last4 = pm.last4 ? ` · •••• ${pm.last4}` : '';
      return `${bank}${last4}`;
    }
    return null;
  })();

  const pollStatusOnce = async (ms = 1500) => {
    try {
      await new Promise(r => setTimeout(r, ms));
      const { data } = await axios.get('/api/organization/billing-status', { headers: authHeader, withCredentials: true });
      setStatus(data || { ok: false });
    } catch {}
  };

  if (authLoading || authLoading === undefined) {
    return <div className="text-sm text-neutral-600">Loading billing…</div>;
  }
  if (!isAuthenticated) {
    return <div className="text-sm text-gray-600">Please sign in to view billing.</div>;
  }
  if (!isOwner) {
    return <div className="text-sm text-gray-600">Owner access required to view billing.</div>;
  }

  return (
    <div className="space-y-6">
      <Toast show={toast.show} onClose={() => setToast({ show: false, msg: '' })}>{toast.msg}</Toast>

      {banner && (
        <div className="rounded border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm">
          {banner}
        </div>
      )}

      {showStripeCta && (
        <div className="rounded border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex items-center justify-between gap-2">
          <div>Stripe onboarding incomplete. Add or update your payment info to finish billing.</div>
          <button
            type="button"
            className="px-3 py-2 rounded bg-zinc-700 text-white"
            onClick={resumeOnboarding}
          >
            Resume Stripe onboarding
          </button>
        </div>
      )}

      {/* Connect Account Status */}
      {billingStatus?.stripe_account_id && (
        <Card
          title="Connect Account"
          right={
            <span className={`text-xs px-2 py-1 rounded-full border ${
              billingStatus?.charges_enabled && billingStatus?.payouts_enabled
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-yellow-100 text-yellow-800 border-yellow-300'
            }`}>
              {billingStatus?.charges_enabled && billingStatus?.payouts_enabled ? 'Active' : 'Setup required'}
            </span>
          }
        >
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Account ID</span>
              <span className="font-mono text-xs">{billingStatus.stripe_account_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Payments</span>
              <span className={billingStatus?.charges_enabled ? 'text-green-700' : 'text-amber-700'}>
                {billingStatus?.charges_enabled ? 'Enabled' : 'Not enabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Payouts</span>
              <span className={billingStatus?.payouts_enabled ? 'text-green-700' : 'text-amber-700'}>
                {billingStatus?.payouts_enabled ? 'Enabled' : 'Not enabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Details submitted</span>
              <span className={billingStatus?.details_submitted ? 'text-green-700' : 'text-amber-700'}>
                {billingStatus?.details_submitted ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded border text-sm"
              onClick={async () => {
                try {
                  const { data } = await axios.post('/api/owner/platform-billing/dashboard-link', {}, { headers: authHeader, withCredentials: true });
                  if (data?.url) window.open(data.url, '_blank');
                  else showToast('Could not open Stripe Dashboard');
                } catch (e) {
                  showToast(e?.response?.data?.error || 'Could not open Stripe Dashboard');
                }
              }}
            >
              Open Stripe Dashboard
            </button>
            {(!billingStatus?.charges_enabled || !billingStatus?.payouts_enabled) && (
              <button
                type="button"
                className="px-3 py-2 rounded bg-zinc-600 text-white text-sm"
                onClick={resumeOnboarding}
              >
                Complete setup
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Payment method */}
      <Card
        title="Payment method"
        right={
          <span className={`text-xs px-2 py-1 rounded-full border ${status.default_payment_method ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}`}>
            {status.default_payment_method ? 'On file' : 'Missing'}
          </span>
        }
      >
        <div className="text-sm text-neutral-600 mb-3">Add or replace the default payment method used for your monthly SaaS invoices.</div>
        {pmBadgeText && <div className="text-sm font-medium mb-3">{pmBadgeText}</div>}
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-2 rounded bg-zinc-600 text-white"
            type="button"
            onClick={() => setPmModalOpen(true)}
            disabled={!isOwner || authLoading}
            title={!isOwner ? 'Owner access required to add a payment method' : undefined}
          >
            {status.default_payment_method ? 'Update payment method' : 'Add payment method'}
          </button>
        </div>
      </Card>

      {/* Manage subscription */}
      <Card
        title="Manage subscription"
        right={
          <span className={`text-xs px-2 py-1 rounded-full border ${
            orgIsPastDue ? 'bg-red-100 text-red-800 border-red-300'
            : status.status === 'trialing' ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
            : 'bg-green-100 text-green-800 border-green-300'
          }`}>
            {String(status.status || '—')}
          </span>
        }
      >
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Current amount (based on {actualUsers} active user{actualUsers === 1 ? '' : 's'})</span>
            <span className="font-medium">{fmtUsd(currentAmountCents)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Estimated monthly amount (based on {estimatedUsers || 0} customer{(estimatedUsers || 0) === 1 ? '' : 's'})</span>
            <span className="font-medium">{fmtUsd(estimatedAmountCents)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Next payment</span>
            <span>{isoToLocal(status.next_payment)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Subscription</span>
            <span>{status.platform_subscription_id ? (status.subscription_status || 'active') : 'Not started'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Due day (1–28)</span>
            <span>{status.invoice_due_day ?? '—'}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!hasSubscription ? (
            <button className="px-3 py-2 rounded bg-zinc-600 text-white" type="button" onClick={confirmSubscription} disabled={loading}>
              Start subscription
            </button>
          ) : (
            <>
              <button className="px-3 py-2 rounded border" type="button" onClick={cancelSubscription} disabled={loading}>Cancel (period end)</button>
              <button className="px-3 py-2 rounded border" type="button" onClick={restartSubscription} disabled={loading}>Restart</button>
            </>
          )}
        </div>
      </Card>

      <div className="text-xs text-neutral-600 leading-relaxed">
        <strong>Pricing notice:</strong> Your monthly SaaS fee is based on your organization’s <strong>active users</strong>.
        Tiers: $3/user (0–50), $2 (51–150), $1 (151–300), $0.50 (300+), capped at <strong>$349/month</strong>.
        The estimated amount shown is for convenience only; the actual monthly charge is computed from your real active
        users for each period and may vary.
      </div>

      {/* PM modal */}
      <SetupPmModal
        open={pmModalOpen}
        onClose={() => setPmModalOpen(false)}
        authHeader={authHeader}
        onSaved={async () => {
          await refresh();
          pollStatusOnce(1500);
        }}
      />
    </div>
  );
}
