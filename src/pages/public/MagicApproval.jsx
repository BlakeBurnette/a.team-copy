import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { latLngToCell } from 'h3-js';
import { assertPasskey, getAuthenticationOptions } from '../../api/webauthn';

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};
const fmtMoney = (cents, currency = 'USD') =>
  typeof cents === 'number'
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
    : '';

export default function MagicApproval() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approval, setApproval] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchApproval = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/portal/approvals/magic/${encodeURIComponent(token)}`);
      setApproval(data?.approval || data || null);
      if (!data) setError('Link expired or invalid.');
    } catch (e) {
      setError(e?.response?.data?.error || 'Link expired or invalid.');
      setApproval(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApproval(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const collectGeo = () =>
    new Promise((resolve) => {
      if (!navigator?.geolocation) return resolve(null);
      let done = false;
      const timer = setTimeout(() => { if (!done) resolve(null); done = true; }, 2500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          try {
            const { latitude, longitude, accuracy } = pos.coords || {};
            if (latitude == null || longitude == null) return resolve(null);
            const h3 = latLngToCell(latitude, longitude, 9);
            resolve({ h3, accuracy_m: accuracy, source: 'browser_geolocation' });
          } catch {
            resolve(null);
          }
        },
        () => { if (!done) { done = true; clearTimeout(timer); resolve(null); } },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 2500 }
      );
    });

  const attemptPasskey = async () => {
    try {
      if (!window.PublicKeyCredential) return false;
      if (!approval?.webauthn_enabled && !approval?.webauthnEnabled) return false;
      const options = await getAuthenticationOptions();
      await assertPasskey(options);
      return true;
    } catch {
      return false;
    }
  };

  const respond = async (action) => {
    if (!approval?.id) return;
    setActionLoading(true);
    setActionError('');
    setSuccess('');
    try {
      const geo = await collectGeo();
      const usedPasskey = await attemptPasskey();
      await axios.post(
        `/api/portal/approvals/magic/${encodeURIComponent(token)}/respond`,
        {
          action,
          geo,
          auth_method: usedPasskey ? 'passkey' : 'magic_link',
        }
      );
      setSuccess(action === 'approve' ? 'Approved. You can manage offer texts in settings.' : 'Declined.');
      await fetchApproval();
    } catch (e) {
      setActionError(e?.response?.data?.error || 'Failed to process approval');
    } finally {
      setActionLoading(false);
    }
  };

  const payload = approval?.metadata || approval?.payload || {};
  const subjectType = String(approval?.subject_type || approval?.subjectType || payload.subject_type || '').toLowerCase();
  const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.sample) ? payload.sample : [];
  const serviceName = payload.service_name || payload.service?.name || approval?.service_name;
  const offerName = payload.offer_name || payload.offerName || payload.name;
  const offerDesc = payload.description || approval?.description;
  const amountCents =
    approval?.amount_cents ??
    payload.price_cents ??
    payload.total_cents ??
    payload.amount_cents ??
    (items.length
      ? items.reduce((sum, it) => {
          const qty = Number(it.qty || it.quantity || 1);
          const unit = it.unit_price_cents ?? it.unitPriceCents ?? it.price_cents ?? 0;
          if (!Number.isFinite(qty) || !Number.isFinite(unit)) return sum;
          return sum + qty * unit;
        }, 0)
      : null);

  const title = useMemo(() => {
    if (subjectType === 'quote') return 'Confirm your price';
    if (subjectType === 'campaign_add_on_offer') return 'Seasonal add-on offer';
    if (subjectType === 'change_order') return 'Change order for today’s service';
    return 'Approval request';
  }, [subjectType]);

  const summary = useMemo(() => {
    if (subjectType === 'quote') return serviceName || approval?.summary || 'Review your quote';
    if (subjectType === 'campaign_add_on_offer') return [offerName, offerDesc].filter(Boolean).join(' • ') || 'Seasonal add-on offer';
    if (subjectType === 'change_order') return approval?.summary || 'Change order';
    return approval?.summary || approval?.description || '';
  }, [subjectType, serviceName, approval, offerDesc, offerName]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="text-xs uppercase text-neutral-500">Magic approval</div>
      <h1 className="text-2xl font-bold">Secure approval link</h1>
      {loading ? (
        <div className="text-neutral-700">Loading…</div>
      ) : error ? (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
      ) : !approval ? (
        <div className="text-neutral-700">Link expired.</div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-neutral-900">{title}</div>
            <div className="text-sm text-neutral-800">{summary}</div>
            <div className="text-xs text-neutral-600">
              Created {fmtDateTime(approval.created_at || approval.inserted_at)}
            </div>
          </div>
          {subjectType === 'campaign_add_on_offer' ? (
            <div className="text-xs text-neutral-600">Reply STOP to opt out of offer texts.</div>
          ) : null}
          {items.length ? (
            <div className="border rounded-lg bg-neutral-50 p-2 text-sm text-neutral-800 space-y-1">
              {items.map((it, idx) => {
                const qty = Number(it.qty || it.quantity || 1);
                const unit = it.unit_price_cents ?? it.unitPriceCents ?? it.price_cents ?? 0;
                const lineTotal = Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : null;
                return (
                  <div key={it.id || idx} className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{it.name || 'Item'}</div>
                      {it.description ? <div className="text-xs text-neutral-600">{it.description}</div> : null}
                      <div className="text-xs text-neutral-600">Qty {qty} @ {fmtMoney(unit) || '—'}</div>
                    </div>
                    <div className="text-sm font-semibold">{lineTotal != null ? fmtMoney(lineTotal) : '—'}</div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t pt-2 mt-1 font-semibold">
                <span>Total</span>
                <span>{fmtMoney(amountCents) || '—'}</span>
              </div>
            </div>
          ) : null}
          {approval.note ? <div className="text-xs text-neutral-700">Note: {approval.note}</div> : null}
          <div className="text-xs text-neutral-600">
            No charge unless you approve. {subjectType === 'change_order' || subjectType === 'campaign_add_on_offer' ? 'Charged when service completes.' : null}
          </div>
          {actionError ? <div className="text-sm text-red-600">{actionError}</div> : null}
          {success ? <div className="text-sm text-emerald-700">{success}</div> : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => respond('decline')}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm hover:bg-rose-100 disabled:opacity-60"
              disabled={actionLoading}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => respond('approve')}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
              disabled={actionLoading}
            >
              Approve
            </button>
            <div className="text-[11px] text-neutral-500">
              We may record device/IP and approximate location for fraud prevention.
            </div>
          </div>
          <div className="text-xs text-neutral-600">
            You can manage offer texts in settings. Need the app?{' '}
            <button className="text-emerald-700 underline" onClick={() => navigate('/app/user/approvals')}>
              Open portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
