import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Clock, Loader2, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
};

export default function TimeClockPanel({ role }) {
  const { refreshMe } = useAuth() || {};
  const [status, setStatus] = useState({ status: 'clocked_out' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const isClockedIn = String(status.status || '').toLowerCase() === 'clocked_in';
  const isManager = useMemo(() => ['owner', 'admin', 'manager'].includes(String(role || '').toLowerCase()), [role]);

  const authHeader = async () => ({});

  const fetchStatus = async () => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get('/api/time/status', { headers, withCredentials: true });
      setStatus(data || { status: 'clocked_out' });
    } catch (e) {
      setStatus({ status: 'clocked_out' });
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const headers = await authHeader();
      const { data } = await axios.get('/api/time/logs', {
        headers,
        withCredentials: true,
        params: { limit: 20 },
      });
      const list = Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : [];
      setLogs(list);
    } catch (e) {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleClock = async () => {
    setBusy(true);
    setError('');
    try {
      const headers = await authHeader();
      if (isClockedIn) {
        const { data } = await axios.post('/api/time/clock_out', {}, { headers, withCredentials: true });
        setStatus(data || { status: 'clocked_out' });
      } else {
        const { data } = await axios.post('/api/time/clock_in', {}, { headers, withCredentials: true });
        setStatus(data || { status: 'clocked_in' });
      }
      fetchLogs();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = async () => {
    try {
      const params = new URLSearchParams({ limit: '500' });
      const url = `/api/time/logs/export?${params.toString()}`;
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) throw new Error('download_failed');
      const blob = await resp.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'time-logs.csv';
      link.click();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to download CSV');
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
          <Clock className="w-4 h-4" /> Time tracking
        </div>
        <button
          type="button"
          onClick={toggleClock}
          disabled={busy}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
            isClockedIn ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isClockedIn ? 'Clock Out' : 'Clock In'}
        </button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="text-xs text-neutral-600">
        Status: <span className="font-semibold">{isClockedIn ? 'Clocked in' : 'Clocked out'}</span>
        {status.clock_in_at && (
          <span className="ml-2">Started: {fmtDateTime(status.clock_in_at)}</span>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-neutral-50 flex items-center justify-between">
          <div className="text-xs font-semibold text-neutral-700">Recent activity</div>
          {isManager && (
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border bg-white hover:bg-neutral-100"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-neutral-600 uppercase tracking-wider">In</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-neutral-600 uppercase tracking-wider">Out</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logsLoading ? (
                <tr>
                  <td className="px-3 py-2 text-sm text-neutral-600" colSpan={2}>Loading…</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-3 py-2 text-sm text-neutral-600" colSpan={2}>No time logs yet.</td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id || l.time_log_id}>
                    <td className="px-3 py-2 text-sm text-neutral-700">{fmtDateTime(l.clock_in_at)}</td>
                    <td className="px-3 py-2 text-sm text-neutral-700">{fmtDateTime(l.clock_out_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
