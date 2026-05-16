import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';

function parseToken() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
}

export default function VerifyEmail() {
  const [status, setStatus] = useState('loading'); // loading | success | missing | invalid | error
  const [token] = useState(() => parseToken());
  const [requestStatus, setRequestStatus] = useState('idle'); // idle | sending | sent
  const [email, setEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus('missing');
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const res = await fetch(`${config.apiOrigin}/api/auth/email/verify?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          credentials: 'include',
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && body?.ok) {
          setStatus('success');
        } else if (res.status === 400 && body?.error === 'missing_token') {
          setStatus('missing');
        } else if (res.status === 400 && body?.error === 'invalid_or_expired') {
          setStatus('invalid');
        } else {
          setStatus('error');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const canRequestNew = status === 'invalid';
  const message = useMemo(() => {
    switch (status) {
      case 'loading':
        return 'Verifying your email…';
      case 'success':
        return 'Email verified. You can close this tab or continue.';
      case 'missing':
        return 'Missing verification token.';
      case 'invalid':
        return 'This link is invalid or expired. Request a new one.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }, [status]);

  const onRequestNew = async (e) => {
    e.preventDefault();
    if (requestStatus === 'sending' || !email.trim()) return;
    setRequestStatus('sending');
    try {
      await fetch(`${config.apiOrigin}/api/auth/email/verify/request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      }).catch(() => {});
    } finally {
      setRequestStatus('sent');
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle={message}>
      <div className="space-y-4">
        {status === 'loading' && (
          <StatusCallout tone="info">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" aria-label="loading" />
              <span>Checking link…</span>
            </div>
          </StatusCallout>
        )}

        {status === 'success' && (
          <StatusCallout tone="success">Email verified. You can close this tab or continue.</StatusCallout>
        )}

        {status === 'missing' && (
          <StatusCallout tone="error">Missing verification token.</StatusCallout>
        )}

        {status === 'invalid' && (
          <StatusCallout tone="warning">This link is invalid or expired. Request a new one.</StatusCallout>
        )}

        {status === 'error' && (
          <StatusCallout tone="error">Something went wrong. Please try again.</StatusCallout>
        )}

        {status === 'success' && (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/set-password"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-800 text-white font-medium hover:bg-neutral-900"
            >
              Set your password
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-neutral-300 text-neutral-800 font-medium hover:bg-neutral-50"
            >
              Sign in
            </Link>
          </div>
        )}

        {canRequestNew && (
          <form className="space-y-3" onSubmit={onRequestNew}>
            <label className="block text-sm text-neutral-700">
              Enter your email to request a new link
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <button
              type="submit"
              disabled={requestStatus === 'sending'}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
            >
              {requestStatus === 'sending' ? 'Sending…' : 'Request a new link'}
            </button>
            {requestStatus === 'sent' && (
              <div className="text-sm text-neutral-700">
                If that email is eligible, you’ll receive a link.
              </div>
            )}
          </form>
        )}
      </div>
    </AuthShell>
  );
}
