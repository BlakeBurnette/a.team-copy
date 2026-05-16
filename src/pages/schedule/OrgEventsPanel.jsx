// src/pages/schedule/OrgEventsPanel.jsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { format, addDays, startOfToday, parseISO } from 'date-fns';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUserProfile } from '../../context/AuthContext.jsx';
import { CalendarDays, MapPin, Clock, Search, RefreshCw } from 'lucide-react';

const ymd = (d) => format(d, 'yyyy-MM-dd');
const safeParseISO = (s) => {
  try { return parseISO(String(s).slice(0, 10)); } catch { return null; }
};
const labelTime = (minsNullable) => {
  if (minsNullable == null) return 'Unscheduled';
  const mins = Number(minsNullable);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

function Pill({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200 whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

function EventRow({ ev }) {
  const c = ev.customer || {};
  const svc = ev.service || {};
  const addr =
    c.street || c.city || c.state
      ? `${c.street || ''}${c.city ? `, ${c.city}` : ''}${c.state ? `, ${c.state}` : ''}`
      : null;

  const when = `${format(parseISO(ev.date), 'EEE, MMM d')} — ${labelTime(ev.start_minutes)}`;

  return (
    <div className="rounded-xl border border-neutral-200 p-3 sm:p-4 flex flex-col gap-1 bg-white">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-neutral-900 truncate">{c.name || c.email || 'Customer'}</div>
        {ev.is_completed ? <Pill className="bg-green-100 text-green-900 border-green-200">Completed</Pill> : null}
        {/* If you later surface cancelled/special flags server-side, drop their pills here */}
      </div>
      <div className="text-sm text-neutral-800 truncate">{svc?.label || svc?.key || 'Service'}</div>
      <div className="mt-1 text-neutral-700 flex items-center gap-1 text-sm">
        <Clock className="w-4 h-4" />
        <span>{when}</span>
      </div>
      {addr ? (
        <div className="text-neutral-700 flex items-center gap-1 text-sm">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{addr}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function OrgEventsPanel({
  autoStart = false,
  windowDays = 7,
  pageSizeHint = 200,
}) {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};
  const role = String(profile?.role || '').toLowerCase();
  const crewScoped = ['crew_leader', 'crew_owner'].includes(role);
  const inferredTeamId = profile?.team_id ?? profile?.teamId ?? null;

  const [started, setStarted] = useState(Boolean(autoStart));
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [fromDate, setFromDate] = useState(startOfToday());
  const [hasMore, setHasMore] = useState(false);

  const canSearchPlaceholder = 'Search name, email, service, address, or date (YYYY-MM-DD or MM/DD)…';

  const authHeaders = useCallback(async () => ({}), []);

  const parseDateFromQuery = (q) => {
    const s = String(q || '').trim();
    if (!s) return null;
    const iso = s.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (iso) return safeParseISO(iso[0]);
    const mmdd = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (mmdd) {
      const m = String(mmdd[1]).padStart(2, '0');
      const d = String(mmdd[2]).padStart(2, '0');
      const year = mmdd[3] ? (mmdd[3].length === 2 ? `20${mmdd[3]}` : mmdd[3]) : String(new Date().getFullYear());
      return safeParseISO(`${year}-${m}-${d}`);
    }
    return null;
    };

  const onLoadMore = useCallback(async (reset = false, overrideStart = null) => {
    try {
      setLoading(true);
      const headers = await authHeaders();

      const start = overrideStart || (reset ? startOfToday() : fromDate);
      const params = {
        from: ymd(start),
        days: windowDays,
        limit: pageSizeHint,
      };
      if (query.trim()) params.q = query.trim();
      if (crewScoped && inferredTeamId != null) params.team_id = inferredTeamId;

      const { data } = await axios.get('/api/schedule/org-events', {
        headers,
        withCredentials: true,
        params,
        validateStatus: () => true,
      });

      if (!data || data.error) {
        setHasMore(false);
        if (reset) setItems([]);
        return;
      }

      const nextChunk = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => (reset ? nextChunk : [...prev, ...nextChunk]));

      const nextFromISO = data.next_from ? parseISO(String(data.next_from)) : addDays(start, windowDays);
      setFromDate(nextFromISO);
      setHasMore(Boolean(nextChunk.length) || Boolean(data.has_more));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, fromDate, query, windowDays, pageSizeHint, crewScoped, inferredTeamId]);

  // Kick off automatically if requested
  React.useEffect(() => {
    if (autoStart && !started) {
      setStarted(true);
      onLoadMore(true);
    }
  }, [autoStart, started, onLoadMore]);

  const onStartClick = async () => {
    setStarted(true);
    // If the query contains a date, start from there (does not change server filtering — just where we begin windows)
    const d = parseDateFromQuery(query);
    await onLoadMore(true, d || startOfToday());
  };

  const onSubmitSearch = async (e) => {
    e.preventDefault();
    if (!started) setStarted(true);
    const d = parseDateFromQuery(query);
    await onLoadMore(true, d || startOfToday());
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
      <div className="flex items-center gap-2 text-neutral-800 mb-3">
        <CalendarDays className="w-5 h-5" />
        <h2 className="font-semibold">Organization Events</h2>
      </div>

      <form onSubmit={onSubmitSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={canSearchPlaceholder}
            className="w-full rounded-md border border-neutral-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/70"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-neutral-50 text-sm"
          title="Search"
        >
          <RefreshCw className="w-4 h-4" />
          Search
        </button>
      </form>

      {!started ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onStartClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600"
          >
            Load events
          </button>
        </div>
      ) : (
        <>
          {items.length === 0 && !loading ? (
            <div className="text-neutral-600 text-sm">No events found for this window.</div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((ev) => (
              <EventRow
                key={`${ev.date}|${ev.rule_id}`}
                ev={ev}
              />
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              disabled={loading}
              onClick={() => onLoadMore(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border hover:bg-neutral-50 disabled:opacity-60"
            >
              {loading ? 'Loading…' : `Load next ${windowDays} days`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
