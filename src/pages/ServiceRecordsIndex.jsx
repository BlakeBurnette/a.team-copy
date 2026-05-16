// src/pages/ServiceRecordsIndex.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const centsToUSD = (cents, currency = 'USD') =>
  typeof cents === 'number'
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
    : '';

const ymd = (d) =>
  (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || '').slice(0, 10));

const latestHashMeta = (r) => {
  if (!r) return { hash: null, version: null };
  const list = Array.isArray(r.service_record_hashes) ? r.service_record_hashes : [];
  let latest = null;
  if (list.length) {
    latest = list.reduce((acc, cur) => {
      if (!acc) return cur;
      const av = Number(acc.version_no || acc.version || 0);
      const cv = Number(cur.version_no || cur.version || 0);
      return cv > av ? cur : acc;
    }, null);
  }
  const hash =
    r.trust_hash_hex ||
    r.service_record_hash_hex ||
    r.hash_hex ||
    latest?.hash_hex ||
    null;
  const version =
    r.trust_hash_version ||
    r.service_record_hash_version ||
    latest?.version_no ||
    latest?.version ||
    null;
  return { hash, version };
};

const shortHash = (r) => {
  const { hash, version } = latestHashMeta(r);
  if (!hash) return '—';
  const base = `${String(hash).slice(0, 8)}…`;
  return version != null ? `${base} (v${version})` : base;
};

const statusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (['paid', 'succeeded', 'success', 'completed_paid'].includes(s))
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
        Paid
      </span>
    );
  if (s === 'failed')
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        Payment failed
      </span>
    );
  if (['pending', 'pending_capture', 'requires_action', 'requires_payment_method', 'processing', 'queued'].includes(s))
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        Payment pending
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
      Not collected
    </span>
  );
};

export default function ServiceRecordsIndex({ embedded = false }) {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const navigate = useNavigate();

  const [dataLoading, setDataLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2600 });

  const showToast = (msg, duration = 2600) => setToast({ show: true, msg, duration });

  const fetchRecords = async () => {
    setDataLoading(true);
    try {
      const { data } = await axios.get('/api/service-records', {
        withCredentials: true,
      });
      const list = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      setRecords(list);
      setNextCursor(data?.next_cursor || null);
    } catch (e) {
      console.error('[ServiceRecordsIndex] fetch failed', e?.response?.data || e);
      showToast('Failed to load service records');
      setRecords([]);
      setNextCursor(null);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => records, [records]);

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-4'}>
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      <div className={`flex items-center justify-between ${embedded ? 'mt-1' : ''}`}>
        {embedded ? (
          <h2 className="text-lg font-semibold">Service Records</h2>
        ) : (
          <h1 className="text-xl font-semibold">Service Records</h1>
        )}
        <button
          type="button"
          onClick={fetchRecords}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50"
        >
          <RefreshCw className={dataLoading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                  Date
                </th>
                <th className="text-left text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                  Customer
                </th>
                <th className="text-left text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                  Property
                </th>
                <th className="text-left text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                  Service
                </th>
                <th className="text-right text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                  Amount
                </th>
                <th className="text-left text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                  Proof
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dataLoading ? (
                <tr>
                  <td className="px-3 py-3 text-neutral-500 text-sm" colSpan={7}>
                    Loading service records…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-neutral-500 text-sm" colSpan={7}>
                    No service records found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-neutral-50 cursor-pointer"
                    onClick={() => navigate(`/service-records/${r.id}`)}
                  >
                    <td className="px-3 py-2 text-sm text-neutral-800">{ymd(r.performed_at)}</td>
                    <td className="px-3 py-2 text-sm text-neutral-800">{r.customer_name || '—'}</td>
                    <td className="px-3 py-2 text-sm text-neutral-700">{r.property_address || '—'}</td>
                    <td className="px-3 py-2 text-sm text-neutral-700">{r.service_name || '—'}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">
                      {centsToUSD(r.amount_cents, r.currency || 'USD') || '$0.00'}
                    </td>
                    <td className="px-3 py-2 text-sm">{statusBadge(r.payment_status || r.status)}</td>
                    <td className="px-3 py-2 text-sm text-neutral-700">{shortHash(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {nextCursor && (
          <div className="px-3 py-2 text-xs text-neutral-600 border-t">
            More records available…
          </div>
        )}
      </div>
    </div>
  );
}
