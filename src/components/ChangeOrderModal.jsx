import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { createChangeOrder } from '../api/changeOrders';
import { getUploadUrl, completeUpload } from '../api/changeOrderEvidence';
const sha256Hex = async (file) => {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const dollarsToCents = (val) => {
  if (val == null) return null;
  const s = String(val).replace(/[^0-9.]/g, '');
  if (!s) return 0;
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (cents) =>
  typeof cents === 'number'
    ? (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '';

const blankItem = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  name: '',
  qty: 1,
  priceDisplay: '',
  description: '',
});

export default function ChangeOrderModal({
  open,
  onClose,
  serviceRecordId,
  headers,
  onCreated,
}) {
  const [items, setItems] = useState([blankItem()]);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadUnavailable, setUploadUnavailable] = useState(false);

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, blankItem()]);
  const removeItem = (id) => setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));

  const totalCents = useMemo(() => {
    return items.reduce((sum, it) => {
      const qty = Number(it.qty || 0);
      const price = dollarsToCents(it.priceDisplay);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
      return sum + qty * price;
    }, 0);
  }, [items]);

  const reset = () => {
    setItems([blankItem()]);
    setNote('');
    setReason('');
    setError('');
    setFiles([]);
    setEvidence([]);
  };

  const resolveHeaders = async () => {
    try {
      if (typeof headers === 'function') return await headers();
      return headers;
    } catch {
      return headers;
    }
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!serviceRecordId) return;
    const normalized = items
      .map((it) => ({
        name: String(it.name || '').trim(),
        qty: Number(it.qty || 0),
        unit_price_cents: dollarsToCents(it.priceDisplay),
        description: it.description?.trim() || null,
      }))
      .filter((it) => it.name && Number.isFinite(it.qty) && it.qty > 0 && Number.isFinite(it.unit_price_cents));
    if (!normalized.length) {
      setError('Add at least one line item with name, qty, and price.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const hdr = await resolveHeaders();
      const res = await createChangeOrder(
        {
          service_record_id: serviceRecordId,
          items: normalized,
          reason: reason?.trim() || null,
          note: note?.trim() || null,
        },
        hdr
      );
      const changeOrderId = res?.change_order?.id || res?.id;
      if (files.length && changeOrderId && !uploadUnavailable) {
        await uploadEvidence(changeOrderId, hdr);
      }
      onCreated?.(res);
      reset();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to send change order');
    } finally {
      setSaving(false);
    }
  };

  const uploadEvidence = async (changeOrderId, hdr) => {
    setUploading(true);
    try {
      for (const file of files) {
        const payload = { content_type: file.type, byte_size: file.size };
        let res;
        try {
          res = await getUploadUrl(changeOrderId, payload, hdr);
        } catch (err) {
          const code = err?.response?.data?.code || err?.response?.data?.error;
          if (code === 'storage_misconfigured') {
            setUploadUnavailable(true);
            setError('File uploads are temporarily unavailable. Please contact support.');
            return;
          }
          setError(err?.response?.data?.message || err?.response?.data?.error || 'Evidence upload failed');
          return;
        }
        const uploadUrl = res.upload_url || res.url;
        const fileKey = res.file_key || res.key;
        const maxBytes = res.max_bytes || res.maxBytes;
        if (maxBytes && file.size > maxBytes) {
          setError(`That file is too large (max ${(maxBytes / (1024 * 1024)).toFixed(1)} MB). Please choose a smaller file.`);
          continue;
        }
        await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
          const sha = await sha256Hex(file);
          await completeUpload(changeOrderId, {
            file_key: fileKey,
            content_type: file.type,
            byte_size: file.size,
            sha256_hex: sha,
          }, hdr);
          setEvidence((prev) => [...prev, { id: fileKey, name: file.name, url: res.download_url || uploadUrl }]);
        }
        setFiles([]);
    } catch (err) {
      setError(err?.response?.data?.error || 'Evidence upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="text-lg font-semibold">Create Change Order</div>
        <div className="text-sm text-neutral-700">
          Customer must approve before this is charged. Charged when service completes.
        </div>
        <div className="text-xs text-amber-700">Add a short reason to prevent disputes.</div>

        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="border rounded-lg p-3 space-y-2 bg-neutral-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="space-y-1 text-sm">
                  <span className="text-neutral-700">Name</span>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    placeholder="e.g., Extra debris haul"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-neutral-700">Quantity</span>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2"
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                    min="1"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-neutral-700">Unit price</span>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={it.priceDisplay}
                    onChange={(e) => updateItem(it.id, { priceDisplay: e.target.value })}
                    placeholder="$0.00"
                    required
                  />
                </label>
              </div>
              <label className="block space-y-1 text-sm">
                <span className="text-neutral-700">Description (optional)</span>
                <textarea
                  className="w-full border rounded-lg px-3 py-2"
                  rows="2"
                  value={it.description}
                  onChange={(e) => updateItem(it.id, { description: e.target.value })}
                  placeholder="Add extra context for the customer"
                />
              </label>
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs text-rose-700 hover:bg-rose-50"
                  disabled={items.length <= 1}
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
          >
            <Plus className="w-4 h-4" /> Add line item
          </button>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-neutral-700">Reason for change (recommended)</span>
          <textarea
            className="w-full border rounded-lg px-3 py-2 border-amber-300 bg-amber-50"
            rows="2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Add a quick reason to avoid disputes"
          />
          <div className="text-xs text-neutral-600">Not required, but helps avoid confusion.</div>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-neutral-700">Note to customer (optional)</span>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            rows="2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-neutral-700">Evidence (photos)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            disabled={uploadUnavailable}
          />
          <div className="text-xs text-neutral-600">Attach photos to avoid disputes.</div>
          {files.length ? (
            <div className="text-xs text-neutral-700">Pending: {files.map((f) => f.name).join(', ')}</div>
          ) : null}
          {evidence.length ? (
            <div className="space-y-1 text-xs text-neutral-700">
              {evidence.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2">
                  <span>{ev.name}</span>
                  {ev.url ? (
                    <a href={ev.url} className="text-emerald-700 underline" target="_blank" rel="noreferrer">View</a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {uploadUnavailable ? (
            <div className="text-sm text-red-600">
              File uploads are temporarily unavailable. Please contact support.
            </div>
          ) : null}
        </label>

        <div className="text-sm font-semibold text-neutral-900">
          Total: {fmtMoney(totalCents) || '$0.00'}
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border text-sm bg-white hover:bg-neutral-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
            disabled={saving || uploading}
          >
            {(saving || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {(saving || uploading) ? 'Sending…' : 'Send for approval'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
