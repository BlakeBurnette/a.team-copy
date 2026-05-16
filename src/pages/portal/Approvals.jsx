// src/pages/portal/Approvals.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { latLngToCell } from 'h3-js';
import axios from 'axios';
import Toast from '../../components/Toast';
import ApprovalModal from '../../components/ApprovalModal';
import { respondToPortalApproval, fetchPortalApprovals } from '../../api/approvals';
import { useUserProfile } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext.jsx';

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

const subjectLabel = (t) => {
  const key = String(t || '').toLowerCase();
  if (key.includes('addon') || key.includes('add-on')) return 'Add-on';
  if (key.includes('schedule')) return 'Schedule change';
  if (key.includes('change_order')) return 'Change Order';
  return 'Approval';
};

const fmtMoney = (cents, currency = 'USD') => {
  if (typeof cents !== 'number') return '';
  const n = cents / 100;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `$${n.toFixed(2)}`; }
};

const summarizeInputs = (inputs) => {
  if (!inputs) return '';
  if (typeof inputs === 'string') return inputs;
  if (Array.isArray(inputs)) {
    return inputs
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return null;
        const label = item.label || item.name || item.key;
        const val = item.value ?? item.val ?? item.amount ?? '';
        return [label, val].filter(Boolean).join(': ');
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof inputs === 'object') {
    return Object.entries(inputs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  return '';
};

export default function Approvals() {
  const navigate = useNavigate();
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2200 });

  const [active, setActive] = useState(null);
  const [mode, setMode] = useState('approve');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeMeta, setActiveMeta] = useState({});
  const [declineReason, setDeclineReason] = useState('');
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);

  const showToast = (msg, duration = 2200) => setToast({ show: true, msg, duration });

  const authHeader = useCallback(async () => ({}), []);

  const shouldAttemptPasskey = useCallback(() => {
    if (mode !== 'approve') return false;
    const hasFlag =
      passkeyEnabled ||
      active?.webauthn_enabled ||
      active?.webauthnEnabled ||
      active?.has_passkey ||
      active?.hasPasskey;
    return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!hasFlag;
  }, [mode, passkeyEnabled, active]);

  const b64ToBuf = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const bufToB64 = (buf) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

  const prepRequestOptions = (opts) => {
    if (!opts || !opts.publicKey) return opts;
    const pk = { ...opts.publicKey };
    pk.challenge = b64ToBuf(pk.challenge);
    if (pk.allowCredentials) {
      pk.allowCredentials = pk.allowCredentials.map((c) => ({
        ...c,
        id: b64ToBuf(c.id),
      }));
    }
    return { publicKey: pk };
  };

  const performPasskey = useCallback(
    async (approvalId, action, headers) => {
      if (!shouldAttemptPasskey()) return false;
      try {
        const { data: options } = await axios.post(
          '/api/portal/webauthn/options',
          { approval_id: approvalId, action },
          { headers, withCredentials: true }
        );
        const credential = await navigator.credentials.get(prepRequestOptions(options));
        if (!credential) return false;
        const assertion = {
          id: credential.id,
          rawId: bufToB64(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufToB64(credential.response.clientDataJSON),
            authenticatorData: bufToB64(credential.response.authenticatorData),
            signature: bufToB64(credential.response.signature),
            userHandle: credential.response.userHandle
              ? bufToB64(credential.response.userHandle)
              : undefined,
          },
        };
        await axios.post(
          '/api/portal/webauthn/verify',
          { approval_id: approvalId, action, credential: assertion },
          { headers, withCredentials: true }
        );
        return true;
      } catch (e) {
        console.error('[Approvals] passkey failed', e?.response?.data || e);
        return false;
      }
    },
    [shouldAttemptPasskey]
  );

  const collectGeo = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator?.geolocation) return resolve(null);
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(null);
      }, 2500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try {
            const { latitude, longitude, accuracy } = pos.coords || {};
            if (latitude == null || longitude == null) return resolve(null);
            const h3 = latLngToCell(latitude, longitude, 9);
            resolve({
              h3,
              accuracy_m: accuracy,
              source: 'browser_geolocation',
            });
          } catch {
            resolve(null);
          }
        },
        () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 2500 }
      );
    });
  }, []);

  const mergeHeaders = useCallback(async () => {
    const hdr = await authHeader();
    return { ...hdr };
  }, [authHeader]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await mergeHeaders();
      const data = await fetchPortalApprovals({ status: 'pending' });
      const list = Array.isArray(data?.approvals) ? data.approvals : Array.isArray(data) ? data : [];
      setItems(list);
      const flag =
        data?.webauthn_enabled ||
        data?.webauthnEnabled ||
        profile?.webauthn_enabled ||
        profile?.webauthnEnabled ||
        profile?.has_passkey ||
        profile?.hasPasskey;
      setPasskeyEnabled(!!flag);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load approvals');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mergeHeaders, profile]);

  useEffect(() => { load(); }, [load]);

  const openModal = (approval, nextMode, meta = {}) => {
    setActive(approval);
    setMode(nextMode);
    setActionError('');
    setActiveMeta(meta || {});
    if (nextMode === 'decline') setDeclineReason('');
  };

  const closeModal = () => {
    setActive(null);
    setActionLoading(false);
    setActionError('');
    setActiveMeta({});
    setDeclineReason('');
  };

  const handleConfirm = async () => {
    if (!active?.id) return;
    setActionLoading(true);
    setActionError('');
    try {
      const headers = await mergeHeaders();
      const subjectType = String(active?.subject_type || active?.subjectType || '').toLowerCase();
      const action = mode === 'approve' ? 'approve' : 'decline';
      const geo = await collectGeo();
      let usedPasskey = false;
      if (action === 'approve') {
        usedPasskey = await performPasskey(active.id, action, headers);
      }
      const reason = action === 'decline' ? (declineReason?.trim() || undefined) : undefined;

      await respondToPortalApproval({
        id: active.id,
        action,
        body: {
          geo,
          reason,
          auth_method: usedPasskey ? 'passkey' : 'session',
        },
      });

      if (action === 'approve') {
        if (subjectType === 'quote') {
          showToast('Price confirmed — we’ll schedule your service');
        } else if (subjectType === 'schedule_change') {
          showToast('Approved. Your schedule has been updated.');
        } else if (subjectType === 'add_on' || subjectType === 'add-on') {
          showToast('Approved. The add-on will appear on your payment receipt.');
        } else if (subjectType === 'change_order') {
          showToast('Change order approved. Charged when service completes.');
        } else {
          showToast('Approved');
        }
      } else {
        if (subjectType === 'change_order') showToast('Change order declined');
        else showToast('Declined');
      }
      closeModal();
      load();
    } catch (e) {
      setActionError(e?.response?.data?.error || e?.message || 'Unable to process request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-sm text-neutral-500">Approvals are secured. No passcodes required.</div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase text-neutral-500">Inbox</div>
            <div className="text-xl font-semibold">Approvals</div>
          </div>
          <button
            type="button"
            onClick={load}
            className="text-sm text-neutral-600 hover:text-neutral-800 underline"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-neutral-600">Loading approvals…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-neutral-600">No pending approvals.</div>
        ) : (
          <div className="space-y-3">
            {items.map((ap) => {
              const subjectType = String(ap.subject_type || ap.subjectType || '').toLowerCase();
              const payload = ap.payload || ap.metadata || {};
              const inputs = payload.inputs_summary || payload.inputsSummary || payload.inputs || ap.inputs_summary;
              const serviceName =
                payload.service_name ||
                payload.serviceName ||
                payload.service?.name ||
                ap.service_name ||
                ap.service?.name;
              const changeOrderItems = Array.isArray(payload.items)
                ? payload.items
                : Array.isArray(ap.items)
                  ? ap.items
                  : [];
              const quoteSummary = [serviceName, summarizeInputs(inputs)].filter(Boolean).join(' • ');
              const isCampaign = subjectType === 'campaign_add_on_offer';
              const isChangeOrder = subjectType === 'change_order';
              const outsideTrusted =
                payload.outside_trusted_area === true ||
                payload.trusted_status === 'outside' ||
                ap.outside_trusted_area === true;
              const offerName =
                payload.offer_name ||
                payload.offerName ||
                payload.name ||
                ap.offer_name ||
                ap.offerName;
              const offerDesc = payload.description || ap.description;
              const campaignSummary = [offerName, offerDesc].filter(Boolean).join(' • ');
              const summary = isCampaign
                ? campaignSummary || ap.summary || 'Seasonal add-on offer'
                : isChangeOrder
                  ? ap.summary || 'Change order for today’s service'
                : subjectType === 'quote'
                  ? quoteSummary || ap.summary || ap.description || 'Review your quote'
                  : ap.summary || ap.description || 'Approval request';
              let amountCents =
                ap.amount_cents ??
                ap.amountCents ??
                ap.amount ??
                payload.price_cents ??
                payload.total_cents ??
                payload.amount_cents ??
                null;
              const currency = ap.currency || 'USD';
              const isSchedule = subjectType === 'schedule_change';
              const isAddon = subjectType === 'add_on' || subjectType === 'add-on';
              const isQuote = subjectType === 'quote';
              const title = isCampaign
                ? 'Seasonal add-on offer'
                : isChangeOrder
                  ? 'Change order for today’s service'
                : isQuote
                  ? 'Confirm your price'
                  : isSchedule
                    ? 'Approve schedule change'
                    : isAddon
                      ? 'Approve add-on'
                      : 'Approve request';
              if (isChangeOrder && amountCents == null && changeOrderItems.length) {
                amountCents = changeOrderItems.reduce((sum, item) => {
                  const qty = Number(item.qty || item.quantity || 1);
                  const unit = item.unit_price_cents ?? item.unitPriceCents ?? item.price_cents ?? item.amount_cents ?? 0;
                  if (!Number.isFinite(qty) || !Number.isFinite(unit)) return sum;
                  return sum + qty * unit;
                }, 0);
              }
              const serviceRecordId =
                ap.service_record_id ||
                ap.serviceRecordId ||
                ap.metadata?.service_record_id ||
                ap.payload?.service_record_id ||
                null;
              const expiresAt = ap.expires_at || ap.expiresAt || payload.expires_at;
              const targetVisit = payload.target_visit_date || payload.targetVisitDate;
              const modalMeta = {
                title,
                summary,
                amountCents,
                showReason: isQuote,
              };
              return (
                <div key={ap.id} className="border rounded-lg p-4 bg-neutral-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-neutral-900">{title}</div>
                      <div className="text-sm text-neutral-800">{summary}</div>
                      <div className="text-xs text-neutral-600">
                        {subjectLabel(ap.subject_type || ap.subjectType)} • Created {fmtDateTime(ap.created_at || ap.inserted_at)}
                      </div>
                      {expiresAt ? (
                        <div className="text-xs text-amber-700">Expires {fmtDateTime(expiresAt)}</div>
                      ) : null}
                      {amountCents != null ? (
                        <div className="text-sm text-neutral-800">Amount: {fmtMoney(amountCents, currency)}</div>
                      ) : null}
                      {outsideTrusted ? (
                        <div className="text-xs text-amber-700">Warning: request is outside trusted area.</div>
                      ) : null}
                      {isChangeOrder && changeOrderItems.length ? (
                        <div className="border rounded-lg bg-white p-2 text-sm text-neutral-800 space-y-1">
                          {changeOrderItems.map((item, idx) => {
                            const qty = Number(item.qty || item.quantity || 1);
                            const unit = item.unit_price_cents ?? item.unitPriceCents ?? item.price_cents ?? item.amount_cents ?? 0;
                            const lineTotal = Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : null;
                            return (
                              <div key={item.id || idx} className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-medium">{item.name || 'Item'}</div>
                                  {item.description ? (
                                    <div className="text-xs text-neutral-600">{item.description}</div>
                                  ) : null}
                                  <div className="text-xs text-neutral-600">
                                    Qty {qty} @ {fmtMoney(unit, currency) || '—'}
                                  </div>
                                </div>
                                <div className="text-sm font-semibold">{lineTotal != null ? fmtMoney(lineTotal, currency) : '—'}</div>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between border-t pt-2 mt-1 font-semibold">
                            <span>Total</span>
                            <span>{fmtMoney(amountCents, currency) || '—'}</span>
                          </div>
                        </div>
                      ) : null}
                      {isChangeOrder && (payload.note || ap.note) ? (
                        <div className="text-xs text-neutral-700">Note: {payload.note || ap.note}</div>
                      ) : null}
                      {targetVisit ? (
                        <div className="text-xs text-neutral-600">Add to your next visit on {fmtDateTime(targetVisit)}</div>
                      ) : null}
                      {isCampaign ? (
                        <div className="text-xs text-neutral-600">
                          No charge unless you approve. Reply STOP to opt out of offer texts. This will be charged when service completes.
                        </div>
                      ) : null}
                      {isChangeOrder ? (
                        <div className="text-xs text-neutral-600">
                          No charge unless you approve. Charged when service completes.
                        </div>
                      ) : null}
                      {serviceRecordId ? (
                        <button
                          type="button"
                          className="text-sm text-emerald-700 underline"
                          onClick={() => navigate(`/app/user/service-records/${serviceRecordId}`)}
                        >
                          View related service
                        </button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(ap, 'decline', modalMeta)}
                        className="inline-flex items-center px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm hover:bg-rose-100"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal(ap, 'approve', modalMeta)}
                        className="inline-flex items-center px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      We may record device/IP and approximate location for fraud prevention.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ApprovalModal
        open={!!active}
        mode={mode}
        approval={active}
        onClose={closeModal}
        onConfirm={handleConfirm}
        loading={actionLoading}
        error={actionError}
        title={activeMeta?.title}
        summaryOverride={activeMeta?.summary}
        amountOverride={activeMeta?.amountCents}
        showReason={mode === 'decline' && !!activeMeta?.showReason}
        reason={declineReason}
        onReasonChange={setDeclineReason}
      />
    </div>
  );
}
