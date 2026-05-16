// src/pages/Account/PaymentMethodsCard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

/* ------------------------------ Small UI bits ------------------------------ */
const Pill = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-gray-50 text-gray-700 border-gray-200">
    {children}
  </span>
);

function CardRow({ pm, onMakeDefault, onRemove, disabled }) {
  const brand = (pm?.card?.brand || pm?.brand || '').toUpperCase() || 'CARD';
  const last4 = pm?.card?.last4 || pm?.last4 || '••••';
  const expMonth = pm?.card?.exp_month || pm?.exp_month || '--';
  const expYear = pm?.card?.exp_year || pm?.exp_year || '----';

  return (
    <div className="flex items-center justify-between border rounded p-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-6 grid place-items-center rounded border text-xs">{brand}</div>
        <div className="text-sm">
          <div className="font-medium">•••• {last4}</div>
          <div className="text-neutral-500">Exp {expMonth}/{expYear}</div>
        </div>
        {pm.is_default && <Pill>Default</Pill>}
      </div>

      <div className="flex items-center gap-2">
        {!pm.is_default && (
          <button
            className="px-3 py-1 rounded border text-sm"
            onClick={() => onMakeDefault(pm.id)}
            disabled={disabled}
            type="button"
          >
            Make default
          </button>
        )}
        <button
          className="px-3 py-1 rounded border text-sm"
          onClick={() => onRemove(pm.id)}
          disabled={disabled || pm.is_default}
          title={pm.is_default ? 'Unset as default before removing' : 'Remove'}
          type="button"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Add Card (modal) ---------------------------- */
function AddCardForm({ clientSecret, onClose, afterSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErr('');

    // Required for Payment Element + SetupIntents
    const submitResult = await elements.submit();
    if (submitResult?.error) {
      setErr(submitResult.error.message || 'There was an issue with your card details.');
      setSubmitting(false);
      return;
    }

    const res = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/app/user/payments`,
      },
      redirect: 'if_required',
    });

    if (res.error) {
      setErr(res.error.message || 'Failed to save card');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    afterSuccess?.();
    onClose?.();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PaymentElement options={{ layout: 'tabs' }} />
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button className="px-3 py-2 rounded border" type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          className={`px-3 py-2 rounded text-white ${submitting ? 'bg-gray-400' : 'bg-zinc-600'}`}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Save card'}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------- Main component ---------------------------- */
export default function PaymentMethodsCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stripeScoped, setStripeScoped] = useState(null);
  const [adding, setAdding] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);

  const authHeader = useMemo(() => ({}), []);

  // Normalize server response into UI shape
  const normalizeStatus = (data) => {
    // Debug what came back from the API
    // eslint-disable-next-line no-console
    console.log('[payments][raw status]', data);

    const connect = data?.connect || {};
    const hasAccount = data?.hasAccount ?? !!data?.accountId;

    // Derive canCollect from multiple possible shapes
    const chargesEnabled = (data?.charges_enabled ?? connect?.charges_enabled) === true;
    const cardCap = (data?.card_payments_capability ?? connect?.card_payments_capability) || 'active';
    const disabledReason = data?.disabled_reason ?? connect?.disabled_reason ?? null;

    const canCollect =
      data?.canCollect ??
      ((chargesEnabled || connect?.onboarded === true) &&
        (cardCap === 'active' || cardCap === true) &&
        !disabledReason);

    // Normalize payment methods list
    const rawList =
      (Array.isArray(data?.paymentMethods) && data.paymentMethods) ||
      (Array.isArray(data?.payment_methods) && data.payment_methods) ||
      (Array.isArray(data?.methods) && data.methods) ||
      [];

    // Default PM id can be a string or { id }
    const defaultPMId =
      (data?.default_payment_method && typeof data.default_payment_method === 'string'
        ? data.default_payment_method
        : data?.default_payment_method?.id) ||
      data?.invoice_settings?.default_payment_method ||
      null;

    const normalized = rawList.map((pm) => ({
      id: pm.id,
      brand: pm.brand || pm.card?.brand || '',
      last4: pm.last4 || pm.card?.last4 || '',
      exp_month: pm.exp_month || pm.card?.exp_month || '',
      exp_year: pm.exp_year || pm.card?.exp_year || '',
      is_default: defaultPMId ? pm.id === defaultPMId : !!pm.is_default,
      card: pm.card || undefined,
    }));

    const has_pm =
      typeof data?.has_pm === 'boolean'
        ? data.has_pm
        : Boolean(defaultPMId) || normalized.length > 0;

    const normalizedOut = {
      ok: !!(data && (data.ok || data.accountId !== undefined)),
      hasAccount: !!hasAccount,
      accountId: data?.accountId || null,
      canCollect: !!canCollect,
      disabled_reason: disabledReason,
      requirements_currently_due:
        Array.isArray(data?.requirements_currently_due) ? data.requirements_currently_due : [],
      paymentMethods: normalized,
      default_payment_method: defaultPMId,
      has_pm,
    };

    // eslint-disable-next-line no-console
    console.log('[payments][normalized status]', normalizedOut);
    return normalizedOut;
  };

  const loadStatus = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/users/billing/status', {
        headers: authHeader,
        withCredentials: true,
      });
      const norm = normalizeStatus(data || {});
      setStatus(norm);

      // Scope Stripe.js to the connected account for SetupIntent client_secrets
      if (norm.hasAccount && norm.accountId && PK) {
        const s = await loadStripe(PK, { stripeAccount: norm.accountId });
        setStripeScoped(s);
      } else {
        setStripeScoped(null);
      }
    } catch (e) {
      console.error('billing/status error', e?.response?.data || e);
      setStatus({ ok: false, error: e?.response?.data?.error || 'Failed to load billing status' });
      setStripeScoped(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAddCard = async () => {
    try {
      if (!status?.hasAccount || !status?.accountId) {
        alert('Your organization is not ready to save payment methods yet.');
        return;
      }
      if (!status?.canCollect) {
        alert('This organization has not finished Stripe setup. Unable to save a card.');
        return;
      }
      setBusy(true);
      const { data } = await axios.post('/api/users/billing/setup-intent', {}, {
        headers: authHeader,
        withCredentials: true,
      });
      if (!data?.client_secret) throw new Error('No client_secret');
      setClientSecret(data.client_secret);
      setAdding(true);
    } catch (e) {
      console.error('setup-intent error', e?.response?.data || e);
      alert(e?.response?.data?.error || 'Failed to start card setup');
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (payment_method_id) => {
    try {
      setBusy(true);
      await axios.post('/api/users/billing/set-default', { payment_method_id }, {
        headers: authHeader,
        withCredentials: true,
      });
      await loadStatus();
    } catch (e) {
      console.error('set-default error', e?.response?.data || e);
      alert(e?.response?.data?.error || 'Failed to set default');
    } finally {
      setBusy(false);
    }
  };

  const removePm = async (payment_method_id) => {
    if (!window.confirm('Remove this card?')) return;
    try {
      setBusy(true);
      await axios.post('/api/users/billing/detach', { payment_method_id }, {
        headers: authHeader,
        withCredentials: true,
      });
      await loadStatus();
    } catch (e) {
      console.error('detach error', e?.response?.data || e);
      alert(e?.response?.data?.error || 'Failed to remove');
    } finally {
      setBusy(false);
    }
  };

  const manageInPortal = async () => {
    try {
      setBusy(true);
      const { data } = await axios.post('/api/users/billing/portal', {}, {
        headers: authHeader,
        withCredentials: true,
      });
      if (data?.url) window.location.assign(data.url);
      else alert(data?.note || 'Customer Portal not available.');
    } catch (e) {
      console.error('portal error', e?.response?.data || e);
      alert(e?.response?.data?.error || 'Failed to open billing portal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-neutral-200">
      <div className="px-4 py-3 border-b">
        <h3 className="text-base font-semibold">Payment methods</h3>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-neutral-600">Loading…</div>
        ) : !status?.hasAccount ? (
          <div className="text-sm text-neutral-700">
            Your organization hasn’t completed Stripe setup yet. You can’t add a card until they do.
          </div>
        ) : (
          <>
            {!status?.canCollect && (
              <div className="text-sm text-amber-800 border border-amber-200 bg-amber-50 rounded p-3">
                This organization hasn’t finished Stripe setup, so you can’t add a card yet.
                {status?.disabled_reason && (
                  <div className="mt-1">
                    <span className="font-medium">Reason: </span>{status.disabled_reason}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {(status?.paymentMethods || []).length === 0 ? (
                <div className="text-sm text-neutral-600">No cards on file.</div>
              ) : (
                status.paymentMethods.map((pm) => (
                  <CardRow
                    key={pm.id}
                    pm={pm}
                    onMakeDefault={makeDefault}
                    onRemove={removePm}
                    disabled={busy}
                  />
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded bg-zinc-600 text-white disabled:bg-gray-400"
                onClick={startAddCard}
                disabled={!stripeScoped || !status?.canCollect || busy || !PK}
              >
                Add a card
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded border"
                onClick={manageInPortal}
                disabled={busy}
              >
                Manage in Billing Portal
              </button>
            </div>

            {!PK && (
              <div className="text-sm text-amber-700">
                Missing <code>VITE_STRIPE_PUBLISHABLE_KEY</code>. Add it to use the in-app card form.
              </div>
            )}

            {adding && clientSecret && stripeScoped && (
              <div className="fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/40" onClick={() => setAdding(false)} />
                <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full md:w-[520px] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Add a card</div>
                    <button className="p-2 -mr-2" onClick={() => setAdding(false)} aria-label="Close">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>

                  <Elements stripe={stripeScoped} options={{ clientSecret }}>
                    <AddCardForm
                      clientSecret={clientSecret}
                      onClose={() => setAdding(false)}
                      afterSuccess={() => loadStatus()}
                    />
                  </Elements>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
