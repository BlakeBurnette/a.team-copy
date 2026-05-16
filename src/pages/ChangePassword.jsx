import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | weak | invalid_old | no_session
  const [message, setMessage] = useState('');

  const disabled = status === 'loading';

  const callout = useMemo(() => {
    if (status === 'success') return <StatusCallout tone="success">Password updated.</StatusCallout>;
    if (status === 'invalid_old') return <StatusCallout tone="error">Current password is incorrect.</StatusCallout>;
    if (status === 'weak') return <StatusCallout tone="error">{message || 'Password is too weak.'}</StatusCallout>;
    if (status === 'no_session') {
      return (
        <StatusCallout tone="warning">
          Session expired. Please <Link to="/login" className="underline underline-offset-2">sign in again</Link>.
        </StatusCallout>
      );
    }
    if (status === 'error') return <StatusCallout tone="error">{message || 'Unable to update password right now.'}</StatusCallout>;
    return null;
  }, [status, message]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    if (!oldPassword || !newPassword || !confirmPassword) {
      setStatus('error');
      setMessage('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('New passwords must match.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/password/change`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('success');
        try { await fetch(`${config.apiOrigin}/api/auth/me`, { credentials: 'include' }); } catch {}
        setTimeout(() => navigate('/app', { replace: true }), 800);
      } else if (res.status === 403 && body?.error === 'step_up_required') {
        navigate(`/step-up?next=/change-password`, { replace: true });
      } else if (res.status === 401 && body?.error === 'invalid_old_password') {
        setStatus('invalid_old');
      } else if (res.status === 400 && body?.error === 'weak_password') {
        setStatus('weak');
        setMessage(body?.message || 'Password is too weak.');
      } else if ((res.status === 401 || res.status === 400) && body?.error === 'no_session') {
        setStatus('no_session');
      } else {
        setStatus('error');
        setMessage(body?.message || 'Unable to update password right now.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <AuthShell title="Change password" subtitle="Update your account password.">
      <div className="space-y-4">
        {callout}
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm text-neutral-700">
            Current password
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="block text-sm text-neutral-700">
            New password
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="block text-sm text-neutral-700">
            Confirm new password
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
          >
            {disabled ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
