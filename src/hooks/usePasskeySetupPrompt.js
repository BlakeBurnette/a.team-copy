// src/hooks/usePasskeySetupPrompt.js
// Hook to manage passkey setup prompt state
// Shows prompt to users without passkeys, respects dismissal for 7 days
import { useState, useEffect, useCallback } from 'react';
import { listCredentials } from '../api/webauthn';

const STORAGE_KEY = 'passkey_prompt_dismissed';
const DISMISS_DAYS = 7; // Re-prompt after 7 days

function getDismissedAt() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

function setDismissedAt(timestamp) {
  try {
    localStorage.setItem(STORAGE_KEY, String(timestamp));
  } catch {
    // localStorage not available
  }
}

function clearDismissed() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage not available
  }
}

function isDismissedRecently() {
  const dismissedAt = getDismissedAt();
  if (!dismissedAt) return false;
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_DAYS;
}

function browserSupportsPasskeys() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export default function usePasskeySetupPrompt() {
  const [loading, setLoading] = useState(true);
  const [hasPasskey, setHasPasskey] = useState(true); // Default true to avoid flash
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkPasskeys = useCallback(async () => {
    // Don't show if browser doesn't support passkeys
    if (!browserSupportsPasskeys()) {
      setLoading(false);
      setHasPasskey(true); // Treat as having passkey to hide prompt
      return;
    }

    // Don't show if recently dismissed
    if (isDismissedRecently()) {
      setLoading(false);
      setDismissed(true);
      return;
    }

    setLoading(true);
    try {
      const data = await listCredentials({});
      const credentials = Array.isArray(data?.credentials)
        ? data.credentials
        : Array.isArray(data) ? data : [];
      const has = credentials.length > 0;
      setHasPasskey(has);

      // Show prompt if no passkeys and not dismissed
      if (!has && !isDismissedRecently()) {
        setShowPrompt(true);
      }
    } catch (e) {
      // On error, don't show prompt (fail closed)
      console.debug('[usePasskeySetupPrompt] Error checking passkeys:', e?.message);
      setHasPasskey(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPasskeys();
  }, [checkPasskeys]);

  const dismiss = useCallback(() => {
    setDismissedAt(Date.now());
    setShowPrompt(false);
    setDismissed(true);
  }, []);

  const onSuccess = useCallback(() => {
    // Clear dismissal state and hide prompt
    clearDismissed();
    setShowPrompt(false);
    setHasPasskey(true);
  }, []);

  return {
    loading,
    hasPasskey,
    showPrompt,
    dismissed,
    dismiss,
    onSuccess,
    recheckPasskeys: checkPasskeys,
  };
}
