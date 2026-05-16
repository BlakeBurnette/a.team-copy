import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

function parseToken() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token] = useState(() => parseToken());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('loading'); // loading | missing | form | success | invalid | weak | error | mfa
  const [message, setMessage] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const requestIdMessage = (res, fallback) => {
    const rid = res?.headers?.get?.('X-Request-Id') || res?.headers?.get?.('x-request-id');
    return rid ? `${fallback} Reference ID: ${rid}` : fallback;
  };

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus('missing');
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const res = await fetch(`${config.apiOrigin}/api/auth/password/reset/preflight`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && body?.ok) {
          const required = !!body.mfaRequired;
          setMfaRequired(required);
          setStatus(required ? 'mfa' : 'form');
        } else if (res.status === 400 && body?.error === 'invalid_or_expired') {
          setStatus('invalid');
        } else {
          setStatus('error');
          setMessage(requestIdMessage(res, 'Unable to reset password right now.'));
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const disabled = status === 'loading';

  const callout = useMemo(() => {
    if (status === 'missing') return <StatusCallout tone="error">Missing reset token.</StatusCallout>;
    if (status === 'invalid') {
      return (
        <StatusCallout tone="warning">
          This link is invalid or expired. <Link to="/forgot-password" className="underline underline-offset-2">Request a new one.</Link>
        </StatusCallout>
      );
    }
    if (status === 'mfa' && mfaRequired) {
      const nextParam = `/reset-password?token=${encodeURIComponent(token)}`;
      return (
        <StatusCallout tone="info">
          <div className="space-y-2">
            <div>This account requires passkey verification to reset the password.</div>
            <button
              type="button"
              onClick={() => navigate(`/step-up?next=${encodeURIComponent(nextParam)}`)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
            >
              Verify with passkey
            </button>
          </div>
        </StatusCallout>
      );
    }
    if (status === 'weak') return <StatusCallout tone="error">{message || 'Password is too weak.'}</StatusCallout>;
    if (status === 'error') return <StatusCallout tone="error">{message || 'Unable to reset password right now.'}</StatusCallout>;
    if (status === 'success') return <StatusCallout tone="success">Password reset. You can now sign in.</StatusCallout>;
    return null;
  }, [status, message, mfaRequired, navigate, token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (disabled || status === 'missing' || status === 'mfa') return;
    if (password !== confirm) {
      setStatus('error');
      setMessage('Passwords must match.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/password/reset/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('success');
        setTimeout(() => navigate('/login', { replace: true }), 800);
      } else if (res.status === 403 && body?.error === 'step_up_required') {
        const nextParam = `/reset-password?token=${encodeURIComponent(token)}`;
        navigate(`/step-up?next=${encodeURIComponent(nextParam)}`, { replace: true });
      } else if (res.status === 400 && body?.error === 'weak_password') {
        setStatus('weak');
        setMessage(body?.message || 'Password is too weak.');
      } else if (res.status === 400 && body?.error === 'invalid_or_expired') {
        setStatus('invalid');
      } else if (res.status === 400 && body?.error === 'missing_token') {
        setStatus('missing');
      } else {
        setStatus('error');
        setMessage(requestIdMessage(res, body?.message || 'Unable to reset password right now.'));
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  const showForm = status === 'form' || status === 'weak' || status === 'error';

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password for your account.">
      <div className="space-y-4">
        {callout}

        {showForm && (
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm text-neutral-700">
              New password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="block text-sm text-neutral-700">
              Confirm password
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
            >
              {disabled ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-800 text-white font-medium hover:bg-neutral-900"
          >
            Sign in
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
