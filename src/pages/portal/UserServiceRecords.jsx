// src/pages/portal/UserServiceRecords.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import Toast from '../../components/Toast';
import { PaymentStatePill } from '../schedule/components/PaymentPills';
import { useAuth } from '../../context/AuthContext.jsx';

const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
const shortHash = (h) => (h ? `${String(h).slice(0, 8)}…` : '—');

export default function UserServiceRecords() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const navigate = useNavigate();
  const headers = useMemo(() => ({}), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]); // [{ property, records: [] }]
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/portal/service-records', {
        headers,
        withCredentials: true,
      });
      const list = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      const byProp = new Map();
      list.forEach((r) => {
        const key = r.property_id || r.property?.id || 'unknown';
        const prop = r.property || { normalized_address: r.property_address || 'Property' };
        if (!byProp.has(key)) byProp.set(key, { property: prop, records: [] });
        byProp.get(key).records.push(r);
      });
      setGroups([...byProp.values()]);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load service records');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); /* eslint-disable-next-line */ }, []);

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
        <h1 className="text-xl font-semibold">Service Records</h1>
        <button
          type="button"
          onClick={fetchRecords}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50"
        >
          <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-600">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : groups.length === 0 ? (
        <div className="text-sm text-neutral-600">No service records yet.</div>
      ) : (
        groups.map((g, idx) => (
          <div key={idx} className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold text-neutral-800">
              {g.property?.normalized_address || g.property?.raw_address_input || 'Property'}
            </div>
            <div className="space-y-2">
              {g.records.map((r) => {
                const paymentStatus = r.payment_status || r.payment_state || r.status;
                const hash =
                  r.trust_hash_hex || r.service_record_hash_hex || r.hash_hex || (Array.isArray(r.service_record_hashes) ? r.service_record_hashes[0]?.hash_hex : null);
                return (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg p-3 hover:bg-neutral-50 cursor-pointer"
                    onClick={() => navigate(`/app/user/service-records/${r.id}`)}
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-neutral-800">{fmtDate(r.performed_at || r.date)}</div>
                      <div className="text-sm text-neutral-700">{r.organization_name || r.provider_name || r.organization?.name || 'Provider'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <PaymentStatePill invStatus={paymentStatus} pending={false} />
                      <div className="flex items-center gap-1 text-xs text-neutral-600">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-mono">{shortHash(hash)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
