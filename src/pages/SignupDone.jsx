// src/pages/SignupDone.jsx
import React, { useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ordinal(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return String(n || '');
  const s = ['th','st','nd','rd'], vMod = v % 100;
  return v + (s[(vMod - 20) % 10] || s[vMod] || s[0]);
}

export default function SignupDone() {
  const { code, slug } = useParams();
  const linkKey = code || slug || '';
  const { refreshMe } = useAuth() || {};
  const navigate = useNavigate();

  const ctx = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('signup:ctx') || '{}'); }
    catch { return {}; }
  }, []);

  const billing = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('signup:billing') || '{}'); }
    catch { return {}; }
  }, []);

  // Clean up the short-lived Stripe bootstrap; keep ctx/billing so this page can render details.
  useEffect(() => {
    try { sessionStorage.removeItem('signup:stripe'); } catch {}
    refreshMe?.().catch(() => {});
  }, []);

  const orgName = ctx?.org_name || null;
  const day = Number(billing?.preferred_charge_day);
  const autopay = !!billing?.autopay_authorized;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">You’re all set!</h1>

      <p className="text-neutral-700 mb-2">
        Your payment method has been saved{orgName ? <> for <strong>{orgName}</strong></> : null}.
      </p>

      {autopay && (
        <p className="text-neutral-700 mb-2">
          Autopay is turned on{Number.isFinite(day) ? <> for the {ordinal(day)} of each month</> : null}. You can change this any time in
          <span className="whitespace-nowrap"> <strong>Account → Payments</strong>.</span>
        </p>
      )}

      {Number.isFinite(day) && !autopay && (
        <p className="text-neutral-600 mb-2">
          You chose the {ordinal(day)} as your preferred charge day. You can enable autopay later in
          <span className="whitespace-nowrap"> <strong>Account → Payments</strong>.</span>
        </p>
      )}

      {typeof billing?.estimated_selected_total_cents === 'number' && billing.estimated_selected_total_cents > 0 && (
        <p className="text-neutral-500 text-sm mb-4">
          Estimated selected services total:&nbsp;
          {(billing.estimated_selected_total_cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}.
          Actual invoices may vary.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        {/* Login-first flow -> users are authenticated now */}
        <Link
          to="/app/user/invoices"
          className="inline-block px-4 py-2 rounded bg-blue-600 text-white text-center"
        >
          Go to my account
        </Link>

        <Link
          to="/"
          className="inline-block px-4 py-2 rounded border border-neutral-300 text-center"
        >
          Back to Home
        </Link>
      </div>

      <div className="text-sm text-neutral-600 mt-4">
        Want to review your details? You can revisit your signup page:&nbsp;
        <code className="bg-neutral-100 px-1 py-0.5 rounded">/signup/{linkKey}</code>
      </div>
    </div>
  );
}
