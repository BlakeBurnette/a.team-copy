// src/components/PhotoUploadModal.jsx

import { useEffect, useMemo, useState } from 'react';

export default function PhotoUploadModal({
  open,
  onClose,
  scheduleRuleId,   // number
  onComplete,       // (payload) => void  (call your existing /complete POST)
  scheduleDate,
  maxPhotos = 10,   // ⬅️ allow up to 10 photos by default
}) {
  const [invoiceId, setInvoiceId] = useState(null);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [debugMsg, setDebugMsg] = useState(''); // ⬅️ optional UI debug
  const [checklists, setChecklists] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState('');

  // helper so we don't repeat
  const authHeaders = (extra = {}) => ({ ...extra });

  // Ensure an invoice exists (optional; non-blocking if this fails)
  useEffect(() => {
    let alive = true;

    async function ensureInvoice() {
      if (!open || !scheduleRuleId) {
        console.log('[PhotoUploadModal] ensureInvoice: skipped (open/scheduleRuleId)', { open, scheduleRuleId });
        return;
      }

      try {
        const url = `/api/invoices/ensure?scheduleId=${encodeURIComponent(scheduleRuleId)}`;
        console.log('[PhotoUploadModal] ensureInvoice: GET', url);
        const r = await fetch(url, { headers: authHeaders(), credentials: 'include' });
        console.log('[PhotoUploadModal] ensureInvoice: response', { status: r.status });

        const j = await r.json().catch(e => {
          console.log('[PhotoUploadModal] ensureInvoice: JSON parse error', e);
          return null;
        });
        console.log('[PhotoUploadModal] ensureInvoice: body', j);

        if (alive && j?.invoiceId) {
          console.log('[PhotoUploadModal] ensureInvoice: setInvoiceId', j.invoiceId);
          setInvoiceId(j.invoiceId);
          setDebugMsg(`Invoice ensured (#${j.invoiceId})`);
        } else if (alive) {
          setDebugMsg('No invoiceId returned from /api/invoices/ensure');
        }
      } catch (err) {
        console.error('[PhotoUploadModal] ensureInvoice error', err);
        if (alive) setDebugMsg('Error ensuring invoice (see console)');
      }
    }

    ensureInvoice();
    return () => { alive = false; };
  }, [open, scheduleRuleId]);

  // Load all checklists for this rule/date
  useEffect(() => {
    let alive = true;
    const fetchChecklists = async () => {
      if (!open || !scheduleRuleId || !scheduleDate) {
        if (alive) {
          setChecklists([]);
          setChecklistError('');
          setChecklistLoading(false);
        }
        return;
      }
      setChecklistLoading(true);
      setChecklistError('');
      try {
        const url = `/api/schedule/${scheduleRuleId}/checklists?date=${encodeURIComponent(scheduleDate)}`;
        const resp = await fetch(url, { headers: authHeaders(), credentials: 'include' });
        if (!resp.ok) throw new Error(`Checklist fetch failed (${resp.status})`);
        const data = await resp.json();
        const enabled = data?.enabled !== false;
        const list = enabled ? (Array.isArray(data?.checklists) ? data.checklists : []) : [];
        const normalized = list.map((cl) => {
          const items = Array.isArray(cl.items) ? [...cl.items] : [];
          items.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
          return {
            checklistTemplateId: cl.checklist_template_id || cl.id,
            name: cl.name || cl.title || 'Checklist',
            description: cl.description || '',
            isRequiredForService: Boolean(cl.is_required_for_service || cl.is_required),
            items: items.map((it) => ({
              templateItemId: it.id,
              label: it.label,
              required: Boolean(it.required),
              checked: false,
              note: '',
            })),
          };
        });
        if (alive) setChecklists(normalized);
      } catch (e) {
        if (alive) {
          setChecklists([]);
          setChecklistError(e?.message || 'Failed to load checklists');
        }
      } finally {
        if (alive) setChecklistLoading(false);
      }
    };
    fetchChecklists();
    return () => { alive = false; };
  }, [open, scheduleRuleId, scheduleDate]);

  function onPick(e) {
    const chosen = Array.from(e.target.files || []);
    console.log('[PhotoUploadModal] onPick: chosen files', chosen.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
    })));

    if (!chosen.length) return;
    const allowed = Math.max(0, maxPhotos - files.length);
    const slice = chosen.slice(0, allowed);
    setFiles(prev => {
      const next = [
        ...prev,
        ...slice.map(f => ({ file: f, status: 'idle', meta: null })),
      ];
      console.log('[PhotoUploadModal] files state after pick', next);
      return next;
    });
    e.target.value = '';
  }

  /**
   * Upload a single file by index.
   * Returns the meta object on success, or null on failure/skip.
   */
  async function uploadOne(i) {
    const it = files[i];
    if (!it || it.status !== 'idle' || !invoiceId) {
      console.log('[PhotoUploadModal] uploadOne: skipped', {
        exists: !!it,
        status: it?.status,
        invoiceId,
      });
      return null;
    }

    console.log('[PhotoUploadModal] uploadOne: start', {
      index: i,
      name: it.file.name,
      size: it.file.size,
      type: it.file.type,
      invoiceId,
    });

    // flip UI state to "uploading"
    setFiles(p => {
      const cp = [...p];
      if (cp[i]) cp[i] = { ...cp[i], status: 'uploading' };
      return cp;
    });

    try {
      const contentType = it.file.type || 'application/octet-stream';
      const ext = (it.file.name.split('.').pop() || 'jpg')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'jpg';

      // 1) presign
      console.log('[PhotoUploadModal] presign request body', { invoiceId, contentType, ext });
      const presignResp = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ invoiceId, contentType, ext }),
      });

      console.log('[PhotoUploadModal] presign response status', presignResp.status);
      if (!presignResp.ok) {
        const txt = await presignResp.text().catch(() => '');
        console.log('[PhotoUploadModal] presign non-OK body', txt);
        throw new Error(`presign failed (${presignResp.status})`);
      }

      const presign = await presignResp.json();
      console.log('[PhotoUploadModal] presign payload', presign);

      // 2) PUT to object storage
      console.log('[PhotoUploadModal] PUT upload', {
        putUrl: presign.putUrl,
        size: it.file.size,
        contentType,
      });

      const putResp = await fetch(presign.putUrl, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': contentType }),
        body: it.file,
      });

      console.log('[PhotoUploadModal] PUT response', { status: putResp.status });
      if (!putResp.ok) {
        const txt = await putResp.text().catch(() => '');
        console.log('[PhotoUploadModal] PUT non-OK body', txt);
        throw new Error(`upload failed (${putResp.status})`);
      }

      // 3) build meta object for DB + future attach
      const meta = {
        publicUrl: presign.publicUrl,
        key: presign.key,
        bytes: it.file.size || 0,
        contentType,
        w: 0,
        h: 0,
      };

      // update UI state to "done" with meta
      setFiles(p => {
        const cp = [...p];
        if (cp[i]) {
          cp[i] = {
            ...cp[i],
            status: 'done',
            meta,
          };
          console.log('[PhotoUploadModal] file marked done', cp[i]);
        }
        return cp;
      });

      setDebugMsg(`Uploaded ${it.file.name}`);
      return meta;
    } catch (e) {
      console.error('[PhotoUploadModal] uploadOne error', e);
      setFiles(p => {
        const cp = [...p];
        if (cp[i]) cp[i] = { ...cp[i], status: 'error' };
        return cp;
      });
      setDebugMsg(`Upload failed for ${it?.file?.name || 'file'} (see console)`);
      return null;
    }
  }

  /**
   * Upload all idle files and return an array of
   * meta objects for successfully uploaded photos.
   */
  async function uploadAllIfAny() {
    console.log('[PhotoUploadModal] uploadAllIfAny: starting', files);
    setBusy(true);
    const metas = [];

    // IMPORTANT: use the current snapshot of `files` here.
    const snapshot = [...files];

    for (let i = 0; i < snapshot.length; i++) {
      const f = snapshot[i];
      if (f.status === 'idle') {
        // eslint-disable-next-line no-await-in-loop
        const meta = await uploadOne(i);
        if (meta) metas.push(meta);
      } else if (f.status === 'done' && f.meta) {
        // already uploaded before we got here
        metas.push(f.meta);
      } else {
        console.log('[PhotoUploadModal] uploadAllIfAny: skipping index', i, 'status=', f.status);
      }
    }

    setBusy(false);
    console.log('[PhotoUploadModal] uploadAllIfAny: done, metas=', metas);
    return metas;
  }

  /**
   * Attach photos to the invoice, based on explicit metas
   * (preferred) or, if none passed, from current state.
   */
  async function attachIfAny(explicitMetas = null) {
    if (!invoiceId) {
      console.log('[PhotoUploadModal] attachIfAny: no invoiceId, skipping');
      return;
    }

    let photos = [];
    if (Array.isArray(explicitMetas) && explicitMetas.length > 0) {
      photos = explicitMetas;
    } else {
      // fallback to current state (should rarely be needed now)
      const done = files.filter(f => f.status === 'done' && f.meta);
      photos = done.map(f => f.meta);
    }

    console.log('[PhotoUploadModal] attachIfAny: photos to attach', photos);

    if (photos.length === 0) {
      setDebugMsg('No completed photos to attach');
      return;
    }

    try {
      const body = { photos };
      console.log('[PhotoUploadModal] attachIfAny: POST body', body);

      const resp = await fetch(`/api/invoices/${invoiceId}/photos`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
        credentials: 'include',
      });

      console.log('[PhotoUploadModal] attachIfAny: response status', resp.status);
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        console.log('[PhotoUploadModal] attachIfAny non-OK body', txt);
      }

      setDebugMsg(`Attached ${photos.length} photo(s) to invoice #${invoiceId}`);
    } catch (e) {
      console.warn('[PhotoUploadModal] attachIfAny error (non-blocking)', e);
      setDebugMsg('Attach failed (see console)');
    }
  }

  const checklistPayload = useMemo(() => {
    if (!checklists.length) return null;
    return checklists.map((cl) => ({
      checklist_template_id: cl.checklistTemplateId,
      items: (cl.items || []).map((it) => ({
        template_item_id: it.templateItemId,
        checked: Boolean(it.checked),
        note: it.note || '',
      })),
    }));
  }, [checklists]);

  const allRequiredChecked = useMemo(() => {
    if (!checklists.length) return true;
    return checklists.every((cl) => {
      if (!cl.isRequiredForService) return true;
      const requiredItems = (cl.items || []).filter((i) => i.required);
      if (!requiredItems.length) return true;
      return requiredItems.every((i) => i.checked === true);
    });
  }, [checklists]);

  const completionBlocked = checklists.length > 0 && !allRequiredChecked;

  async function handleDoneAndComplete() {
    console.log('[PhotoUploadModal] handleDoneAndComplete: start');
    try {
      const metas = await uploadAllIfAny();
      await attachIfAny(metas);
      await onComplete?.({ checklists: checklistPayload });
    } finally {
      console.log('[PhotoUploadModal] handleDoneAndComplete: calling onClose/onComplete');
      onClose?.();
      setBusy(false);
    }
  }

  async function handleSkipAndComplete() {
    console.log('[PhotoUploadModal] handleSkipAndComplete: skipping uploads, completing');
    try {
      await onComplete?.({ checklists: checklistPayload });
    } finally {
      onClose?.();
    }
  }

  function handleCancel() {
    console.log('[PhotoUploadModal] handleCancel: closing without completing');
    // Optional: clear state so next open is fresh
    setFiles([]);
    setDebugMsg('');
    setInvoiceId(null);
    setChecklists([]);
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
                Add job photos (optional)
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Upload up to {maxPhotos} photos as proof of completion.
              </p>
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
                <span className="font-semibold">Debug:</span> {debugMsg}
              </div>
            )}

            {checklistLoading && (
              <div className="text-sm text-neutral-600">Loading checklists…</div>
            )}
            {checklistError && (
              <div className="text-sm text-red-600">{checklistError}</div>
            )}

            {checklists.length > 0 && (
              <div className="space-y-2">
                {checklists.map((cl, idx) => (
                  <div key={cl.checklistTemplateId || idx} className="border rounded-xl p-3 bg-neutral-50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-neutral-800">
                          Checklist: {cl.name}
                        </div>
                        {cl.description && (
                          <div className="text-xs text-neutral-600">{cl.description}</div>
                        )}
                        {cl.isRequiredForService ? (
                          <div className="text-xs text-amber-700 mt-1">
                            All required items must be checked before completing.
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-600 mt-1">Optional checklist</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {(cl.items || []).map((item, itemIdx) => (
                        <div key={item.templateItemId || itemIdx} className="flex flex-col gap-1 border rounded-lg bg-white px-3 py-2">
                          <label className="flex items-center gap-2 text-sm text-neutral-800">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(e) =>
                                setChecklists((prev) => {
                                  const next = [...prev];
                                  if (!next[idx]) return prev;
                                  const items = [...(next[idx].items || [])];
                                  if (items[itemIdx]) items[itemIdx] = { ...items[itemIdx], checked: e.target.checked };
                                  next[idx] = { ...next[idx], items };
                                  return next;
                                })
                              }
                            />
                            <span className="flex-1">{item.label}</span>
                            {item.required && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Required
                              </span>
                            )}
                          </label>
                          <textarea
                            className="w-full border rounded-lg px-2 py-1 text-xs"
                            rows={2}
                            value={item.note || ''}
                            placeholder="Add note (optional)"
                            onChange={(e) =>
                              setChecklists((prev) => {
                                const next = [...prev];
                                if (!next[idx]) return prev;
                                const items = [...(next[idx].items || [])];
                                if (items[itemIdx]) items[itemIdx] = { ...items[itemIdx], note: e.target.value };
                                next[idx] = { ...next[idx], items };
                                return next;
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div className="border-2 border-dashed rounded-xl px-3 py-4 sm:px-4 sm:py-5 text-center">
              <input
                id="filepick"
                type="file"
                accept="image/*"
                multiple
                onChange={onPick}
                className="hidden"
              />
              <label
                htmlFor="filepick"
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
                          {f.status === 'error' && 'Upload failed (you can still finish)'}
                        </div>
                      </div>
                      {f.status === 'idle' && (
                        <button
                          onClick={() => uploadOne(i)}
                          className="text-[11px] sm:text-xs underline whitespace-nowrap"
                          type="button"
                        >
                          Upload now
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Hint for completion */}
            <div className="text-[11px] sm:text-xs text-gray-500">
              You can skip photo upload and still mark the job as complete.
              {checklists.length > 0 && (
                <span className="text-amber-700 ml-1">
                  All required checklist items must be checked first.
                </span>
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
              onClick={handleSkipAndComplete}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
              disabled={busy || completionBlocked}
              type="button"
            >
              Skip & Complete
            </button>
            <button
              onClick={handleDoneAndComplete}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-black text-white text-sm font-medium rounded-xl disabled:opacity-70"
              disabled={busy || completionBlocked}
              type="button"
            >
              {busy ? 'Finishing…' : 'Done & Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
