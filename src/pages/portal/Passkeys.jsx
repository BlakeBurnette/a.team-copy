import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import Toast from '../../components/Toast';
import {
  getRegistrationOptions,
  createPasskey,
  listCredentials,
  deleteCredential,
} from '../../api/webauthn';
import { useAuth } from '../../context/AuthContext.jsx';

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

export default function Passkeys() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });
  const closeToast = () => setToast((t) => ({ ...t, show: false }));

  const authHeader = useCallback(async () => ({}), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeader();
      const data = await listCredentials(headers);
      const list = Array.isArray(data?.credentials) ? data.credentials : Array.isArray(data) ? data : [];
      setItems(list);
    } catch (e) {
      setItems([]);
      setError(e?.response?.data?.error || e?.message || 'Failed to load passkeys');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { load(); }, [load]);

  const addPasskey = async () => {
    setBusy(true);
    setError('');
    try {
      if (!window.PublicKeyCredential) {
        setError('Passkeys not supported on this device/browser.');
        setBusy(false);
        return;
      }
      const headers = await authHeader();
      const options = await getRegistrationOptions(headers);
      await createPasskey(options, headers);
      showToast('Passkey added');
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Passkey setup failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const headers = await authHeader();
      await deleteCredential(id, headers);
      showToast('Passkey removed');
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to remove passkey');
    } finally {
      setBusy(false);
    }
  };

  const hasCreds = items.length > 0;
  const header = useMemo(() => ({
    title: 'Passkeys',
    subtitle: 'Passkeys help confirm it’s really you for approvals.',
  }), []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <Toast show={toast.show} duration={toast.duration} onClose={closeToast}>
        {toast.msg}
      </Toast>

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase text-neutral-500">Security</div>
          <h1 className="text-2xl font-bold">{header.title}</h1>
          <div className="text-sm text-neutral-600">{header.subtitle}</div>
        </div>
        <button
          type="button"
          onClick={addPasskey}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
          disabled={busy}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {busy ? 'Working…' : 'Add passkey'}
        </button>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="bg-white border rounded-xl shadow-sm p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-neutral-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading passkeys…
          </div>
        ) : !hasCreds ? (
          <div className="text-sm text-neutral-700">
            No passkeys yet. Add one to speed up approvals and strengthen security.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between bg-neutral-50">
                <div className="space-y-1 text-sm text-neutral-800">
                  <div className="font-semibold">{c.name || c.label || 'Passkey'}</div>
                  <div className="text-xs text-neutral-600">
                    Added {fmtDateTime(c.created_at || c.inserted_at)} • Last used {fmtDateTime(c.last_used_at || c.last_used)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  disabled={busy}
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-neutral-600 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        Passkeys stay on your device; we only store public keys to verify approvals.
      </div>
    </div>
  );
}
