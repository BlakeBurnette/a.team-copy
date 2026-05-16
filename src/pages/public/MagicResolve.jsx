import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe } from '@stripe/react-stripe-js';
import Toast from '../../components/Toast';
import { fetchPaymentResolution, startPaymentResolution, confirmPaymentResolution } from '../../api/paymentResolution';
import PaymentResolutionBanner from '../../components/PaymentResolutionBanner';
import PaymentStatusPill from '../../components/PaymentStatusPill';
import { resolutionGuidance, terminalStatuses } from '../../utils/paymentResolution';

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

const fmtMoney = (cents, currency = 'USD') =>
  typeof cents === 'number'
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
    : '';

function Inner({ token, serviceRecordId, onResolution }) {
  const stripe = useStripe();
  const [resolution, setResolution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPaymentResolution(serviceRecordId, { token });
      const resObj = data?.resolution || null;
      setResolution(resObj);
      onResolution?.(resObj);
      onResolution?.(resObj);
    } catch (e) {
      if (e?.type === 'invalid_or_expired') {
        setInvalid(true);
      } else {
        setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to load payment');
      }
    } finally {
      setLoading(false);
    }
  }, [serviceRecordId, token]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });

  const status = useMemo(
    () => (resolution?.resolution_status || resolution?.status || resolution?.state || '').toLowerCase(),
    [resolution]
  );
  const amount = resolution?.amount_due_cents ?? resolution?.amount_cents ?? resolution?.amount;
  const currency = resolution?.currency || 'USD';
  const nextRetry = resolution?.next_retry_at || resolution?.retry_at;
  const guidance = resolutionGuidance({ ...resolution, status });

  const pollResolution = useCallback(async () => {
    setPolling(true);
    const delays = [600, 1200, 1800, 2500, 3500];
    try {
      for (let i = 0; i < delays.length; i += 1) {
        const data = await fetchPaymentResolution(serviceRecordId, { token });
        const resObj = data?.resolution || null;
        setResolution(resObj);
        onResolution?.(resObj);
        onResolution?.(resObj);
        const st = String(
          resObj?.resolution_status || resObj?.status || resObj?.state || ''
        ).toLowerCase();
        if (terminalStatuses.includes(st)) break;
        await new Promise((resolve) => setTimeout(resolve, delays[i]));
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Unable to refresh status');
    } finally {
      setPolling(false);
    }
  }, [serviceRecordId, token]);

  const handle = async (action) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await startPaymentResolution(serviceRecordId, { action }, { token });
      const resObj = res?.resolution || null;
      if (resObj) {
        setResolution(resObj);
        onResolution?.(resObj);
      }
      const stripeMeta = res?.stripe || {};
      const clientSecret =
        stripeMeta.client_secret ||
        stripeMeta.payment_intent_client_secret ||
        stripeMeta.setup_intent_client_secret;
      const intentType = stripeMeta.intent_type || (stripeMeta.setup_intent_client_secret ? 'setup' : 'payment');
      if (clientSecret) {
        if (!stripe) {
          setError('Payments are not configured in this browser.');
          setBusy(false);
          return;
        }
        let result;
        if (intentType === 'setup') {
          result = await stripe.confirmCardSetup(clientSecret, { redirect: 'if_required' });
        } else {
          result = await stripe.confirmCardPayment(clientSecret, { redirect: 'if_required' });
        }
        if (result?.error) {
          setError(result.error.message || 'Payment action failed');
          setBusy(false);
          return;
        }
      }
      showToast('Payment updated');
      const confirmRes = await confirmPaymentResolution(serviceRecordId, { action }, { token });
      if (confirmRes?.resolution) {
        setResolution(confirmRes.resolution);
        onResolution?.(confirmRes.resolution);
      }
      await pollResolution();
    } catch (e) {
      if (e?.type === 'invalid_or_expired') {
        setInvalid(true);
      } else {
        setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Unable to complete action');
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-neutral-700">Loading payment status…</div>;
  if (invalid) {
    return (
      <div className="bg-white border rounded-xl p-4">
        <div className="text-lg font-semibold text-neutral-900">Link expired</div>
        <div className="text-sm text-neutral-700">
          This approval link is no longer valid. Please request a new link or contact support.
        </div>
      </div>
    );
  }
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-3">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      <div className="border rounded-lg p-4 bg-neutral-50 space-y-2">
        {resolution?.service_fee_cents > 0 && !resolution?.fee_absorbed ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Service Amount</span>
              <span className="text-neutral-900">{fmtMoney((amount || 0) - (resolution?.service_fee_cents || 0), currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Service Fee</span>
              <span className="text-neutral-900">{fmtMoney(resolution?.service_fee_cents, currency)}</span>
            </div>
            <div className="border-t border-neutral-200 pt-2 flex justify-between">
              <span className="text-sm font-medium text-neutral-700">Total</span>
              <span className="text-lg font-semibold text-neutral-900">{fmtMoney(amount, currency) || '—'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-neutral-600">Amount</div>
            <div className="text-xl font-semibold text-neutral-900">{fmtMoney(amount, currency) || '—'}</div>
          </>
        )}
        <div className="text-xs text-neutral-600">Charged automatically once resolved.</div>
      </div>

      <PaymentResolutionBanner
        resolutionStatus={status}
        resolutionCode={resolution?.code}
        token={token}
        serviceRecordId={serviceRecordId}
      />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-neutral-900">{guidance.title}</div>
          <div className="text-sm text-neutral-700">{guidance.description}</div>
          {nextRetry ? (
            <div className="text-xs text-neutral-600">
              Next retry: {new Date(nextRetry).toLocaleString()}
            </div>
          ) : null}
        </div>
        <PaymentStatusPill resolutionStatus={status} resolutionCode={resolution?.code} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {guidance.action && guidance.action !== 'contact_support' && guidance.actionLabel ? (
          <button
            type="button"
            onClick={() => handle(guidance.action)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? 'Working…' : guidance.actionLabel}
          </button>
        ) : null}
        {guidance.action === 'contact_support' ? (
          <div className="text-sm text-neutral-700">Please contact support to resolve this payment.</div>
        ) : null}
        <button
          type="button"
          onClick={pollResolution}
          disabled={polling}
          className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-neutral-50 text-sm disabled:opacity-60"
        >
          {polling ? 'Refreshing…' : 'Refresh status'}
        </button>
      </div>

      {status === 'succeeded' ? (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
          Paid. Thank you! A receipt has been recorded.
        </div>
      ) : null}

      {status === 'exhausted' || status === 'failed' || status === 'compatibility_required' || status === 'unknown' ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 text-sm">
          Payment could not be completed. Please try updating your payment method or contact support.
        </div>
      ) : null}
    </div>
  );
}

export default function MagicResolve() {
  const { token } = useParams();
  const [stripePromise, setStripePromise] = useState(null);
  const [proofUrl, setProofUrl] = useState('');

  useEffect(() => {
    if (PK) loadStripe(PK).then((s) => setStripePromise(s));
  }, []);

  const serviceRecordId = null; // backend derives from token

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <div className="text-xs uppercase text-neutral-500">Payment resolution</div>
          <h1 className="text-2xl font-bold">Resolve payment</h1>
          <div className="text-sm text-neutral-600">Service completed and verified</div>
          {proofUrl ? (
            <a href={proofUrl} className="text-sm text-emerald-700 underline">
              View proof
            </a>
          ) : null}
        </div>

        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <Inner token={token} serviceRecordId={serviceRecordId || 'magic'} onResolution={(r) => setProofUrl(r?.proof_url || '')} />
          </Elements>
        ) : (
          <div className="text-sm text-red-600">Stripe is not configured.</div>
        )}

        <div className="text-xs text-neutral-600">
          Need to review proof? Use your original service proof link.
        </div>
      </div>
    </div>
  );
}

export { Inner as MagicResolveInner };
