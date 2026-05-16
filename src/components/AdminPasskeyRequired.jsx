// src/components/AdminPasskeyRequired.jsx
// Modal that requires admins to set up a passkey before accessing admin features
import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, KeyRound } from 'lucide-react';
import { getRegistrationOptions, createPasskey } from '../api/webauthn';

export default function AdminPasskeyRequired({ onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSetupPasskey = async () => {
    setBusy(true);
    setError('');
    try {
      if (!window.PublicKeyCredential) {
        setError('Passkeys are not supported on this device/browser. Please use a modern browser like Chrome, Safari, or Edge.');
        setBusy(false);
        return;
      }

      const options = await getRegistrationOptions({});
      await createPasskey(options, {});

      // Success - notify parent
      onSuccess?.();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Passkey setup failed';
      if (msg.includes('NotAllowedError') || msg.includes('cancelled')) {
        setError('Setup was cancelled. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-amber-100">
            <KeyRound className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Passkey Required</h2>
            <p className="text-sm text-neutral-600">Security requirement for admin accounts</p>
          </div>
        </div>

        {/* Explanation */}
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            As an administrator, you must set up a passkey to protect your account and
            access admin features. Passkeys are:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span><strong>Phishing-resistant</strong> - Can't be stolen by fake websites</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span><strong>Device-bound</strong> - Stored securely on your device</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span><strong>Fast & easy</strong> - Use Face ID, Touch ID, or device PIN</span>
            </li>
          </ul>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action */}
        <button
          type="button"
          onClick={handleSetupPasskey}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {busy ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Setting up passkey...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              Set Up Passkey Now
            </>
          )}
        </button>

        {/* Note */}
        <p className="text-xs text-neutral-500 text-center">
          You'll be prompted by your browser or device to create a passkey.
          This only takes a few seconds.
        </p>
      </div>
    </div>
  );
}
