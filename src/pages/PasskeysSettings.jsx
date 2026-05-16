import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { startRegistration } from '@simplewebauthn/browser';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

export default function PasskeysSettings() {
  const [meLoading, setMeLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true);

  const [deviceLabel, setDeviceLabel] = useState('This device');
  const [listLoading, setListLoading] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadMe = async () => {
    setMeLoading(true);
    setSessionOk(false);
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/me`, { credentials: 'include' });
      if (!res.ok) {
        setSessionOk(false);
        setMeLoading(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setSessionOk(true);
      setEmailVerified(Boolean(data?.email_verified ?? true));
    } catch {
      setSessionOk(false);
    } finally {
      setMeLoading(false);
    }
  };

  const loadCredentials = async () => {
    setListLoading(true);
    setError('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/webauthn/credentials`, { credentials: 'include' });
      if (!res.ok) {
        setError('Failed to load passkeys.');
        setCredentials([]);
      } else {
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data) ? data : Array.isArray(data?.credentials) ? data.credentials : [];
        setCredentials(list);
      }
    } catch {
      setError('Failed to load passkeys.');
      setCredentials([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (sessionOk) loadCredentials();
  }, [sessionOk]);

  const startAdd = async () => {
    setAdding(true);
    setError('');
    setSuccessMessage('');
    try {
      const optRes = await fetch(`${config.apiOrigin}/api/auth/webauthn/register/options`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!optRes.ok) {
        const body = await optRes.json().catch(() => ({}));
        if (optRes.status === 403 && body?.error === 'email_not_verified') {
          setError('Please verify your email before adding a passkey.');
        } else {
          setError(body?.message || 'Could not start passkey registration.');
        }
        setAdding(false);
        return;
      }
      const options = await optRes.json();
      const credential = await startRegistration(options);
      const verifyRes = await fetch(`${config.apiOrigin}/api/auth/webauthn/register/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, deviceLabel: deviceLabel || 'This device' }),
      });
      const body = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        if (verifyRes.status === 403 && body?.error === 'email_not_verified') {
          setError('Please verify your email before adding a passkey.');
        } else {
          setError(body?.message || 'Passkey registration failed.');
        }
      } else {
        setSuccessMessage('Passkey added.');
        await loadCredentials();
      }
    } catch (e) {
      setError('Passkey registration was cancelled or failed.');
    } finally {
      setAdding(false);
    }
  };

  const revoke = async (id) => {
    if (!id) return;
    setError('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/webauthn/credentials/${encodeURIComponent(id)}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 403 && body?.error === 'step_up_required') {
          window.location.assign('/step-up?next=/passkeys');
          return;
        }
        setError(body?.message || 'Failed to revoke passkey.');
      } else {
        setSuccessMessage('Passkey revoked.');
        await loadCredentials();
      }
    } catch {
      setError('Failed to revoke passkey.');
    }
  };

  const callout = useMemo(() => {
    if (meLoading) return null;
    if (!sessionOk) {
      return (
        <StatusCallout tone="warning">
          You need to sign in to manage passkeys. <Link to="/login" className="underline underline-offset-2">Sign in</Link>
        </StatusCallout>
      );
    }
    if (!emailVerified) {
      return <StatusCallout tone="warning">Please verify your email before adding a passkey.</StatusCallout>;
    }
    if (error) return <StatusCallout tone="error">{error}</StatusCallout>;
    if (successMessage) return <StatusCallout tone="success">{successMessage}</StatusCallout>;
    return null;
  }, [meLoading, sessionOk, emailVerified, error, successMessage]);

  return (
    <AuthShell title="Passkeys" subtitle="Register and manage passkeys for passwordless sign-in.">
      <div className="space-y-4">
        {callout}

        {sessionOk ? (
          <>
            <div className="space-y-3 border border-neutral-200 rounded-lg p-4">
              <label className="block text-sm text-neutral-700">
                Device label
                <input
                  type="text"
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
              <button
                type="button"
                onClick={startAdd}
                disabled={adding}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
              >
                {adding ? 'Adding…' : 'Add passkey'}
              </button>
            </div>

            <div className="border border-neutral-200 rounded-lg p-4 space-y-3 bg-white">
              <div className="text-sm font-semibold text-neutral-800">Your passkeys</div>
              {listLoading ? (
                <div className="text-sm text-neutral-600">Loading…</div>
              ) : credentials.length === 0 ? (
                <div className="text-sm text-neutral-600">No passkeys yet.</div>
              ) : (
                <div className="space-y-2">
                  {credentials.map((cred) => (
                    <div
                      key={cred.id || cred.credentialId || cred.credential_id}
                      className="flex items-center justify-between border border-neutral-200 rounded-lg px-3 py-2"
                    >
                      <div className="text-sm">
                        <div className="font-semibold text-neutral-900">{cred.device_label || cred.label || 'Passkey'}</div>
                        {cred.created_at ? (
                          <div className="text-xs text-neutral-600">
                            Added {new Date(cred.created_at).toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => revoke(cred.id || cred.credentialId || cred.credential_id)}
                        className="text-sm px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-50"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AuthShell>
  );
}
