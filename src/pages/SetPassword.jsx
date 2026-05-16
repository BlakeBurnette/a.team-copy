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

export default function SetPassword() {
  const [token] = useState(() => parseToken());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('loading'); // loading | missing | form | success | invalid | error | weak
  const [errorMessage, setErrorMessage] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestStatus, setRequestStatus] = useState('idle'); // idle | sending | sent

  useEffect(() => {
    if (!token) {
      setStatus('missing');
    } else {
      setStatus('form');
    }
  }, [token]);

  const message = useMemo(() => {
    switch (status) {
      case 'missing':
        return 'Missing token. Please use the link from your email.';
      case 'success':
        return 'Password set. You can now sign in.';
      case 'invalid':
        return 'Link invalid or expired. Request a new one.';
      case 'weak':
        return errorMessage || 'Password does not meet policy.';
      case 'error':
        return errorMessage || 'Something went wrong. Please try again.';
      default:
        return 'Enter your new password.';
    }
  }, [status, errorMessage]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status !== 'form') return;
    if (!password || password !== confirm) {
      setStatus('error');
      setErrorMessage('Passwords must match.');
      return;
    }
    setStatus('loading');
    setErrorMessage('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/password/set/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('success');
      } else if (res.status === 400 && body?.error === 'weak_password') {
        setStatus('weak');
        setErrorMessage(body?.message || 'Password is too weak.');
      } else if (res.status === 400 && body?.error === 'invalid_or_expired') {
        setStatus('invalid');
      } else {
        setStatus('error');
        setErrorMessage(body?.message || 'Unable to set password.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  const onRequestNew = async (e) => {
    e.preventDefault();
    if (!requestEmail.trim() || requestStatus === 'sending') return;
    setRequestStatus('sending');
    try {
      await fetch(`${config.apiOrigin}/api/auth/password/set/request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestEmail.trim() }),
      }).catch(() => {});
    } finally {
      setRequestStatus('sent');
    }
  };

  const showForm = status === 'form' || status === 'weak' || status === 'error';

  return (
    <AuthShell title="Set your password" subtitle={message}>
      <div className="space-y-4">
        {status === 'loading' && (
          <StatusCallout tone="info">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" aria-label="loading" />
              <span>Processing…</span>
            </div>
          </StatusCallout>
        )}

        {status === 'success' && (
          <StatusCallout tone="success">Password set. You can now sign in.</StatusCallout>
        )}

        {status === 'missing' && (
          <StatusCallout tone="error">Missing token. Please use the link from your email.</StatusCallout>
        )}

        {status === 'invalid' && (
          <StatusCallout tone="warning">Link invalid or expired. Request a new one.</StatusCallout>
        )}

        {(status === 'weak' || status === 'error') && errorMessage ? (
          <StatusCallout tone="error">{errorMessage}</StatusCallout>
        ) : null}

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
              disabled={status === 'loading'}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
            >
              {status === 'loading' ? 'Saving…' : 'Set password'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-800 text-white font-medium hover:bg-neutral-900"
            >
              Sign in
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <form className="space-y-3" onSubmit={onRequestNew}>
            <label className="block text-sm text-neutral-700">
              Request a new link
              <input
                type="email"
                required
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <button
              type="submit"
              disabled={requestStatus === 'sending'}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-800 text-white font-medium hover:bg-neutral-900 disabled:opacity-60"
            >
              {requestStatus === 'sending' ? 'Requesting…' : 'Request new link'}
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
