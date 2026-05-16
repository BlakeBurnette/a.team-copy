import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import { useUserProfile, useAuth } from '../../context/AuthContext.jsx';
import { startSSE } from '../../utils/sse';
import TrustBadge from '../../components/timecards/TrustBadge';
import { formatMinutes, formatDateTime } from './timecardUtils';

const TableCell = ({ children, className = '' }) => (
  <td className={`px-3 py-2 align-top text-sm text-neutral-800 ${className}`}>{children}</td>
);

// Inclusive default range: today minus 13 days through today (14 calendar days total).
const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 13);
  const to = end.toISOString().slice(0, 10);
  const from = start.toISOString().slice(0, 10);
  return { from, to };
};

export default function OwnerCrewShifts() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};
  const orgId = profile?.organization_id || profile?.org_id || null;

  const initialRange = useMemo(defaultRange, []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchShifts = useCallback(async () => {
    if (from && to && from > to) {
      setError('Start date must be on or before end date.');
      setShifts([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/owner/crew/shifts', {
        withCredentials: true,
        params: { from, to },
      });
      const list = Array.isArray(data?.shifts) ? data.shifts : Array.isArray(data) ? data : [];
      setShifts(list);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load shifts');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    let stop;
    try {
      stop = startSSE({
        orgId,
        onEvent: ({ type }) => {
          if (type === 'shift_updated') fetchShifts();
        },
      });
    } catch (e) {
      console.warn('[OwnerCrewShifts] SSE not started', e);
    }
    return () => { stop?.close?.(); };
  }, [fetchShifts, orgId]);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 px-3 md:px-0">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Shifts</h3>
          <p className="text-sm text-neutral-600">Default range is the last 14 days. Live updates listen for shift events.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-2">
          <label className="text-sm text-neutral-700 flex flex-col">
            <span className="text-xs text-neutral-500">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-neutral-700 flex flex-col">
            <span className="text-xs text-neutral-500">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </label>
          <button
            type="button"
            onClick={fetchShifts}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-neutral-900 text-white text-sm whitespace-nowrap hover:bg-neutral-800"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="mt-3 text-sm text-rose-700">{error}</div> : null}
      {loading ? <div className="mt-4 text-sm text-neutral-700">Loading shifts…</div> : null}

      {!loading && shifts.length === 0 && !error ? (
        <div className="mt-4 text-sm text-neutral-600">No shifts in this range.</div>
      ) : null}

      {shifts.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-neutral-200 rounded-lg overflow-hidden">
            <thead className="bg-neutral-50 text-left text-xs font-semibold text-neutral-700">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Clock-in</th>
                <th className="px-3 py-2">Clock-out</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Geo</th>
                <th className="px-3 py-2">Trust</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id || `${s.user_id}-${s.clock_in_at || ''}`} className="border-t border-neutral-200">
                  <TableCell>
                    <div className="font-semibold text-neutral-900">{s.user?.name || s.employee_name || '—'}</div>
                    <div className="text-xs text-neutral-500">{s.user?.email || s.employee_email || null}</div>
                  </TableCell>
                  <TableCell>{s.team?.name || s.team_name || '—'}</TableCell>
                  <TableCell>{formatDateTime(s.clock_in_at)}</TableCell>
                  <TableCell>{formatDateTime(s.clock_out_at)}</TableCell>
                  <TableCell>{formatMinutes(s.duration_minutes)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full border text-xs text-neutral-700 bg-neutral-50 border-neutral-200">
                      {s.geo_status || s.location_status || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                <TrustBadge
                  trust_status={s.trust_status}
                  trust_hash={s.final_hash || s.initial_hash || s.trust_hash}
                  anchored_at={s.anchored_at}
                  trust_block_id={s.trust_block_id}
                  block_id={s.block_id}
                />
              </TableCell>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
