// src/pages/AcceptInvite.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';

export default function AcceptInvite() {
  const [sp] = useSearchParams();
  const code =
    sp.get('token') ||
    sp.get('invite') ||
    sp.get('code');

  const { user, refreshMe } = useAuth() || {};
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (!code) {
      setError('Missing code');
      return;
    }
    axios.get(`/api/public/invitations/${encodeURIComponent(code)}`)
      .then((res) => setPreview(res.data))
      .catch((e) => setError(e?.response?.data?.error || 'Invalid or expired invite'));
  }, [code]);

  const strongEnough = (pw) => {
    if (!pw || pw.length < 12) return false;
    return /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  };

  const acceptInvite = async (token, pw, emailHint) => {
    const payload = {
      token,
      invite: token,
      code: token,
      invite_code: token,
      email: emailHint || preview?.email || undefined,
      password: pw,
    };

    const candidates = [
      { url: '/api/auth/invite/accept', data: payload },
      { url: `/api/public/invitations/${encodeURIComponent(token)}/accept`, data: { password: pw, email: payload.email } },
    ];

    let lastErr = null;
    for (const c of candidates) {
      try {
        const res = await axios.post(c.url, c.data, { withCredentials: true });
        if (res?.status && res.status < 300) return res;
      } catch (e) {
        lastErr = e;
        const st = e?.response?.status;
        if (st && st !== 404) break; // bail early on real errors; keep trying on missing routes
      }
    }
    if (lastErr) throw lastErr;
    throw new Error('Failed to accept invite');
  };

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!code || !password || claiming) return;
    if (password !== confirm) {
      setError('Passwords must match.');
      return;
    }
    if (!strongEnough(password)) {
      setError('Use at least 12 characters with upper, lower, number, and symbol.');
      return;
    }
    setClaiming(true);
    setError('');
    try {
      const res = await acceptInvite(code, password, preview?.email);
      const nextRole = res.data?.role || preview?.role || 'crew_member';
      await refreshMe?.();
      if (nextRole === 'crew_member') navigate('/app/crew', { replace: true });
      else navigate('/app', { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Failed to accept invite';
      setError(msg);
    } finally {
      setClaiming(false);
    }
  };

  if (!preview) {
    return (
      <AuthShell title="Preparing invite…">
        <div className="text-neutral-700">Loading invitation…</div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="You’re invited"
      subtitle={
        <span className="text-neutral-700">
          This invite is for <strong>{preview.email || 'your email'}</strong>.
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleAccept}>
        {error ? (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-800">Set your password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Create a password"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-800">Confirm password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </div>

        <div className="text-xs text-neutral-600">
          Use at least 12 characters with uppercase, lowercase, a number, and a symbol.
        </div>

        <button
          type="submit"
          disabled={claiming}
          className="w-full h-11 min-h-[44px] rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
        >
          {claiming ? 'Accepting…' : 'Accept invite'}
        </button>

        {preview.expires_at && (
          <p className="text-xs text-neutral-500">
            Expires {new Date(preview.expires_at).toLocaleString()}
          </p>
        )}
      </form>
    </AuthShell>
  );
}
