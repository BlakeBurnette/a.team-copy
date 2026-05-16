// src/pages/SignupPayment.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Toast from '../components/Toast';
import LogoMark from '../components/LogoMark';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';

const PK = import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = PK ? loadStripe(PK) : null;

/* ----------------------------- UI tokens ----------------------------- */
const UI = {
  pageBg:   '#F5F5F5',
  heroTop:  '#FFBF47',
  heroBottom:'#FFA11E',
  textDark: '#2E2E2E',
  cardBorder:'#E5E7EB',
  btnHover: '#FFB033',
};

/* ----------------------- Stripe PaymentElement theme ----------------------- */
const payHiveAppearance = {
  theme: 'stripe',
  labels: 'floating',
  variables: {
    borderRadius: '10px',
    colorPrimary: UI.heroBottom,
    colorText: UI.textDark,
    colorTextSecondary: '#5B5B5B',
    colorIcon: '#9CA3AF',
    colorBackground: '#FFFFFF',
    colorDanger: '#B00020',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
    fontSizeBase: '16px',
    spacingGridRow: '12px',
    spacingGridColumn: '12px',
    spacingUnit: '10px',
  },
  rules: {
    '.Tab':     { borderRadius: '10px', padding: '8px 12px', border: `1px solid ${UI.cardBorder}` },
    '.Tab:hover': { borderColor: '#D1D5DB' },
    '.Tab--selected': { borderColor: UI.heroBottom, boxShadow: '0 0 0 2px rgba(255,161,30,.18)' },
    '.Input':   { padding: '12px 12px', borderRadius: '10px', border: `1px solid ${UI.cardBorder}` },
    '.Input:focus': { boxShadow: '0 0 0 3px rgba(255,161,30,.18)', borderColor: UI.heroBottom },
    '.Label':   { fontWeight: '600', color: UI.textDark },
    '.Error':   { fontSize: '13px' },
  },
};

const Card = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-lg border" style={{ borderColor: UI.cardBorder }}>
    <div className="px-5 py-4 border-b" style={{ borderColor: UI.cardBorder }}>
      <h3 className="text-xl font-semibold" style={{ color: UI.textDark }}>{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

/* -------------------------------- helpers -------------------------------- */
const withTimeout = (p, ms, label='request') =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms)),
  ]);

const friendlyAxiosErr = (e, fallback='Something went wrong.') => {
  if (axios.isCancel(e)) return 'Request was cancelled.';
  const st = e?.response?.status;
  if (navigator.onLine === false) return 'You appear to be offline.';
  if (st === 401) return 'Your session expired. Please log in again.';
  if (st === 403) return 'You do not have access to this resource.';
  if (st === 404) return 'Resource not found.';
  if (st >= 500)  return 'Server error. Please try again.';
  return e?.message || fallback;
};

const axiosJSON = (cfg, ms = 8000, label='request') =>
  withTimeout(axios({ timeout: ms, ...cfg }), ms + 250, label);

const normalizeBillingStatus = (raw) => {
  // Some backends wrap the payload as { status, data }; unwrap to the inner object if present.
  const base = raw && typeof raw === 'object' && raw.status && raw.data ? raw.data : raw || {};
  const paymentMethods =
    (Array.isArray(base.paymentMethods) && base.paymentMethods) ||
    (Array.isArray(base.payment_methods) && base.payment_methods) ||
    (Array.isArray(base.methods) && base.methods) ||
    [];
  const defaultPm =
    (typeof base.default_payment_method === 'string' && base.default_payment_method) ||
    base.default_pm_id ||
    base.defaultPmId ||
    base.default_payment_method_id ||
    (typeof base.invoice_settings?.default_payment_method === 'string'
      ? base.invoice_settings.default_payment_method
      : null) ||
    (typeof base.default_payment_method?.id === 'string' ? base.default_payment_method.id : null) ||
    null;
  const pmCountRaw = base.pm_count ?? base.pmCount ?? base.pm_total;
  const pmCount = Number.isFinite(pmCountRaw) ? Number(pmCountRaw) : paymentMethods.length;
  const hasPm =
    typeof base.has_pm === 'boolean'
      ? base.has_pm
      : !!defaultPm || pmCount > 0 || paymentMethods.length > 0;

  return {
    ...base,
    paymentMethods,
    payment_methods: paymentMethods,
    default_payment_method: defaultPm || base.default_payment_method || null,
    default_pm_id: defaultPm || base.default_pm_id || null,
    pm_count: pmCount,
    has_pm: hasPm,
  };
};

