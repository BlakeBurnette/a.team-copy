import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | invalid_email
  const [message, setMessage] = useState('');

  const disabled = status === 'loading';

  const callout = useMemo(() => {
    if (status === 'success') {
      return (
        <StatusCallout tone="success">
          If that email is eligible, you’ll receive a reset link shortly.
        </StatusCallout>
      );
    }
    if (status === 'invalid_email') {
      return <StatusCallout tone="error">Please enter a valid email.</StatusCallout>;
    }
    if (status === 'error') {
      return <StatusCallout tone="error">{message || 'Unable to request reset right now.'}</StatusCallout>;
    }
    return null;
  }, [status, message]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/password/reset/request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('success');
      } else if (res.status === 400 && body?.error === 'invalid_email') {
        setStatus('invalid_email');
      } else {
        setStatus('error');
        setMessage(body?.message || 'Unable to request reset right now.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="Enter your email to request a reset link.">
      <div className="space-y-4">
        {callout}
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm text-neutral-700">
            Email
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
            disabled={disabled}
            className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
          >
            {disabled ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <div className="text-sm text-neutral-700">
          <Link to="/login" className="underline underline-offset-2 hover:text-amber-600">
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
