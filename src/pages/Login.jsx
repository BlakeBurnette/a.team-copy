import React, { useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function sanitize(next) {
  if (!next || next === '/login' || next.startsWith('/login?')) return '/app';
  return next;
}

export default function Login() {
  const query = useQuery();
  const next = sanitize(query.get('next') || '/app');

  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [message, setMessage] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);

  /**
   * Redirect to hive-identity login page
   * After login, hive-identity will redirect back with SSO token
   */
  const onSsoLogin = useCallback(() => {
    if (ssoLoading) return;
    setSsoLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Redirect to hive-identity login page
      // hive-identity will redirect back to thepayhive.com/auth/sso with token after login
      window.location.href = `${config.identityUrl}/login?client_id=payhive`;
    } catch (err) {
      console.error('[Login] SSO redirect error:', err);
      setSsoLoading(false);
      setStatus('error');
      setMessage('Unable to start SSO login. Please try again.');
    }
  }, [ssoLoading]);

  return (
    <AuthShell title="Sign in" subtitle="Sign in to your PayHive account.">
      <div className="space-y-4">
        {status === 'error' && (
          <StatusCallout tone="error">{message || 'Unable to sign in.'}</StatusCallout>
        )}

        {/* Primary SSO button */}
        <button
          type="button"
          onClick={onSsoLogin}
          disabled={ssoLoading}
          className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
        >
          {ssoLoading ? 'Redirecting...' : 'Sign in with PayHive SSO'}
        </button>

        <p className="text-center text-sm text-neutral-500">
          You'll be redirected to sign in securely via PayHive Identity.
        </p>
      </div>
    </AuthShell>
  );
}
