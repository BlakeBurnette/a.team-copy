import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import {
  approveRouteAddRequest,
  denyRouteAddRequest,
  fetchRouteAddRequests,
} from '../api/recommendations';
import { adminGetGlobalRecommendations } from '../api/adminApi';

const friendlyError = (e) => e?.response?.data?.error || e?.message || 'Unable to load requests';

export default function ProviderRouteAdds() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2200 });
  const [denyId, setDenyId] = useState(null);
  const [denyReason, setDenyReason] = useState('');
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [globalChecked, setGlobalChecked] = useState(false);

  const showToast = (msg, duration = 2200) => setToast({ show: true, msg, duration });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchRouteAddRequests('pending');
      const list = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
      setRequests(list);
    } catch (e) {
      setError(friendlyError(e));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const g = await adminGetGlobalRecommendations();
        if (!alive) return;
        const effective = g?.effective_enabled ?? g?.enabled ?? g?.enable_recommendations_features;
        setGlobalEnabled(!!effective);
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          // ignore and default to enabled for non-admin/unknown
        }
      } finally {
        if (alive) setGlobalChecked(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (globalChecked && globalEnabled) load();
  }, [globalChecked, globalEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const onApprove = async (req) => {
    if (!req) return;
    const id = req.id || req.request_id;
    setBusyId(id);
    try {
      await approveRouteAddRequest(id);
      setRequests((prev) => prev.filter((r) => (r.id || r.request_id) !== id));
      showToast('Approved');
    } catch (e) {
      showToast(friendlyError(e), 2600);
    } finally {
      setBusyId(null);
    }
  };

  const onDeny = async () => {
    if (!denyId) return;
    setBusyId(denyId);
    try {
      await denyRouteAddRequest(denyId, denyReason);
      setRequests((prev) => prev.filter((r) => (r.id || r.request_id) !== denyId));
      showToast('Denied');
      setDenyId(null);
      setDenyReason('');
    } catch (e) {
      showToast(friendlyError(e), 2600);
    } finally {
      setBusyId(null);
    }
  };

  const empty = useMemo(() => requests.length === 0, [requests]);

  return (
    <div className="space-y-4">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      {globalChecked && !globalEnabled ? (
        <div className="border rounded-xl bg-white p-4 text-sm text-neutral-700">
          Route add requests are disabled by admin.
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Route add requests</h1>
          <p className="text-sm text-neutral-600">Approve or deny requests from interested properties.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
        >
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            Refresh
          </button>
        </div>

      {loading ? (
        <div className="text-sm text-neutral-600">Loading requests...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : empty ? (
        <div className="border rounded-xl bg-white p-4 text-sm text-neutral-700">No pending requests.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const id = req.id || req.request_id;
            const property = req.property || {};
            const address =
              property?.masked_address ||
              property?.normalized_address ||
              property?.address ||
              req.property_address ||
              'Property';
            const service = req.service_type || req.serviceType || 'Service';
            const day = req.day_of_week || req.dayOfWeek || req.suggested_day;
            return (
              <div key={id} className="border rounded-xl bg-white p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-800">{address}</div>
                    <div className="text-sm text-neutral-600">{service}</div>
                  </div>
                  {day ? <span className="text-xs text-neutral-600">Preferred: {day}</span> : null}
                </div>
                {req.notes ? (
                  <div className="text-sm text-neutral-700">{req.notes}</div>
                ) : null}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setDenyId(id); setDenyReason(''); }}
                    disabled={busyId === id}
                    className="px-3 py-2 rounded-lg border text-sm bg-white hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Deny
                  </button>
                  <button
                    type="button"
                    onClick={() => onApprove(req)}
                    disabled={busyId === id}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busyId === id ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!denyId} onClose={() => setDenyId(null)}>
        <div className="space-y-4">
          <div>
            <div className="text-lg font-semibold text-neutral-900">Deny request</div>
            <div className="text-sm text-neutral-600">Share a brief reason for the requester.</div>
          </div>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[90px]"
            placeholder="Optional reason"
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDenyId(null)}
              className="px-3 py-2 rounded-lg border text-sm bg-white hover:bg-neutral-50"
              disabled={busyId === denyId}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDeny}
              disabled={busyId === denyId}
              className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
            >
              {busyId === denyId ? 'Sending...' : 'Deny'}
            </button>
          </div>
        </div>
      </Modal>
        </>
      )}
    </div>
  );
}
