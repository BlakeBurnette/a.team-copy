// src/pages/PropertyHistory.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { Copy, ShieldCheck, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';
import { PaymentStatePill } from './schedule/components/PaymentPills';
import HistoryList from '../components/history/HistoryList';

const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
const shortHash = (h) => (h ? `${String(h).slice(0, 8)}…` : '—');

export default function PropertyHistory() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const headers = useMemo(() => ({}), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [property, setProperty] = useState(null);
  const [records, setRecords] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/properties/${propertyId}/history`, {
        withCredentials: true,
      });
      setProperty(data?.property || null);
      const list = Array.isArray(data?.service_records) ? data.service_records : Array.isArray(data) ? data : [];
      setRecords(list);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load property history');
      setProperty(null);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); /* eslint-disable-next-line */ }, [propertyId]);

  const address = useMemo(() => {
    if (!property) return 'Property';
    return property.normalized_address || property.raw_address_input || 'Property';
  }, [property]);

  const handleCopy = (hash) => {
    if (!hash) return;
    try {
      navigator.clipboard.writeText(hash);
      showToast('Hash copied');
    } catch {
      showToast('Failed to copy hash');
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
        <h1 className="text-xl font-semibold">Property history</h1>
        <button
          type="button"
          onClick={fetchHistory}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50"
        >
          <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          Refresh
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-2">
        <div className="text-sm text-neutral-600 uppercase tracking-wide">Property</div>
        <div className="text-lg font-semibold">{address}</div>
        {property?.id ? (
          <div className="text-xs text-neutral-500">Property ID: {property.id}</div>
        ) : null}
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="text-sm font-semibold text-neutral-800">Service records</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Service</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Payment</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Trust</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-neutral-600" colSpan={6}>Loading…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-red-600" colSpan={6}>{error}</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-neutral-600" colSpan={6}>No service records yet.</td>
                </tr>
              ) : (
                records.map((r) => {
                  const paymentStatus = r.payment_status || r.payment_state || r.status;
                  const hash = r.trust_hash_hex || r.service_record_hash_hex || r.hash_hex || null;
                  const hashDisplay = hash ? shortHash(hash) : '—';
                  return (
                    <tr key={r.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 text-sm text-neutral-800">{fmtDate(r.date || r.performed_at)}</td>
                      <td className="px-3 py-2 text-sm text-neutral-700">{r.service_name || r.service?.name || '—'}</td>
                      <td className="px-3 py-2 text-sm text-neutral-700 capitalize">{r.status || '—'}</td>
                      <td className="px-3 py-2 text-sm text-neutral-700">
                        <PaymentStatePill invStatus={paymentStatus} pending={false} />
                      </td>
                      <td className="px-3 py-2 text-sm text-neutral-700 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" title="Trust-anchored" />
                        <span className="font-mono text-xs">{hashDisplay}</span>
                        {hash && (
                          <button
                            type="button"
                            onClick={() => handleCopy(hash)}
                            className="text-xs text-neutral-500 underline"
                          >
                            Copy
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <button
                          type="button"
                          className="text-emerald-700 hover:underline"
                          onClick={() => navigate(`/service-records/${r.id}`)}
                        >
                          View record
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      <div className="bg-white border rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold text-neutral-800 mb-2">History</div>
        <HistoryList scope="property" propertyId={propertyId} headers={headers} />
      </div>
    </div>
  );
}
