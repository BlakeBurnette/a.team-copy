import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { listApprovalFlags, resolveApprovalFlag } from '../../api/adminFlags';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext.jsx';

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

const fmtDistance = (m) => {
  if (m == null) return '';
  const meters = Number(m);
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export default function ApprovalFlags({ embedded }) {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterDate, setFilterDate] = useState('all'); // all, today, 7d
  const [filterSubject, setFilterSubject] = useState('all');
  const [noteModal, setNoteModal] = useState({ open: false, id: null });
  const [resolveNote, setResolveNote] = useState('');
  const [resolveError, setResolveError] = useState('');

  const authHeader = useCallback(async () => ({}), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeader();
      const data = await listApprovalFlags(headers);
      const list = Array.isArray(data?.flags) ? data.flags : Array.isArray(data) ? data : [];
      setFlags(list);
    } catch (e) {
      setFlags([]);
      setError(e?.response?.data?.error || e?.message || 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { load(); }, [load]);

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resolveFlag = async (id) => {
    if (!id) return;
    setResolvingId(id);
    setResolveError('');
    try {
      const headers = await authHeader();
      await resolveApprovalFlag(id, resolveNote?.trim() || undefined, headers);
      setFlags((prev) => prev.filter((f) => f.id !== id));
      setNoteModal({ open: false, id: null });
      setResolveNote('');
    } catch (e) {
      setResolveError(e?.response?.data?.error || e?.message || 'Failed to resolve flag');
    } finally {
      setResolvingId(null);
    }
  };

  const header = useMemo(() => ({
    title: 'Approval Flags',
    subtitle: 'Open flags from high-risk approvals',
  }), []);

  const filtered = useMemo(() => {
    const today = new Date();
    return flags.filter((f) => {
      const sev = (f.severity || f.level || '').toString().toLowerCase() || 'unknown';
      if (filterSeverity !== 'all' && sev !== filterSeverity) return false;
      if (filterSubject !== 'all') {
        const subj = (f.subject_type || f.subjectType || f.type || '').toString().toLowerCase();
        if (subj !== filterSubject) return false;
      }
      if (filterDate !== 'all') {
        const created = new Date(f.created_at || f.inserted_at || '');
        if (isNaN(created.getTime())) return false;
        if (filterDate === 'today') {
          const sameDay = created.toDateString() === today.toDateString();
          if (!sameDay) return false;
        }
        if (filterDate === '7d') {
          const diff = (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          if (diff > 7) return false;
        }
      }
      return true;
    });
  }, [flags, filterSeverity, filterDate, filterSubject]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      {!embedded && (
        <div>
          <div className="text-xs uppercase text-neutral-500">Admin</div>
          <h1 className="text-2xl font-bold">{header.title}</h1>
          <div className="text-sm text-neutral-600">{header.subtitle}</div>
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-900">Open flags</div>
          <button
            type="button"
            onClick={load}
            className="text-sm text-neutral-600 hover:text-neutral-800 underline"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <label className="space-y-1">
            <span className="text-neutral-700">Severity</span>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-neutral-700">Date</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterDate('all')}
                className={`px-3 py-2 rounded border ${filterDate === 'all' ? 'bg-neutral-100' : 'bg-white'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterDate('today')}
                className={`px-3 py-2 rounded border ${filterDate === 'today' ? 'bg-neutral-100' : 'bg-white'}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setFilterDate('7d')}
                className={`px-3 py-2 rounded border ${filterDate === '7d' ? 'bg-neutral-100' : 'bg-white'}`}
              >
                Last 7d
              </button>
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-neutral-700">Subject type</span>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="all">All</option>
              <option value="change_order">Change Order</option>
              <option value="add_on">Add-on</option>
              <option value="quote">Quote</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-neutral-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-neutral-600">No open flags.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => {
              const customer = f.customer || f.user || {};
              const reason = f.reason || f.flag_reason || 'Flagged';
              const geo = f.geo || f.location || f.metadata?.geo || {};
              const distance = f.distance_m || f.distance_meters || geo.distance_m;
              const isExpanded = expanded.has(f.id);
              const subjectType = (f.subject_type || f.subjectType || '').toLowerCase();
              const serviceRecordId =
                f.service_record_id ||
                f.metadata?.service_record_id ||
                f.payload?.service_record_id ||
                (geo && geo.service_record_id);
              const threshold = f.distance_threshold_m || f.distance_threshold || geo.distance_threshold_m;
              return (
                <div key={f.id} className="border rounded-lg p-3 bg-neutral-50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">
                        {customer.name || customer.full_name || 'Customer'} • {subjectType || 'Flag'}
                      </div>
                      <div className="text-sm text-neutral-800">{reason}</div>
                      <div className="text-xs text-neutral-600">Created {fmtDateTime(f.created_at || f.inserted_at)}</div>
                      {serviceRecordId ? (
                        <button
                          type="button"
                          className="text-xs text-emerald-700 underline"
                          onClick={() => window.open(`/app/service-records/${serviceRecordId}`, '_blank')}
                        >
                          View related service record
                        </button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(f.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteModal({ open: true, id: f.id })}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
                        disabled={resolvingId === f.id}
                      >
                        {resolvingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {resolvingId === f.id ? 'Resolving…' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="text-sm text-neutral-700 space-y-1 bg-white border rounded p-2">
                      {distance ? (
                        <div>Distance: {fmtDistance(distance)}</div>
                      ) : null}
                      {threshold ? <div>Threshold: {fmtDistance(threshold)}</div> : null}
                      {geo?.source ? <div>Geo source: {geo.source}</div> : null}
                      {geo?.source ? <div>Geo source: {geo.source}</div> : null}
                      {geo?.h3 ? <div>H3: {geo.h3}</div> : null}
                      {f.details ? <div>{f.details}</div> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={noteModal.open} onClose={() => { setNoteModal({ open: false, id: null }); setResolveNote(''); setResolveError(''); }}>
        <div className="space-y-3">
          <div className="text-lg font-semibold">Resolve flag</div>
          <div className="text-sm text-neutral-700">Add an optional note for audit trail.</div>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            rows="3"
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder="Resolved after manual review"
            disabled={!!resolvingId}
          />
          {resolveError ? <div className="text-sm text-red-600">{resolveError}</div> : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setNoteModal({ open: false, id: null }); setResolveNote(''); setResolveError(''); }}
              className="px-3 py-2 rounded border text-sm bg-white hover:bg-neutral-50"
              disabled={!!resolvingId}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => resolveFlag(noteModal.id)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
              disabled={!!resolvingId}
            >
              {resolvingId === noteModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {resolvingId === noteModal.id ? 'Resolving…' : 'Resolve'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
