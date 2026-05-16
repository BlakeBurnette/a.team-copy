// src/components/payments/PaymentMethodForm.jsx
import React, { useMemo, useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

/**
 * PaymentMethodForm
 *
 * Requirements:
 * - Must be rendered inside <Elements stripe={...} options={{ clientSecret }}>
 * - Parent is responsible for creating the SetupIntent and passing the same client_secret in Elements.
 *
 * Props:
 * - clientSecret: string (required) — the SetupIntent client_secret used by confirmSetup
 * - onSuccess: (setupIntent) => void  — called after a successful confirmation
 * - onCancel: () => void              — optional, close/dismiss handler
 * - submitLabel: string               — button label (default: "Save card")
 * - returnUrl: string                 — used by Stripe when a redirect is required
 * - consentRequired: boolean          — if true, shows a required checkbox
 * - consentLabel: string              — label text shown next to consent checkbox
 * - disabled: boolean                 — disable the whole form
 * - note: string                      — small helper text shown under the element
 */
export default function PaymentMethodForm({
  clientSecret,
  onSuccess,
  onCancel,
  submitLabel = 'Save card',
  returnUrl,
  consentRequired = false,
  consentLabel = 'I authorize charges to my saved payment method according to the billing terms.',
  disabled = false,
  note = 'Your card details are encrypted and processed by Stripe. We never store full card numbers.',
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [consent, setConsent] = useState(!consentRequired); // pre-checked if not required

  const canSubmit = useMemo(
    () => !!stripe && !!elements && !!clientSecret && consent && !disabled && !submitting,
    [stripe, elements, clientSecret, consent, disabled, submitting]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setSubmitting(true);
    setErr('');

    // Validate inputs inside Payment Element first
    const submitRes = await elements.submit();
    if (submitRes?.error) {
      setErr(submitRes.error.message || 'Please check your card details.');
      setSubmitting(false);
      return;
    }

    // Confirm SetupIntent (save card for future off_session charges)
    const res = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        // Include a return_url for potential 3DS flows; we prefer in-place when possible
        return_url: returnUrl || `${window.location.origin}${window.location.pathname}`,
      },
      redirect: 'if_required',
    });

    if (res.error) {
      setErr(res.error.message || 'Failed to save card');
      setSubmitting(false);
      return;
    }

    // Success or processing — hand control back to caller
    try {
      onSuccess?.(res.setupIntent);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement options={{ layout: 'tabs', paymentMethodOrder: ['card', 'us_bank_account'] }} />
      {note && <div className="text-xs text-neutral-500">{note}</div>}

      {consentRequired && (
        <label className="flex items-start gap-3 text-sm text-neutral-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{consentLabel}</span>
        </label>
      )}

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded border hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-3 py-2 rounded text-white ${
            canSubmit ? 'bg-zinc-600 hover:bg-blue-700' : 'bg-gray-400'
          }`}
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
