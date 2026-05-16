// src/pages/ServiceRecordDetail.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import Toast from '../components/Toast';
import SendProofModal from '../components/SendProofModal';
import { useUserProfile, useAuth } from '../context/AuthContext.jsx';
import ServiceRecordTimeline from '../components/ServiceRecordTimeline';
import Modal from '../components/Modal';
import { proposeAddOn } from '../api/addOns';
import ChangeOrderModal from '../components/ChangeOrderModal';

const fmtMoney = (cents, currency = 'USD') => {
  if (typeof cents !== 'number') return '';
  const n = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

const fmtDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleString();
};

const badgeForStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (['paid', 'succeeded', 'success', 'completed_paid'].includes(s))
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
        Paid
      </span>
    );
  if (['pending', 'pending_capture', 'requires_action', 'requires_payment_method', 'processing', 'queued'].includes(s))
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        Payment pending
      </span>
    );
  if (s === 'failed')
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        Payment failed
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
      Not collected
    </span>
  );
};

export default function ServiceRecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { hasRole, profile } = useUserProfile() || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [record, setRecord] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });
  const [versions, setVersions] = useState([]);
  const [versionsError, setVersionsError] = useState('');
  const [sendProofOpen, setSendProofOpen] = useState(false);
  const [addOnOpen, setAddOnOpen] = useState(false);
  const [addOnDesc, setAddOnDesc] = useState('');
  const [addOnAmount, setAddOnAmount] = useState('');
  const [addOnLoading, setAddOnLoading] = useState(false);
  const [addOnError, setAddOnError] = useState('');
  const [changeOrderOpen, setChangeOrderOpen] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });

  const role = (profile?.role || '').toLowerCase();
  const isStaff = useMemo(() => {
    if (typeof hasRole === 'function') {
      return ['admin', 'owner', 'manager', 'staff', 'crew_leader', 'crew_member'].some((r) => hasRole(r));
    }
    return ['admin', 'owner', 'manager', 'staff', 'crew_leader', 'crew_member', 'crew'].includes(role);
  }, [hasRole, role]);
  const canProposeAddOn = useMemo(() => {
    if (typeof hasRole === 'function') return hasRole('owner') || hasRole('crew_leader') || hasRole('admin');
    return ['owner', 'crew_leader', 'admin'].includes(role);
  }, [hasRole, role]);
  const canCreateChangeOrder = isStaff;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`/api/service-records/${id}`, {
          withCredentials: true,
        });
        if (alive) setRecord(data || null);
      } catch (e) {
        if (alive) {
          setError(e?.response?.data?.error || e?.message || 'Failed to load service record');
          setRecord(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // Fetch hash history (versions)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setVersionsError('');
      try {
        const { data } = await axios.get(`/api/trust/service-records/${id}/versions`, {
          withCredentials: true,
        });
        if (!alive) return;
        const list = Array.isArray(data?.versions) ? data.versions : Array.isArray(data) ? data : [];
        // Normalize to consistent shape
        const normalized = list.map((v) => ({
          version: v.version_no ?? v.version ?? null,
          hash: v.hash_hex || v.trust_hash_hex || v.service_record_hash_hex || null,
          created_at: v.created_at || v.inserted_at || null,
        }));
        setVersions(normalized);
      } catch (e) {
        if (alive) setVersionsError('Failed to load hash history');
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sr = record?.service_record || record || {};
  const paymentSummary = sr.paymentSummary || sr.payment_summary || {};
  const paymentAttempts = Array.isArray(sr.paymentAttempts)
    ? sr.paymentAttempts
    : Array.isArray(sr.payment_attempts)
    ? sr.payment_attempts
    : [];
  const media = Array.isArray(sr.media) ? sr.media : [];
  const amountCents =
    sr.amount_cents != null
      ? sr.amount_cents
      : paymentSummary.total_amount_cents != null
      ? paymentSummary.total_amount_cents
      : 0;
  const paidCents = paymentSummary.total_paid_cents != null ? paymentSummary.total_paid_cents : 0;
  const outstandingCents =
    paymentSummary.outstanding_cents != null ? paymentSummary.outstanding_cents : amountCents - paidCents;
  const currency = sr.currency || paymentSummary.currency || 'USD';
  const mediaWithToken = useMemo(() => {
    const arr = Array.isArray(sr.media) ? sr.media : [];
    return arr.map((m) => {
      const basePublic = m.public_url || m.url || null;
      const storageKey = m.storage_key || m.key || null;
      if (basePublic) {
        return { ...m, src: basePublic };
      }
      if (storageKey) {
        const src = `/api/storage/view/${encodeURIComponent(storageKey)}`;
        return { ...m, src };
      }
      return { ...m, src: null };
    });
  }, [sr.media]);

  const latestHashMeta = useMemo(() => {
    const list = Array.isArray(sr?.service_record_hashes) ? sr.service_record_hashes : [];
    // Prefer versions from trust history if present
    const all = versions.length ? versions : list;
    let latest = null;
    if (Array.isArray(all) && all.length) {
      latest = all.reduce((acc, cur) => {
        if (!acc) return cur;
        const av = Number(acc.version_no || acc.version || 0);
        const cv = Number(cur.version_no || cur.version || 0);
        return cv > av ? cur : acc;
      }, null);
    }
    const hash =
      sr?.trust_hash_hex ||
      sr?.service_record_hash_hex ||
      sr?.hash_hex ||
      latest?.hash ||
      latest?.hash_hex ||
      null;
    const version =
      sr?.trust_hash_version ||
      sr?.service_record_hash_version ||
      latest?.version ||
      latest?.version_no ||
      null;
    return { hash, version };
  }, [
    sr?.trust_hash_hex,
    sr?.service_record_hash_hex,
    sr?.hash_hex,
    sr?.trust_hash_version,
    sr?.service_record_hash_version,
    sr?.service_record_hashes,
    versions,
  ]);

  const shortHash = useMemo(() => {
    if (!latestHashMeta.hash) return null;
    const base = `${String(latestHashMeta.hash).slice(0, 10)}…`;
    return latestHashMeta.version != null ? `${base} (v${latestHashMeta.version})` : base;
  }, [latestHashMeta]);

  const customerContact = useMemo(
    () => ({
      name: sr.customer?.name || '',
      email: sr.customer?.email || '',
      phone: sr.customer?.phone_number || sr.customer?.phone || '',
    }),
    [sr.customer?.email, sr.customer?.name, sr.customer?.phone, sr.customer?.phone_number]
  );

  const copyHash = async () => {
    if (!latestHashMeta.hash) return;
    try {
      await navigator.clipboard.writeText(latestHashMeta.hash);
      showToast('Hash copied to clipboard');
    } catch {
      showToast('Failed to copy');
    }
  };

  const issueInvoice = async () => {
    try {
      const { data } = await axios.post(
        `/api/service-records/${id}/invoices`,
        {},
        { withCredentials: true }
      );
      if (data?.invoice) {
        setRecord((prev) => ({ ...(prev || {}), invoice: data.invoice }));
        showToast('Invoice issued');
      }
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to issue invoice', 3200);
    }
  };

  const onProposeAddOn = async () => {
    if (!record?.invoice?.id && !record?.invoice_id) {
      showToast('No invoice found for this service record', 2600);
      return;
    }
    const cents = Math.round(parseFloat(addOnAmount || '0') * 100);
    if (!addOnDesc.trim() || !Number.isFinite(cents) || cents <= 0) {
      setAddOnError('Description and amount are required');
      return;
    }
    setAddOnLoading(true);
    setAddOnError('');
    try {
      const payload = {
        invoiceId: record?.invoice?.id || record?.invoice_id,
        serviceRecordId: sr.id || id,
        customerId: sr?.customer?.id,
        description: addOnDesc.trim(),
        amountCents: cents,
        currency: sr.currency || paymentSummary.currency || 'USD',
      };
      await proposeAddOn(payload);
      showToast('Sent add-on to customer for approval', 2400);
      setAddOnOpen(false);
      setAddOnDesc('');
      setAddOnAmount('');
    } catch (e) {
      setAddOnError(e?.response?.data?.error || e?.message || 'Failed to propose add-on');
    } finally {
      setAddOnLoading(false);
    }
  };

  const onChangeOrderCreated = () => {
    showToast('Sent to customer for approval', 2400);
    setTimelineKey((k) => k + 1);
  };

  const srStatus = sr.status || sr.state || sr.service_status || sr.payment_status;

  return (
    <>
      <div className="space-y-6">
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
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4 md:p-6">
        {loading ? (
          <div className="text-neutral-600">Loading service record…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : !record ? (
          <div className="text-neutral-600">Service record not found.</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="space-y-1">
                <div className="text-xs uppercase text-neutral-500">Service Record #{sr.id}</div>
                <div className="text-xl font-semibold">{sr.service?.name || 'Service'}</div>
                <div className="text-sm text-neutral-600">
                  {sr.customer?.name || 'Customer'} • {sr.property?.normalized_address || 'Property'} •{' '}
                  {fmtDateTime(sr.performed_at)}
                </div>
                {sr.property?.id && (
                  <button
                    type="button"
                    onClick={() => navigate(`/app/properties/${sr.property.id}/history`)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white hover:bg-neutral-50"
                    title="View property history"
                  >
                    Property history
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {badgeForStatus(paymentSummary.status || sr.payment_status)}
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Amount</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(amountCents, currency) || '$0.00'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSendProofOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Send proof
                </button>
              </div>
            </div>

            {/* Proof hash */}
            <div className="flex items-center gap-2 text-sm text-neutral-700 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-600" title="Trust anchored" />
              <span className="text-neutral-500">Proof hash:</span>
              {shortHash ? (
                <>
                  <span className="font-mono text-xs">{shortHash}</span>
                  {latestHashMeta.version != null && (
                    <span className="text-xs text-neutral-500">v{latestHashMeta.version}</span>
                  )}
                  <button
                    type="button"
                    onClick={copyHash}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-white hover:bg-neutral-50 text-xs"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </>
              ) : (
                <span className="text-neutral-500">Proof will appear as soon as it is recorded.</span>
              )}
            </div>

            {/* Hash history */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">Proof history</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Revision
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Proof (fingerprint)
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {versionsError ? (
                      <tr>
                        <td className="px-3 py-2 text-sm text-red-600" colSpan={3}>{versionsError}</td>
                      </tr>
                    ) : (versions.length === 0 && latestHashMeta.hash) ? (
                      <tr>
                        <td className="px-3 py-2 text-sm text-neutral-700">v{latestHashMeta.version ?? 1}</td>
                        <td className="px-3 py-2 text-sm font-mono text-neutral-700">
                          {`${String(latestHashMeta.hash).slice(0, 16)}…`}
                        </td>
                        <td className="px-3 py-2 text-sm text-neutral-700">Recorded</td>
                      </tr>
                    ) : versions.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2 text-sm text-neutral-600" colSpan={3}>Proof will appear after it is recorded.</td>
                      </tr>
                    ) : (
                      versions.map((v, idx) => {
                        const hashShort = v.hash ? `${String(v.hash).slice(0, 16)}…` : '—';
                        return (
                          <tr key={`${v.version || idx}-${v.hash || idx}`}>
                            <td className="px-3 py-2 text-sm text-neutral-700">{v.version != null ? `v${v.version}` : '—'}</td>
                            <td className="px-3 py-2 text-sm font-mono text-neutral-700">{hashShort}</td>
                            <td className="px-3 py-2 text-sm text-neutral-700">{fmtDateTime(v.created_at) || 'Recorded'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-6">
              <ServiceRecordTimeline
                key={timelineKey}
                serviceRecordId={sr.id || id}
                fetchHeaders={() => ({})}
                status={srStatus}
              />
            </div>

            {/* Media */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">Proof of service</h3>
                {mediaWithToken.length === 0 ? (
                  <div className="text-sm text-neutral-500">No media attached.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaWithToken.map((m) => (
                    <div key={m.id} className="border rounded-lg overflow-hidden bg-neutral-50">
                      <div className="aspect-[4/3] bg-neutral-100">
                        <img
                          src={m.src || m.url || m.public_url}
                          alt={`Media ${m.id}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2 text-xs text-neutral-600 space-y-1">
                        <div>{fmtDateTime(m.created_at)}</div>
                        <div className="font-mono text-[11px] text-neutral-700">
                          {m.hash_hex ? `${String(m.hash_hex).slice(0, 10)}…` : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">Payments</h3>
              <div className="border rounded-lg p-3 space-y-1 bg-neutral-50">
                <div className="text-sm text-neutral-700">
                  Status: {paymentSummary.status || sr.payment_status || 'unknown'}
                </div>
                <div className="text-sm text-neutral-700">
                  Total: {fmtMoney(amountCents, currency) || '$0.00'}
                </div>
                <div className="text-sm text-neutral-700">
                  Paid: {fmtMoney(paidCents, currency) || '$0.00'}
                </div>
                <div className="text-sm text-neutral-700">
                  Outstanding: {fmtMoney(outstandingCents, currency) || '$0.00'}
                </div>
                {paymentSummary.last_attempt_at && (
                  <div className="text-sm text-neutral-700">
                    Last attempt: {fmtDateTime(paymentSummary.last_attempt_at)} ({paymentSummary.last_outcome || '—'})
                  </div>
                )}
              </div>

              <div className="mt-3">
                <div className="text-xs uppercase text-neutral-500 mb-1">Payment attempts</div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                          Outcome
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                          Reference
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paymentAttempts.length === 0 ? (
                        <tr>
                          <td className="px-3 py-2 text-sm text-neutral-600" colSpan={4}>
                            No payment attempts yet.
                          </td>
                        </tr>
                      ) : (
                        paymentAttempts.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 text-sm text-neutral-700">{fmtDateTime(p.created_at)}</td>
                            <td className="px-3 py-2 text-sm text-neutral-700">{p.method || '—'}</td>
                            <td className="px-3 py-2 text-sm text-neutral-700">{p.outcome || p.status || '—'}</td>
                            <td className="px-3 py-2 text-sm text-neutral-700">
                              {p.stripe_payment_intent_id || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Invoice fallback */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">Invoice</h3>
              {record.invoice ? (
                <>
                  <div className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-neutral-700 space-y-1">
                      <div>Invoice #{record.invoice.invoice_number || record.invoice.id}</div>
                      <div>Status: {record.invoice.status || '—'}</div>
                      <div>Amount: {fmtMoney(record.invoice.amount_cents, record.currency || 'USD') || '$0.00'}</div>
                    </div>
                    {record.invoice.url && (
                      <a
                        href={record.invoice.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" /> View invoice
                      </a>
                    )}
                  </div>
                  {canProposeAddOn ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => { setAddOnError(''); setAddOnOpen(true); }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                      >
                        Propose add-on
                      </button>
                    </div>
                  ) : null}
                  {canCreateChangeOrder ? (
                    <div className="mt-2 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setChangeOrderOpen(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                      >
                        Create Change Order
                      </button>
                      <div className="text-xs text-neutral-600">
                        Customer must approve before this is charged. Charged when service completes.
                      </div>
                    </div>
                  ) : null}
                </>
              ) : paymentSummary.status !== 'paid' ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={issueInvoice}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                  >
                    Issue invoice
                  </button>
                  {canCreateChangeOrder ? (
                    <button
                      type="button"
                      onClick={() => setChangeOrderOpen(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                    >
                      Create Change Order
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-neutral-500">No invoice issued.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>

      <SendProofModal
        isOpen={sendProofOpen}
        onClose={() => setSendProofOpen(false)}
        serviceRecordId={sr.id || id}
        headers={{ withCredentials: true }}
        customerContact={customerContact}
      />

      <Modal open={addOnOpen} onClose={() => setAddOnOpen(false)}>
        <div className="space-y-4">
          <div className="text-lg font-semibold">Propose add-on</div>
          <div className="space-y-1">
            <label className="text-sm text-neutral-700">Description</label>
            <input
              type="text"
              value={addOnDesc}
              onChange={(e) => setAddOnDesc(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., Extra deep clean"
              disabled={addOnLoading}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-neutral-700">Amount (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={addOnAmount}
              onChange={(e) => setAddOnAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="25.00"
              disabled={addOnLoading}
            />
          </div>
          {addOnError ? <div className="text-sm text-red-600">{addOnError}</div> : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddOnOpen(false)}
              className="px-3 py-2 rounded border text-sm"
              disabled={addOnLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onProposeAddOn}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
              disabled={addOnLoading}
            >
              {addOnLoading ? <span className="animate-spin h-4 w-4 border border-white border-t-transparent rounded-full" /> : null}
              {addOnLoading ? 'Sending…' : 'Send for approval'}
            </button>
          </div>
        </div>
      </Modal>

      <ChangeOrderModal
        open={changeOrderOpen}
        onClose={() => setChangeOrderOpen(false)}
        serviceRecordId={sr.id || id}
        headers={{ withCredentials: true }}
        onCreated={() => {
          setChangeOrderOpen(false);
          onChangeOrderCreated();
        }}
      />
    </>
  );
}
