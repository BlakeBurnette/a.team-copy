import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Toast from './Toast';
import { sendServiceRecordProof } from '../api/serviceRecords';

const CHANNELS = [
  { key: 'sms', label: 'Send via SMS' },
  { key: 'email', label: 'Send via Email' },
];

export default function SendProofModal({
  isOpen,
  onClose,
  serviceRecordId,
  defaultChannels,
  customerContact,
  headers,
}) {
  const initialChannels = useMemo(
    () => (Array.isArray(defaultChannels) && defaultChannels.length ? defaultChannels : ['sms', 'email']),
    [defaultChannels]
  );
  const [selected, setSelected] = useState(initialChannels);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  useEffect(() => {
    if (isOpen) {
      setSelected(initialChannels);
      setLoading(false);
      setError('');
      setProofUrl('');
    }
  }, [isOpen, initialChannels]);

  const toggle = (key) => {
    setSelected((prev) => {
      const set = new Set(prev || []);
      if (set.has(key)) set.delete(key); else set.add(key);
      return Array.from(set);
    });
  };

  const copyLink = async () => {
    if (!proofUrl) return;
    try {
      await navigator.clipboard.writeText(proofUrl);
      setToast({ show: true, msg: 'Proof link copied', duration: 1800 });
    } catch {
      setToast({ show: true, msg: 'Failed to copy link', duration: 2000 });
    }
  };

  const onSend = async () => {
    if (!serviceRecordId || !selected.length) return;
    setLoading(true);
    setError('');
    try {
      const payload = { channels: selected };
      const data = await sendServiceRecordProof(serviceRecordId, payload, headers);
      const url = data?.proof_url || data?.proofUrl || '';
      setProofUrl(url);
      setToast({ show: true, msg: 'Proof sent successfully.', duration: 2200 });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to send proof');
      setToast({ show: true, msg: 'Failed to send proof', duration: 2200 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast show={toast.show} duration={toast.duration} onClose={() => setToast((t) => ({ ...t, show: false }))}>
        {toast.msg}
      </Toast>
      <Modal open={isOpen} onClose={onClose}>
        <div className="space-y-4">
          <div>
            <div className="text-lg font-semibold">Send Proof</div>
            {customerContact?.name && (
              <div className="text-sm text-neutral-600">To: {customerContact.name}</div>
            )}
            {!customerContact?.name && (customerContact?.email || customerContact?.phone) ? (
              <div className="text-sm text-neutral-600">
                {customerContact.email || ''}{customerContact.email && customerContact.phone ? ' · ' : ''}{customerContact.phone || ''}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            {CHANNELS.map((ch) => (
              <label key={ch.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(ch.key)}
                  onChange={() => toggle(ch.key)}
                  disabled={loading}
                />
                {ch.label}
              </label>
            ))}
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          {proofUrl ? (
            <div className="space-y-2">
              <div className="text-sm text-neutral-600">Proof link</div>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  value={proofUrl}
                  readOnly
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded border bg-white hover:bg-neutral-50 text-sm"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded border text-sm"
              disabled={loading}
            >
              Close
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={loading || !selected.length}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
