// src/components/PasskeySetupPrompt.jsx
// Modal prompting users to set up a passkey after password login
// Following Microsoft/Google best practices: proactive nudge, clear terminology
import React, { useState } from 'react';
import { Loader2, Fingerprint } from 'lucide-react';
import { getRegistrationOptions, createPasskey } from '../api/webauthn';

export default function PasskeySetupPrompt({ onSuccess, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSetupPasskey = async () => {
    setBusy(true);
    setError('');
    try {
      if (!window.PublicKeyCredential) {
        setError('Your browser doesn\'t support this feature. Try Chrome, Safari, or Edge.');
        setBusy(false);
        return;
      }

      const options = await getRegistrationOptions({});
      await createPasskey(options, {});
      setSuccess(true);
      // Brief delay to show success state
      setTimeout(() => onSuccess?.(), 1500);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Setup failed';
      if (msg.includes('NotAllowedError') || msg.includes('cancelled')) {
        setError('Setup was cancelled. You can try again anytime from Account settings.');
      } else {
        setError(msg);
      }
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <Fingerprint className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">You're all set!</h2>
          <p className="text-neutral-600 mt-2">
            Next time, just use your face, fingerprint, or PIN to sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <Fingerprint className="w-8 h-8 text-amber-600" />
        </div>

        {/* Copy - using "face, fingerprint, or PIN" per Microsoft research */}
        <h2 className="text-xl font-bold text-neutral-900 text-center">
          Sign in faster next time
        </h2>
        <p className="text-neutral-600 mt-2 text-center">
          Use your face, fingerprint, or device PIN instead of typing your password.
        </p>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 mt-4 text-center bg-red-50 rounded-lg p-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={handleSetupPasskey}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-60 transition-colors"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up...
              </>
            ) : (
              'Set up now'
            )}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="w-full px-4 py-3 rounded-xl text-neutral-600 font-medium hover:bg-neutral-100 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Subtle note */}
        <p className="text-xs text-neutral-400 text-center mt-4">
          You can always set this up later in Account settings.
        </p>
      </div>
    </div>
  );
}
