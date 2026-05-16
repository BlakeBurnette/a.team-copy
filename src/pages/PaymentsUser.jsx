// src/pages/PaymentsUser.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentMethodForm from '../components/payments/PaymentMethodForm';
import { X, CheckCircle2 } from 'lucide-react';

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const API_BASE = (import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/, '') : '');

/* ------------------------------ Modal Components ------------------------------ */
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <p className="text-sm text-neutral-600 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              confirmDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-brand hover:bg-brand-hover'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ show, message, type = 'success', onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-2">
      <div className={`rounded-lg px-4 py-3 shadow-lg border flex items-center gap-2 ${
        type === 'success'
          ? 'bg-green-50 text-green-800 border-green-200'
          : 'bg-red-50 text-red-800 border-red-200'
      }`}>
        {type === 'success' && <CheckCircle2 className="h-5 w-5" />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

/* ------------------------------ Main Component ------------------------------ */
export default function PaymentsUser() {
  const [status, setStatus] = useState(null);
  const [clientSecretAdd, setClientSecretAdd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Modals
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, pmId: null });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [newPmId, setNewPmId] = useState(null); // Track newly added PM for default prompt

  // Load billing status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/users/billing/status`, { withCredentials: true });
        if (!mounted) return;
        setStatus(data || {});
        if (!data?.hasAccount || !data?.accountId) {
          setErr(data?.note || 'Organization is not ready for billing.');
        }
      } catch (e) {
        console.error('[PaymentsUser] status error', e);
        if (mounted) setErr('Failed to load billing status.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Prepare Stripe (platform account for destination charges)
  const stripePromise = useMemo(() => {
    if (!PK) return null;
    return loadStripe(PK); // NO stripeAccount - using destination charges
  }, []);

  const refreshStatus = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/users/billing/status`, { withCredentials: true });
      setStatus(data || {});
    } catch (e) {
      console.error('[PaymentsUser] refresh error', e);
    }
  };

  // Start ADD flow
  const startAdd = async () => {
    try {
      setErr('');
      setBusy(true);

      // Clear any stale client secrets
      setClientSecretAdd(null);

      const { data } = await axios.post(
        `${API_BASE}/api/users/billing/setup-intent`,
        { pm_types: ['card', 'us_bank_account'] },
        { withCredentials: true }
      );

      if (!data?.client_secret) {
        throw new Error('No client secret returned from server');
      }

      setClientSecretAdd(data.client_secret);
    } catch (e) {
      console.error('[PaymentsUser] setup-intent error', e);
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to start payment method setup';
      setErr(errorMsg);
      setToast({ show: true, message: errorMsg, type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // ADD success — attach only, refresh status, then prompt to set as default
  const onAddSuccess = async (setupIntent) => {
    try {
      setBusy(true);
      await refreshStatus();
      setClientSecretAdd(null);

      // Extract the payment method ID from the setupIntent
      const pmId = setupIntent?.payment_method;

      if (pmId && typeof pmId === 'string') {
        // Store the new PM ID and show confirmation to set as default
        setNewPmId(pmId);
        setConfirmModal({
          isOpen: true,
          type: 'setNewAsDefault',
          pmId: pmId,
        });
      } else {
        // If we can't get the PM ID, just show success
        setToast({ show: true, message: 'Payment method added successfully!', type: 'success' });
      }
    } catch (e) {
      console.error('[PaymentsUser] add-success refresh error', e);
      setErr('Saved, but failed to refresh status.');
      setToast({ show: true, message: 'Payment method added, but failed to refresh. Please reload the page.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // Set default PM with confirmation
  const requestSetDefault = (pmId) => {
    setConfirmModal({
      isOpen: true,
      type: 'setDefault',
      pmId,
    });
  };

  const setDefault = async (pmId) => {
    try {
      setBusy(true);
      await axios.post(
        `${API_BASE}/api/users/billing/set-default`,
        { payment_method_id: pmId },
        { withCredentials: true }
      );
      await refreshStatus();

      // Clear newPmId if we were setting a newly added PM as default
      const wasNewPm = newPmId === pmId;
      if (wasNewPm) {
        setNewPmId(null);
      }

      setToast({ show: true, message: 'Default payment method updated!', type: 'success' });
    } catch (e) {
      console.error('[PaymentsUser] set-default error', e);
      const errorMsg = e?.response?.data?.error || 'Failed to set default payment method';
      setErr(errorMsg);
      setToast({ show: true, message: errorMsg, type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // Remove PM with validation
  const requestRemove = (pmId) => {
    const pms = Array.isArray(status?.paymentMethods) ? status.paymentMethods : [];

    // Prevent removing the last payment method
    if (pms.length <= 1) {
      setToast({
        show: true,
        message: 'Cannot remove the last payment method. Add another one first.',
        type: 'error'
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'remove',
      pmId,
    });
  };

  const removePm = async (pmId) => {
    try {
      setBusy(true);
      await axios.post(
        `${API_BASE}/api/users/billing/detach`,
        { payment_method_id: pmId },
        { withCredentials: true }
      );
      await refreshStatus();
      setToast({ show: true, message: 'Payment method removed!', type: 'success' });
    } catch (e) {
      console.error('[PaymentsUser] detach error', e);
      const errorMsg = e?.response?.data?.error || 'Failed to remove payment method';
      setErr(errorMsg);
      setToast({ show: true, message: errorMsg, type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    if (confirmModal.type === 'setDefault' || confirmModal.type === 'setNewAsDefault') {
      setDefault(confirmModal.pmId);
    } else if (confirmModal.type === 'remove') {
      removePm(confirmModal.pmId);
    }
  };

  const handleDeclineNewDefault = () => {
    // User declined to set new PM as default - just show success
    setToast({ show: true, message: 'Payment method added successfully!', type: 'success' });
    setNewPmId(null);
  };

  // Helper to format PM label
  const formatPMLabel = (pm) => {
    if (pm.type === 'us_bank_account') {
      const bank = pm.bank_name || 'Bank';
      const last4 = pm.last4 || '';
      const st = pm.status ? ` (${pm.status})` : '';
      return `${bank} •••• ${last4}${st}`;
    }
    const brand = (pm.brand || 'CARD').toUpperCase();
    const last4 = pm.last4 || '';
    const exp =
      pm.exp_month && pm.exp_year
        ? ` • exp ${String(pm.exp_month).padStart(2, '0')}/${String(pm.exp_year).slice(-2)}`
        : '';
    return `${brand} •••• ${last4}${exp}`;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="text-neutral-600">Loading payments…</div>
      </div>
    );
  }

  if (err && !status) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {err}
        </div>
      </div>
    );
  }

  const hasDefault = !!status?.default_payment_method;
  const defaultPM = status?.default_pm || status?.defaultPaymentMethod || null;
  const defaultLabel = defaultPM ? formatPMLabel(defaultPM) : null;
  const pms = Array.isArray(status?.paymentMethods) ? status.paymentMethods : [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Breadcrumbs */}
      <div className="text-sm text-neutral-600 mb-2">
        <span>Home</span>
        <span className="mx-2">/</span>
        <span>Payments</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">My Payments</h1>

      {/* Payment Method (Current Default) */}
      <div className="bg-white border border-neutral-200 rounded-lg mb-6">
        <div className="px-5 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold">Payment Method</h3>
        </div>
        <div className="p-5">
          {hasDefault ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-800">
                {defaultLabel || 'A saved method is set as default.'}
              </div>
              <button
                onClick={startAdd}
                disabled={busy}
                className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update
              </button>
            </div>
          ) : (
            <div className="text-sm text-neutral-600">No default payment method yet.</div>
          )}
          <p className="text-xs text-neutral-500 mt-3">
            Your card/bank is stored and processed securely by our payment processor.
          </p>
        </div>
      </div>

      {/* Saved payment methods */}
      <div className="bg-white border border-neutral-200 rounded-lg mb-6">
        <div className="px-5 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold">Saved payment methods</h3>
        </div>
        <div className="p-5">
          {pms.length === 0 ? (
            <div className="text-sm text-neutral-600">You don't have any saved payment methods yet.</div>
          ) : (
            <div className="space-y-3">
              {pms.map((pm) => {
                const isDefault = pm.is_default === true || pm.id === status?.default_payment_method;
                const label = formatPMLabel(pm);
                const canRemove = pms.length > 1; // Only allow removal if more than 1 PM exists

                return (
                  <div key={pm.id} className="flex items-center justify-between border border-neutral-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 bg-neutral-100 border border-neutral-300 rounded flex items-center justify-center text-[10px] font-medium text-neutral-600">
                        {pm.type === 'us_bank_account' ? 'ACH' : (pm.brand || 'CARD').toUpperCase().slice(0, 4)}
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-neutral-900">{label}</div>
                      </div>
                      {isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 border border-green-200">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isDefault && (
                        <button
                          onClick={() => requestSetDefault(pm.id)}
                          disabled={busy}
                          className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Make default
                        </button>
                      )}
                      <button
                        onClick={() => requestRemove(pm.id)}
                        disabled={busy || !canRemove}
                        title={!canRemove ? 'Cannot remove the last payment method' : 'Remove'}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-neutral-500 mt-4">
            You can store multiple cards/bank accounts. Choose one as your default for payments.
          </p>
        </div>
      </div>

      {/* Add a payment method */}
      <div className="bg-white border border-neutral-200 rounded-lg">
        <div className="px-5 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold">Add a payment method (ACH or card)</h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-neutral-600 mb-4">
            Bank (ACH) is preferred to reduce fees. Your details are handled by Stripe; we never store full account numbers.
          </p>

          <p className="text-xs text-neutral-500 mb-4">
            Choose bank account (ACH) or card. ACH helps keep costs low.
          </p>

          <button
            onClick={startAdd}
            disabled={busy || !PK || !status?.accountId}
            className="px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Loading…' : 'Add New Payment Method'}
          </button>

          {!PK && (
            <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Missing <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code>.
              Add it to use the in-app card form.
            </div>
          )}
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {clientSecretAdd && stripePromise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setClientSecretAdd(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900">Add Payment Method</h3>
                <p className="text-sm text-neutral-600 mt-1">Choose card or bank account (ACH recommended)</p>
              </div>
              <button
                onClick={() => setClientSecretAdd(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            <div className="mt-4">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: clientSecretAdd,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#303234',
                      borderRadius: '8px',
                    }
                  }
                }}
              >
                <PaymentMethodForm
                  clientSecret={clientSecretAdd}
                  onSuccess={onAddSuccess}
                  onCancel={() => setClientSecretAdd(null)}
                  submitLabel="Add Payment Method"
                  note="Your payment details are encrypted and processed securely by Stripe."
                />
              </Elements>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-neutral-600 mt-6 text-center">
        Your default method will be used for payments to your organization. You can update it at any time.
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          // If declining to set new PM as default, show success toast
          if (confirmModal.type === 'setNewAsDefault') {
            handleDeclineNewDefault();
          }
          setConfirmModal({ isOpen: false, type: null, pmId: null });
        }}
        onConfirm={handleConfirm}
        title={
          confirmModal.type === 'setDefault'
            ? 'Set as default payment method?'
            : confirmModal.type === 'setNewAsDefault'
            ? 'Set as default payment method?'
            : 'Remove payment method?'
        }
        message={
          confirmModal.type === 'setDefault'
            ? 'This payment method will be used for all future payments to your organization.'
            : confirmModal.type === 'setNewAsDefault'
            ? 'Payment method added successfully! Would you like to set it as your default payment method?'
            : 'Are you sure you want to remove this payment method? This action cannot be undone.'
        }
        confirmText={
          confirmModal.type === 'setDefault' || confirmModal.type === 'setNewAsDefault'
            ? 'Set as default'
            : 'Remove'
        }
        confirmDanger={confirmModal.type === 'remove'}
      />

      {/* Toast */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ show: false, message: '', type: 'success' })}
      />
    </div>
  );
}
