// src/pages/public/PublicPropertyHistory.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react';
import Toast from '../../components/Toast';
import { PaymentStatePill } from '../schedule/components/PaymentPills';

const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
const shortHash = (h) => (h ? `${String(h).slice(0, 8)}…` : '—');

export default function PublicPropertyHistory() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [property, setProperty] = useState(null);
  const [records, setRecords] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`/api/public/property-history/${token}`);
        if (!alive) return;
        setProperty(data?.property || null);
        const list = Array.isArray(data?.service_records) ? data.service_records : Array.isArray(data) ? data : [];
        setRecords(list);
      } catch (e) {
        if (alive) {
          setError(e?.response?.data?.error || e?.message || 'Unable to load property history');
          setProperty(null);
          setRecords([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <div className="bg-white border rounded-xl shadow-sm p-4 space-y-2">
          <div className="text-xs uppercase text-neutral-500">Shared property history</div>
          <div className="text-xl font-semibold">
            {property?.normalized_address || property?.raw_address_input || 'Property'}
          </div>
          <div className="text-sm text-neutral-600">
            This view is read-only and shows a history of services performed with proof.
          </div>
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Provider</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Payment</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-neutral-600" colSpan={4}>Loading…</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-red-600" colSpan={4}>{error}</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-neutral-600" colSpan={4}>No service records found.</td>
                  </tr>
                ) : (
                  records.map((r, idx) => {
                    const paymentStatus = r.payment_status || r.payment_state || r.status;
                    const hash =
                      r.trust_hash_hex ||
                      r.service_record_hash_hex ||
                      r.hash_hex ||
                      (Array.isArray(r.service_record_hashes) ? r.service_record_hashes[0]?.hash_hex : null);
                    return (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 text-sm text-neutral-800">{fmtDate(r.performed_at || r.date)}</td>
                        <td className="px-3 py-2 text-sm text-neutral-700">{r.organization_name || r.provider_name || r.organization?.name || 'Provider'}</td>
                        <td className="px-3 py-2 text-sm">
                          <PaymentStatePill invStatus={paymentStatus} pending={false} />
                        </td>
                        <td className="px-3 py-2 text-sm text-neutral-700 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-mono text-xs">{shortHash(hash)}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
