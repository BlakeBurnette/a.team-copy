// src/components/admin/security/SecurityEventsList.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getSecurityEvents } from '../../../api/securityDashboard';

const SEVERITY_BADGE = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
  info: 'bg-neutral-100 text-neutral-600',
};

const CATEGORY_OPTIONS = [
  'all',
  'authentication',
  'authorization',
  'data_access',
  'security_violation',
  'rate_limit',
  'csrf',
  'input_validation',
];

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false);

  const severity = (event.severity || 'info').toLowerCase();
  const badgeClass = SEVERITY_BADGE[severity] || SEVERITY_BADGE.info;

  return (
    <>
      <tr
        className="hover:bg-neutral-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm">
          <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${badgeClass}`}>
            {severity}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-neutral-900">
          {event.event_type || event.type || 'Unknown'}
        </td>
        <td className="px-4 py-3 text-sm text-neutral-600">
          {event.category || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-neutral-600">
          {event.user_email || event.user_id || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-neutral-500">
          {event.ip_address || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-neutral-500">
          {fmtDateTime(event.created_at || event.timestamp)}
        </td>
        <td className="px-4 py-3 text-center">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-neutral-50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
              <div>
                <div className="text-neutral-500">Organization</div>
                <div className="font-medium">{event.org_id || 'N/A'}</div>
              </div>
              <div>
                <div className="text-neutral-500">Resource</div>
                <div className="font-medium">{event.resource_type || 'N/A'}</div>
              </div>
              <div>
                <div className="text-neutral-500">Resource ID</div>
                <div className="font-medium">{event.resource_id || 'N/A'}</div>
              </div>
              <div>
                <div className="text-neutral-500">Action</div>
                <div className="font-medium">{event.action || 'N/A'}</div>
              </div>
            </div>
            {event.message && (
              <div className="text-sm mb-3">
                <div className="text-neutral-500 mb-1">Message</div>
                <div className="text-neutral-700">{event.message}</div>
              </div>
            )}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="text-sm">
                <div className="text-neutral-500 mb-1">Metadata</div>
                <pre className="bg-white rounded border p-2 overflow-x-auto text-xs">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function SecurityEventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterEventType, setFilterEventType] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 50;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        limit,
        offset: reset ? 0 : (page - 1) * limit,
      };
      if (filterSeverity !== 'all') params.severity = filterSeverity;
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterEventType.trim()) params.event_type = filterEventType.trim();

      const data = await getSecurityEvents(params);
      const list = data?.events || data || [];

      if (reset) {
        setEvents(list);
        setPage(1);
      } else {
        setEvents(list);
      }
      setHasMore(list.length === limit);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [filterSeverity, filterCategory, filterEventType, page]);

  useEffect(() => {
    load(true);
  }, [filterSeverity, filterCategory, filterEventType]); // eslint-disable-line

  useEffect(() => {
    if (page > 1) load(false);
  }, [page]); // eslint-disable-line

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm">
          <span className="text-neutral-600 mr-2">Severity:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-neutral-600 mr-2">Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            {CATEGORY_OPTIONS.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All' : cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              placeholder="Filter by event type..."
              className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Event Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Timestamp</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && !events.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" />
                    <div className="text-neutral-500 mt-2">Loading events...</div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    No events found matching your filters.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {events.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-500">
            Showing {events.length} events (Page {page})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