const hasPaymentMethod = (status) => {
  if (!status || typeof status !== 'object') return false;
  if (typeof status.has_pm === 'boolean') return status.has_pm;
  const pmCount = Number(status.pm_count ?? status.pmCount ?? status.pm_total ?? 0);
  if (pmCount > 0) return true;
  const methods =
    (Array.isArray(status.paymentMethods) && status.paymentMethods) ||
    (Array.isArray(status.payment_methods) && status.payment_methods) ||
    (Array.isArray(status.methods) && status.methods) ||
    [];
  if (methods.length > 0) return true;
  const defaultPm =
    status.default_pm_id ||
    status.defaultPmId ||
    status.default_payment_method_id ||
    status.default_payment_method ||
    status.invoice_settings?.default_payment_method;
  return !!defaultPm;
};

/* --------------------------------- Setup Form -------------------------------- */
function SetupForm({ clientSecret, ctx, billing, onContinue, alreadyHasPm, defaultPmId, refreshStatus, statusPmCount }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user, refreshMe } = useAuth() || {};

  const [agreeAutoPay, setAgreeAutoPay] = useState(!!billing?.autopay_authorized);
  const [agreeInvoiceEmail, setAgreeInvoiceEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [siStatus, setSiStatus] = useState('');
  const [pmId, setPmId] = useState(defaultPmId || '');
  const [err, setErr] = useState('');
  const autoAdvanceRef = useRef(false);

  const disabled = !stripe || !elements || !clientSecret || submitting;

  const authHeaders = async () => ({});

  const persistSignupBillingPrefs = async () => {
    const payload = {};
    if (agreeAutoPay) {
      payload.autopay_enabled = true;
      if (billing?.authorization_text) payload.consent = { accepted: true, text: billing.authorization_text };
    }
    try {
      const headers = await authHeaders();
      try {
        await axiosJSON({ method:'patch', url:'/api/users/billing-settings', data: payload, headers, withCredentials: true }, 7000, 'billing-settings');
      } catch {}
      try { sessionStorage.removeItem('signup:billing'); } catch {}
    } catch (e) {
      console.warn('[SignupPayment] persist billing prefs failed:', e?.response?.data || e);
    }
  };

  const verifySetupIntent = async (secret) => {
    try {
      if (!stripe || !secret) return null;
      const { setupIntent } = await stripe.retrieveSetupIntent(secret);
      return setupIntent || null;
    } catch { return null; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    try {
      setSubmitting(true);
      setErr('');

      const submitRes = await elements.submit();
      if (submitRes?.error) {
        setErr(submitRes.error.message || 'Please check your card details.');
        setSubmitting(false);
        return;
      }

      const res = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          payment_method_data: {
            billing_details: {
              email: user?.email || ctx?.email || '',
              name:  user?.name  || undefined,
              phone: user?.phone_number || ctx?.phone || '',
            },
          },
        },
      });

      if (res.error) {
        setErr(res.error.message || 'Failed to save card.');
        setSubmitting(false);
        return;
      }

      const si = res.setupIntent;
      // re-verify once to get final status + PM id
      const verified = await verifySetupIntent(clientSecret);
      const finalStatus = verified?.status || si?.status || '';
      setSiStatus(finalStatus);

      let foundPm = si?.payment_method || si?.latest_attempt?.payment_method || '';
      if (!foundPm) foundPm = verified?.payment_method || verified?.latest_attempt?.payment_method || '';
      if (!foundPm) {
        setErr('Card was not saved. Please try again.');
        setSubmitting(false);
        return;
      }
      setPmId(foundPm);
      try {
        const headers = await authHeaders();
        await axiosJSON({
          method: 'post',
          url: '/api/users/billing/set-default',
          data: { payment_method_id: foundPm },
          headers,
          withCredentials: true,
        }, 8000, 'set-default');
        await refreshStatus?.();
      } catch (eSet) {
        console.warn('[SignupPayment] set-default failed:', eSet?.response?.data || eSet);
      }

      await persistSignupBillingPrefs();
      if (agreeInvoiceEmail) console.log('[SignupPayment] invoice email opt-in accepted');
      await refreshMe?.();
      setSaved(true);
    } catch (e2) {
      console.error('[SignupPayment] confirm failed:', e2?.response?.data || e2);
      setErr(friendlyAxiosErr(e2, 'Failed to save card.'));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!elements) return;
    const id = setTimeout(() => elements.getElement(PaymentElement)?.focus(), 0);
    return () => clearTimeout(id);
  }, [elements]);

  useEffect(() => {
    if (alreadyHasPm || (statusPmCount && statusPmCount > 0)) {
      setSaved(true);
      if (defaultPmId) setPmId(defaultPmId);
      if (!autoAdvanceRef.current) {
        autoAdvanceRef.current = true;
        onContinue?.();
      }
    }
  }, [alreadyHasPm, statusPmCount, defaultPmId, onContinue]);

  useEffect(() => {
    if (saved && !autoAdvanceRef.current) {
      autoAdvanceRef.current = true;
      onContinue?.();
    }
    return undefined;
  }, [saved, onContinue]);

  if (saved) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border p-3 bg-green-50 text-green-800" style={{ borderColor: '#BBF7D0' }}>
          <div className="font-medium">Card saved</div>
          <div className="text-sm mt-1">
            {pmId ? `Payment method ${pmId} set as default.` : 'Your payment method is saved.'}
            {siStatus ? ` (SetupIntent: ${siStatus})` : ''}
          </div>
        </div>
        <button
          type="button"
          className="w-full inline-flex justify-center items-center rounded-full px-5 py-3 font-semibold shadow-sm transition-colors"
          style={{ background: UI.heroBottom, color: '#111111' }}
          onClick={onContinue}
          onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
          onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="max-w-[640px] mx-auto mt-1">
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'us_bank_account'],
            wallets: { applePay: 'never', googlePay: 'never' },
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'never',
                phone: 'never',
                address: { country: 'auto', postalCode: 'auto' },
              },
            },
          }}
        />
      </div>

      {err && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-2">
          {err}
        </div>
      )}

      <div className="space-y-3 pt-1 text-sm text-gray-800">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreeAutoPay}
            onChange={(e) => setAgreeAutoPay(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FFA11E] focus:ring-[#FFA11E]"
          />
          <span><strong className="font-medium">I authorize automatic charges</strong> to this card.</span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreeInvoiceEmail}
            onChange={(e) => setAgreeInvoiceEmail(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FFA11E] focus:ring-[#FFA11E]"
          />
          <span>Send me invoice emails and payment confirmations.</span>
        </label>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={disabled}
          className={`w-full inline-flex justify-center items-center rounded-full px-5 py-3 font-semibold shadow-sm transition-colors
            ${disabled ? 'bg-gray-400 text-white' : ''}`}
          style={!disabled
            ? { background: UI.heroBottom, color: '#111111' }
            : undefined}
          onMouseEnter={(e)=> { if(!disabled) e.currentTarget.style.background = UI.btnHover; }}
          onMouseLeave={(e)=> { if(!disabled) e.currentTarget.style.background = UI.heroBottom; }}
        >
          {submitting ? 'Saving…' : 'Save Card'}
        </button>
      </div>
    </form>
  );
}

/* --------------------------------- Page ----------------------------------- */
export default function SignupPayment() {
  const { code, slug } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = useAuth() || {};

  const doneRef = useRef(false);
  const billingStatusRef = useRef(null);
  const [clientSecret, setClientSecret] = useState('');
  const [stripeScoped, setStripeScoped] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [statusActionHref, setStatusActionHref] = useState('');
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusLine, setStatusLine] = useState('Starting…');
  const [setupErrDetails, setSetupErrDetails] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const debug = (msg, obj) => { console.log(`[SignupPayment] ${msg}`, obj ?? ''); setStatusLine(msg); };

  const ctx = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('signup:ctx') || '{}'); }
    catch { return {}; }
  }, []);
  const billing = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('signup:billing') || '{}'); }
    catch { return {}; }
  }, []);

  const authHeaders = async () => ({});

  const provisionMe = async (signal) => {
    debug('Provisioning user via /api/users/me…');
    const headers = await authHeaders();
    await axiosJSON({ method:'get', url:'/api/users/me', headers, signal, withCredentials: true }, 7000, 'users/me');
    debug('Provisioned ✔');
  };

  const kickOffStatusProbe = async (signal) => {
    try {
      debug('Fetching /users/billing/status…');
      const headers = await authHeaders();
      const { data: status } = await axiosJSON(
        { method:'get', url:`/api/users/billing/status?ts=${Date.now()}`, headers, signal, withCredentials: true },
        5000,
        'billing/status'
      );
      const normalized = normalizeBillingStatus(status || billingStatusRef.current || null);
      if (!status && billingStatusRef.current) {
        // 304/empty response: reuse last known status
        setBillingStatus(billingStatusRef.current);
      } else {
        setBillingStatus(normalized);
        if (normalized) billingStatusRef.current = normalized;
      }
      setStatusActionHref('');
      const statusToWarn = normalized || billingStatusRef.current || null;
      const warnings = [];
      if (!statusToWarn?.accountId) {
        warnings.push('Provider hasn’t finished Stripe onboarding yet. You can still add a card.');
      } else if (statusToWarn?.canCollect === false) {
        const why = statusToWarn?.disabled_reason ? ` (${statusToWarn.disabled_reason})` : '';
        warnings.push(`Provider payouts not fully active${why}. You can still add a card.`);
      }
      if (Array.isArray(statusToWarn?.requirements?.past_due) && statusToWarn.requirements.past_due.length > 0) {
        warnings.push('Payout info incomplete—card saved, but payouts are paused until requirements are resolved.');
        setStatusActionHref('/app/settings/payments');
      }
      setWarning(warnings.join(' '));
      return statusToWarn;
    } catch (e) {
      const msg = friendlyAxiosErr(e, 'Billing status unavailable; continuing.');
      setWarning(msg);
      console.warn('[SignupPayment] billing/status failed (non-blocking):', msg);
      return billingStatusRef.current || null;
    }
  };
  const refreshStatusNow = async () => {
    const status = await kickOffStatusProbe();
    const pmCount = status?.pm_count ?? billingStatusRef.current?.pm_count ?? 0;
    if (pmCount > 0 || hasPaymentMethod(status)) {
      // Skip form and advance once we know a PM is on file
      onContinue();
    }
    return status;
  };

  const waitStripeReady = async () => {
    if (!PK) throw new Error('Missing VITE_STRIPE_PUBLISHABLE_KEY');
    debug('Loading Stripe.js…');
    const stripe = await withTimeout(stripePromise, 6000, 'stripe.js');
    if (!stripe) throw new Error('Stripe.js failed to load');
    setStripeScoped(stripe);
    debug('Stripe ready ✔');
  };

  const createSetupIntent = async (signal) => {
    debug('Creating SetupIntent…');
    const headers = await authHeaders();
    const siRes = await axiosJSON(
      { method:'post', url:'/api/users/billing/setup-intent', data: {}, headers, signal, withCredentials: true },
      8000,
      'setup-intent'
    );
    const cs = siRes?.data?.client_secret;
    if (!cs) {
      const msg = `setup-intent returned no client_secret. Raw: ${JSON.stringify(siRes?.data || {})}`;
      setSetupErrDetails(msg);
      throw new Error('No client_secret from setup-intent');
    }
    setClientSecret(cs);
    debug('Got client_secret ✔');
  };

  const run = async () => {
    const controller = new AbortController();
    setLoading(true); setError(''); setWarning(''); setSetupErrDetails(''); setClientSecret(''); setStripeScoped(null);
    try {
      debug('Refreshing session…'); await refreshMe?.();
      await provisionMe(controller.signal);
      const status = await kickOffStatusProbe(controller.signal);
      const resolvedPmCount = status?.pm_count ?? billingStatusRef.current?.pm_count ?? 0;
      if (resolvedPmCount > 0 || hasPaymentMethod(status)) {
        setLoading(false);
        onContinue();
        return;
      }
      await createSetupIntent(controller.signal);
      await waitStripeReady();
    } catch (e) {
      console.error('[SignupPayment] init error:', e?.response?.data || e);
      setError(friendlyAxiosErr(e, 'Failed to initialize payment form.'));
      setStatusLine('Init failed');
      controller.abort();
    } finally {
      setLoading(false);
    }
  };

  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, retryKey]);

  const onRetry = () => {
    ran.current = false;
    setRetryKey(k => k + 1);
  };

  const inviteKey = code || slug || '';

  const onContinue = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      if (sessionStorage.getItem('signup:resumePostAuth') !== '1') {
        sessionStorage.setItem('signup:resumePostAuth', '1');
      }
      sessionStorage.setItem('postAuth:next', `/signup/${inviteKey}/done`);
    } catch {}
    setToast({ show: true, msg: 'Card saved. Continue setup…' });
    setTimeout(() => navigate(`/signup/${inviteKey}/done`, { replace: true }), 150);
  };

  useEffect(() => {
    const pmCount = billingStatus?.pm_count ?? billingStatusRef.current?.pm_count ?? 0;
    if (pmCount > 0 || hasPaymentMethod(billingStatus)) onContinue();
  }, [billingStatus]);

  return (
    <div className="min-h-screen w-full" style={{ background: UI.pageBg }}>
      <style>{`
        .hero-curve { border-bottom-left-radius: 28px; border-bottom-right-radius: 28px; }
        @media (min-width: 640px) { .hero-curve { border-bottom-left-radius: 35vw 8vh; border-bottom-right-radius: 35vw 8vh; } }
        @media (min-width: 1024px) { .hero-curve { border-bottom-left-radius: 50vw 12vh; border-bottom-right-radius: 50vw 12vh; } }
      `}</style>

      <Toast show={toast.show} onClose={() => setToast({ show:false, msg:'' })}>{toast.msg}</Toast>

      <div
        className="w-full hero-curve"
        style={{ background: `linear-gradient(180deg, ${UI.heroTop} 0%, ${UI.heroBottom} 100%)` }}
      >
        <div className="max-w-xl mx-auto px-4 pt-10 pb-20 text-center">
          <LogoMark className="h-10 w-auto mx-auto text-[#2E2E2E]" />
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight" style={{ color: UI.textDark }}>
            Add payment method
          </h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-12 pb-10">
        <div className="rounded-2xl shadow-xl border bg-white" style={{ borderColor: UI.cardBorder }}>
          <div className="px-5 pb-2">
            {loading ? (
              <Card title="Payment details">
                <div className="text-neutral-600">
                  Loading… <span className="text-neutral-400">({statusLine})</span>
                </div>
              </Card>
            ) : error ? (
              <Card title="Payment details">
                <div className="text-red-700 border border-red-200 bg-red-50 rounded p-3">{error}</div>
                {setupErrDetails && (
                  <pre className="mt-2 text-xs text-neutral-600 whitespace-pre-wrap break-words bg-neutral-50 border rounded p-2">
                    {setupErrDetails}
                  </pre>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    className="rounded-full px-5 py-2 font-semibold shadow-sm"
                    style={{ background: UI.heroBottom, color: '#111111' }}
                    onClick={onRetry}
                    onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                    onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                  >
                    Retry
                  </button>
                </div>
                <div className="text-xs text-neutral-500 mt-2">{statusLine}</div>
              </Card>
            ) : !clientSecret || !stripeScoped ? (
              <Card title="Payment details">
                <div className="text-neutral-600">
                  Preparing secure form… <span className="text-neutral-400">({statusLine})</span>
                </div>
              </Card>
            ) : (
              <>
                {warning && (
                  <div className="mb-4 text-amber-800 border border-amber-200 bg-amber-50 rounded p-3 flex flex-col gap-2">
                    <div>{warning}</div>
                    {statusActionHref ? (
                      <div>
                        <a
                          href={statusActionHref}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-white text-amber-800 border border-amber-300 hover:bg-amber-100"
                        >
                          Resolve payout requirements
                        </a>
                      </div>
                    ) : null}
                  </div>
                )}
                <Elements
                  stripe={stripeScoped}
                  options={{
                    clientSecret,
                    appearance: payHiveAppearance,
                    fonts: [
                      { cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap' }
                    ],
                    loader: 'auto',
                  }}
                >
                  <SetupForm
                    clientSecret={clientSecret}
                    ctx={ctx}
                    billing={billing}
                    onContinue={onContinue}
                    alreadyHasPm={hasPaymentMethod(billingStatus)}
                    defaultPmId={
                      billingStatus?.default_pm_id ||
                      billingStatus?.defaultPmId ||
                      billingStatus?.default_payment_method ||
                      billingStatus?.default_payment_method_id ||
                      billingStatus?.invoice_settings?.default_payment_method ||
                      ''
                    }
                    refreshStatus={refreshStatusNow}
                    statusPmCount={billingStatus?.pm_count || billingStatus?.pmCount || 0}
                  />
                </Elements>
              </>
            )}
          </div>

          <div className="px-6 pb-6 pt-2 text-center">
            <p className="text-sm text-neutral-700">
              Need help? <a href="/support" className="font-semibold underline">Contact support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
