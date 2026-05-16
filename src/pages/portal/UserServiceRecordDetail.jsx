// src/pages/portal/UserServiceRecordDetail.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ShieldCheck, Copy, ExternalLink } from 'lucide-react';
import Toast from '../../components/Toast';
import { PaymentStatePill } from '../schedule/components/PaymentPills';
import ServiceRecordTimeline from '../../components/ServiceRecordTimeline';
import { fetchPaymentResolution } from '../../api/paymentResolution';
import PaymentResolutionBanner from '../../components/PaymentResolutionBanner';
import PaymentStatusPill from '../../components/PaymentStatusPill';
import { useAuth } from '../../context/AuthContext.jsx';

const fmtMoney = (cents, currency = 'USD') => {
  if (typeof cents !== 'number') return '';
  const n = cents / 100;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `$${n.toFixed(2)}`; }
};
const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');

export default function UserServiceRecordDetail() {
  const { serviceRecordId } = useParams();
  const navigate = useNavigate();
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [record, setRecord] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });

  const fetchHeaders = useCallback(async () => ({}), []);

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/portal/service-records/${serviceRecordId}`, {
        headers: {},
        withCredentials: true,
      });
      setRecord(data?.service_record || data || null);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load service record');
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); /* eslint-disable-next-line */ }, [serviceRecordId]);

  const paymentStatus = useMemo(() => (record?.payment_summary?.status || record?.payment_status || record?.payment_state), [record]);
  const [resolution, setResolution] = useState(null);

  const fetchResolution = useCallback(async () => {
    try {
      const data = await fetchPaymentResolution(serviceRecordId, { headers: {}, withCredentials: true });
      setResolution(data?.resolution || null);
    } catch (e) {
      setResolution(null);
      if (e?.type === 'invalid_or_expired') {
        showToast('Payment link expired');
      }
    }
  }, [serviceRecordId, authHeader, staticHeaders]);

  useEffect(() => { fetchResolution(); }, [fetchResolution]);
  const hash = useMemo(() => {
    if (!record) return null;
    if (record.trust_hash_hex) return record.trust_hash_hex;
    if (record.service_record_hash_hex) return record.service_record_hash_hex;
    if (record.hash_hex) return record.hash_hex;
    if (Array.isArray(record.service_record_hashes) && record.service_record_hashes.length) {
      const latest = record.service_record_hashes.reduce((acc, cur) => {
        const av = Number(acc?.version_no || acc?.version || 0);
        const cv = Number(cur?.version_no || cur?.version || 0);
        return cv > av ? cur : acc;
      }, null);
      return latest?.hash_hex || null;
    }
    return null;
  }, [record]);

  const shortHash = hash ? `${String(hash).slice(0, 10)}…` : '—';

  const copyHash = () => {
    if (!hash) return;
    try { navigator.clipboard.writeText(hash); showToast('Proof copied'); }
    catch { showToast('Failed to copy proof'); }
  };

  const summary = record?.payment_summary || {};
  const totalCents = record?.amount_cents ?? summary.total_amount_cents ?? 0;
  const paidCents = summary.total_paid_cents ?? 0;
  const outstandingCents = summary.outstanding_cents ?? Math.max(0, totalCents - paidCents);
  const currency = record?.currency || summary.currency || 'USD';
  const srStatus = record?.status || record?.state || record?.service_status || record?.payment_status;

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
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4 md:p-6">
        <PaymentResolutionBanner
          resolutionStatus={resolution?.resolution_status || resolution?.status || resolution?.state}
          resolutionCode={resolution?.resolution_code || resolution?.code}
          serviceRecordId={serviceRecordId}
        />
        {loading ? (
          <div className="text-neutral-600">Loading…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : !record ? (
          <div className="text-neutral-600">Service record not found.</div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs uppercase text-neutral-500">Service Record #{record.id}</div>
                <div className="text-xl font-semibold">{record.service?.name || 'Service'}</div>
                <div className="text-sm text-neutral-600">
                  {record.property?.normalized_address || 'Property'} • {fmtDate(record.performed_at)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <PaymentStatePill invStatus={paymentStatus} pending={false} />
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Total</div>
                  <div className="text-lg font-semibold">{fmtMoney(totalCents, currency)}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Proof:{' '}
              <span className="font-mono text-xs">{shortHash}</span>
              {hash && (
                <button
                  type="button"
                  onClick={copyHash}
                  className="text-xs text-neutral-500 underline"
                >
                  Copy
                </button>
              )}
            </div>

            <div className="mt-4 border rounded-lg p-3 bg-neutral-50 space-y-1 text-sm text-neutral-700">
              <div>Status: {summary.status || paymentStatus || 'unknown'}</div>
              <div>Paid: {fmtMoney(paidCents, currency)}</div>
              <div>Outstanding: {fmtMoney(outstandingCents, currency)}</div>
              {resolution ? (
                <div className="pt-1">
                  <PaymentStatusPill
                    resolutionStatus={resolution?.resolution_status || resolution?.status || resolution?.state}
                    resolutionCode={resolution?.resolution_code || resolution?.code}
                  />
                </div>
              ) : null}
              {summary.last_attempt_at && (
                <div>Last attempt: {summary.last_attempt_at} ({summary.last_outcome || '—'})</div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                onClick={() => navigate(`/app/user/properties/${record.property_id}/history`)}
              >
                View full property history
              </button>
              {record.invoice?.url && (
                <a
                  href={record.invoice.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                >
                  <ExternalLink className="w-4 h-4" /> View payment receipt
                </a>
              )}
            </div>

            <div className="mt-6">
              <ServiceRecordTimeline
                serviceRecordId={record.id || serviceRecordId}
                fetchHeaders={fetchHeaders}
                status={srStatus}
                hideLocationCell
                hideNotes
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
