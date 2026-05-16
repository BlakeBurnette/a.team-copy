import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

export default function BackupCodes() {
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(null);
  const [codes, setCodes] = useState([]);
  const [error, setError] = useState('');
  const [notMfaUser, setNotMfaUser] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/mfa/backup-codes/status`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403) setNotMfaUser(true);
        else setError('Failed to load backup codes status.');
        setRemaining(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setRemaining(typeof data?.remaining === 'number' ? data.remaining : null);
        setNotMfaUser(false);
      }
    } catch {
      setError('Failed to load backup codes status.');
      setRemaining(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${config.apiOrigin}/api/auth/mfa/backup-codes/generate`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && body?.error === 'not_mfa_user') {
          setNotMfaUser(true);
        } else {
          setError(body?.message || 'Failed to generate backup codes.');
        }
        setCodes([]);
      } else {
        const list = Array.isArray(body?.codes) ? body.codes : [];
        setCodes(list);
        setRemaining(list.length);
      }
    } catch {
      setError('Failed to generate backup codes.');
      setCodes([]);
    } finally {
      setGenerating(false);
    }
  };

  const callout = useMemo(() => {
    if (notMfaUser) {
      return (
        <StatusCallout tone="info">
          Backup codes are available for owners/admins/crew leaders.
        </StatusCallout>
      );
    }
    if (error) return <StatusCallout tone="error">{error}</StatusCallout>;
    if (codes.length > 0) {
      return (
        <StatusCallout tone="success">
          <div className="space-y-2">
            <div>Copy these codes now. They will not be shown again.</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {codes.map((c) => (
                <div key={c} className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1">
                  {c}
                </div>
              ))}
            </div>
            <div className="text-xs text-neutral-700">
              Store them in a password manager. Each code can be used once.
            </div>
          </div>
        </StatusCallout>
      );
    }
    return null;
  }, [error, codes, notMfaUser]);

  return (
    <AuthShell title="Backup codes" subtitle="Use backup codes to sign in or step-up when passkeys are unavailable.">
      <div className="space-y-4">
        {callout}

        {!notMfaUser && (
          <div className="space-y-2">
            <div className="text-sm text-neutral-800">
              Remaining codes: {remaining == null ? (loading ? '…' : 'Unknown') : remaining}
            </div>
            <div className="text-xs text-amber-700">
              Generating new codes will invalidate any existing codes.
            </div>
          </div>
        )}

        {!notMfaUser && (
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Generate new backup codes'}
          </button>
        )}

        <div className="text-sm text-neutral-700">
          <Link to="/login" className="underline underline-offset-2 hover:text-amber-600">
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
