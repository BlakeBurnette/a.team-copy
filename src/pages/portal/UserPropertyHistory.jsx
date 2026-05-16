// src/pages/portal/UserPropertyHistory.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, RefreshCw, Copy } from 'lucide-react';
import Toast from '../../components/Toast';
import { PaymentStatePill } from '../schedule/components/PaymentPills';
import { useAuth } from '../../context/AuthContext.jsx';

const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
const shortHash = (h) => (h ? `${String(h).slice(0, 8)}…` : '—');

export default function UserPropertyHistory() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [property, setProperty] = useState(null);
  const [records, setRecords] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/portal/properties/${propertyId}/service-records`, {
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

  const createShare = async () => {
    if (!propertyId) return;
    setSharing(true);
    try {
      const { data } = await axios.post(`/api/portal/properties/${propertyId}/share`, {}, {
        withCredentials: true,
      });
      if (data?.share_url) {
        setShareUrl(data.share_url);
        showToast('Share link created');
      } else {
        showToast('Share link not returned');
      }
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to create share link', 3200);
    } finally {
      setSharing(false);
    }
  };

  const copyShare = () => {
    if (!shareUrl) return;
    try { navigator.clipboard.writeText(shareUrl); showToast('Link copied'); }
    catch { showToast('Failed to copy link'); }
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
        <div className="text-lg font-semibold">
          {property?.normalized_address || property?.raw_address_input || 'Property'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={createShare}
          disabled={sharing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm disabled:opacity-60"
        >
          Share property history
        </button>
        {shareUrl && (
          <div className="flex items-center gap-2">
            <input
              className="border rounded-lg px-2 py-1 text-sm w-64"
              value={shareUrl}
              readOnly
            />
            <button
              type="button"
              onClick={copyShare}
              className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
            >
              <Copy className="w-4 h-4" /> Copy link
            </button>
          </div>
        )}
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
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Trust</th>
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
                  <td className="px-3 py-3 text-sm text-neutral-600" colSpan={4}>No service records for this property.</td>
                </tr>
              ) : (
                records.map((r) => {
                  const paymentStatus = r.payment_status || r.payment_state || r.status;
                  const hash =
                    r.trust_hash_hex || r.service_record_hash_hex || r.hash_hex || (Array.isArray(r.service_record_hashes) ? r.service_record_hashes[0]?.hash_hex : null);
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={() => navigate(`/app/user/service-records/${r.id}`)}
                    >
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
  );
}
