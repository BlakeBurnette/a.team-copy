// src/components/InvoicePhotoModal.jsx
import { useState } from 'react';

export default function InvoicePhotoModal({
  open,
  onClose,
  invoiceId,      // required: existing invoice id
  onAttached,     // optional: () => void, called after successful attach
  maxPhotos = 10, // default max photos
}) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [debugMsg, setDebugMsg] = useState('');

  // helper so we don't repeat
  function onPick(e) {
    const chosen = Array.from(e.target.files || []);
    if (!chosen.length) return;

    const allowed = Math.max(0, maxPhotos - files.length);
    const slice = chosen.slice(0, allowed);

    setFiles((prev) => [
      ...prev,
      ...slice.map((f) => ({
        file: f,
        status: 'idle',
        meta: null,
      })),
    ]);

    e.target.value = '';
  }

  /**
   * Upload a single file by index.
   * Returns the meta object on success, or null on failure/skip.
   */
  async function uploadOne(i) {
    const it = files[i];
    if (!it || it.status !== 'idle' || !invoiceId) return null;

    setFiles((p) => {
      const cp = [...p];
      if (cp[i]) cp[i] = { ...cp[i], status: 'uploading' };
      return cp;
    });

    try {
      const contentType = it.file.type || 'application/octet-stream';
      const ext =
        (it.file.name.split('.').pop() || 'jpg')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') || 'jpg';

      // 1) presign
      const presignResp = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, contentType, ext }),
        credentials: 'include',
      });

      if (!presignResp.ok) {
        throw new Error(`presign failed (${presignResp.status})`);
      }

      const presign = await presignResp.json();

      // 2) PUT to object storage
      const putResp = await fetch(presign.putUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: it.file,
      });

      if (!putResp.ok) {
        throw new Error(`upload failed (${putResp.status})`);
      }

      // 3) build meta for DB
      const meta = {
        publicUrl: presign.publicUrl,
        key: presign.key,
        bytes: it.file.size || 0,
        contentType,
        w: 0,
        h: 0,
      };

      setFiles((p) => {
        const cp = [...p];
        if (cp[i]) cp[i] = { ...cp[i], status: 'done', meta };
        return cp;
      });

      setDebugMsg(`Uploaded ${it.file.name}`);
      return meta;
    } catch (e) {
      console.error('[InvoicePhotoModal] uploadOne error', e);
      setFiles((p) => {
        const cp = [...p];
        if (cp[i]) cp[i] = { ...cp[i], status: 'error' };
        return cp;
      });
      setDebugMsg(`Upload failed for ${it?.file?.name || 'file'} (see console)`);
      return null;
    }
  }

  /**
   * Upload all idle files and return array of meta objects.
   */
  async function uploadAllIfAny() {
    setBusy(true);
    const metas = [];
    const snapshot = [...files];

    for (let i = 0; i < snapshot.length; i++) {
      const f = snapshot[i];
      if (f.status === 'idle') {
        // eslint-disable-next-line no-await-in-loop
        const meta = await uploadOne(i);
        if (meta) metas.push(meta);
      } else if (f.status === 'done' && f.meta) {
        metas.push(f.meta);
      }
    }

    setBusy(false);
    return metas;
  }

  /**
   * Attach photos to the invoice, based on explicit metas
   * or from current state if none provided.
   */
  async function attachIfAny(explicitMetas = null) {
    if (!invoiceId) return;

    let photos = [];
    if (Array.isArray(explicitMetas) && explicitMetas.length > 0) {
      photos = explicitMetas;
    } else {
      const done = files.filter((f) => f.status === 'done' && f.meta);
      photos = done.map((f) => f.meta);
    }

    if (photos.length === 0) {
      setDebugMsg('No completed photos to attach');
      return false;
    }

    try {
      const resp = await fetch(`/api/invoices/${invoiceId}/photos`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ photos }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        console.log('[InvoicePhotoModal] attachIfAny non-OK body', txt);
        setDebugMsg('Attach failed (see console)');
        return false;
      }

      setDebugMsg(`Attached ${photos.length} photo(s) to invoice #${invoiceId}`);
      return true;
    } catch (e) {
      console.warn('[InvoicePhotoModal] attachIfAny error', e);
      setDebugMsg('Attach failed (see console)');
      return false;
    }
  }

  async function handleAttach() {
    try {
      const metas = await uploadAllIfAny();
      const ok = await attachIfAny(metas);
      if (ok) {
        // Clear state before closing
        setFiles([]);
        setDebugMsg('');
        onAttached?.();
        onClose?.();
      }
    } catch (e) {
      console.error('[InvoicePhotoModal] handleAttach error', e);
    }
  }

  function handleCancel() {
    setFiles([]);
    setDebugMsg('');
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      {/* Mobile-friendly container */}
      <div className="w-full h-full flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <h3 className="text-base sm:text-lg font-semibold">
                Attach photos to invoice
              </h3>
              {invoiceId && (
                <p className="text-xs sm:text-sm text-gray-500">
                  Invoice #{invoiceId} · Upload up to {maxPhotos} photos.
                </p>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="ml-3 text-gray-400 hover:text-gray-600"
              aria-label="Close"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-3 overflow-hidden">
            {debugMsg && (
              <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <span className="font-semibold">Note:</span> {debugMsg}
              </div>
            )}

            {/* Drop zone */}
            <div className="border-2 border-dashed rounded-xl px-3 py-4 sm:px-4 sm:py-5 text-center">
              <input
                id="invoice-photo-filepick"
                type="file"
                accept="image/*"
                multiple
                onChange={onPick}
                className="hidden"
              />
              <label
                htmlFor="invoice-photo-filepick"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 cursor-pointer"
              >
                Choose photos
              </label>
              <div className="text-xs text-gray-500 mt-2">
                Max {maxPhotos} photos · JPG / PNG
              </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto">
              {files.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-4">
                  No photos selected yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="border rounded-xl px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm truncate">
                          {f.file.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {f.status === 'idle' && 'Ready to upload'}
                          {f.status === 'uploading' && 'Uploading…'}
                          {f.status === 'done' && 'Uploaded'}
                          {f.status === 'error' &&
                            'Upload failed (you can retry or remove)'}
                        </div>
                      </div>
                      {f.status === 'idle' && (
                        <button
                          onClick={() => uploadOne(i)}
                          className="text-[11px] sm:text-xs underline whitespace-nowrap"
                          type="button"
                          disabled={busy}
                        >
                          Upload now
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="px-4 py-3 sm:px-5 sm:py-4 border-t flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              onClick={handleCancel}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={busy}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleAttach}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-black text-white text-sm font-medium rounded-xl disabled:opacity-70"
              disabled={busy || !invoiceId || files.length === 0}
              type="button"
            >
              {busy ? 'Attaching…' : 'Attach photos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
