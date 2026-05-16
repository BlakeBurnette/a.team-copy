import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function StepUp() {
  const query = useQuery();
  const navigate = useNavigate();
  const next = query.get('next') || '/app';
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [backupStatus, setBackupStatus] = useState('idle'); // idle | loading | error

  const onVerify = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const optRes = await fetch(`${config.apiOrigin}/api/auth/webauthn/stepup/options`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!optRes.ok) {
        setStatus('error');
        setMessage('Could not start verification.');
        return;
      }
      const options = await optRes.json();
      const assertion = await startAuthentication(options);
      const verifyRes = await fetch(`${config.apiOrigin}/api/auth/webauthn/stepup/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: assertion }),
      });
      const body = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        setStatus('error');
        setMessage(body?.message || 'Verification failed.');
      } else {
        setStatus('success');
        setTimeout(() => navigate(next, { replace: true }), 600);
      }
    } catch {
      setStatus('error');
      setMessage('Verification was cancelled or failed.');
    }
  };

  const onVerifyBackup = async (e) => {
    e.preventDefault();
    if (backupStatus === 'loading') return;
    setBackupStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/mfa/backup-codes/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: (backupCode || '').trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && body?.error === 'invalid_code') {
          setBackupStatus('error');
          setMessage('Invalid backup code.');
        } else {
          setBackupStatus('error');
          setMessage(body?.message || 'Verification failed.');
        }
      } else {
        setBackupStatus('idle');
        setStatus('success');
        setTimeout(() => navigate(next, { replace: true }), 600);
      }
    } catch {
      setBackupStatus('error');
      setMessage('Verification failed.');
    }
  };

  return (
    <AuthShell title="Additional verification" subtitle="Higher-privilege accounts require a quick passkey check.">
      <div className="space-y-4">
        {status === 'error' && <StatusCallout tone="error">{message || 'Verification failed. Try again.'}</StatusCallout>}
        {status === 'success' && <StatusCallout tone="success">Verified. Redirecting…</StatusCallout>}
        {backupStatus === 'error' && !message && <StatusCallout tone="error">Verification failed. Try again.</StatusCallout>}
        {message && status !== 'error' && status !== 'success' && backupStatus === 'error' ? (
          <StatusCallout tone="error">{message}</StatusCallout>
        ) : null}

        <button
          type="button"
          onClick={onVerify}
          disabled={status === 'loading' || backupStatus === 'loading'}
          className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
        >
          {status === 'loading' ? 'Verifying…' : 'Verify with passkey'}
        </button>

        <div className="text-sm text-neutral-700">
          {!useBackup ? (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-amber-600"
              onClick={() => setUseBackup(true)}
            >
              Use a backup code instead
            </button>
          ) : (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-amber-600"
              onClick={() => setUseBackup(false)}
            >
              Use a passkey instead
            </button>
          )}
        </div>

        {useBackup && (
          <form className="space-y-3" onSubmit={onVerifyBackup}>
            <label className="block text-sm text-neutral-700">
              Backup code
              <input
                type="text"
                required
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <button
              type="submit"
              disabled={backupStatus === 'loading' || status === 'loading'}
              className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-neutral-800 text-white font-medium hover:bg-neutral-900 disabled:opacity-60"
            >
              {backupStatus === 'loading' ? 'Verifying…' : 'Verify backup code'}
            </button>
          </form>
        )}

        <div className="text-sm text-neutral-700">
          <button
            type="button"
            className="underline underline-offset-2 hover:text-amber-600"
            onClick={() => navigate(next || '/app')}
          >
            Go back
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
