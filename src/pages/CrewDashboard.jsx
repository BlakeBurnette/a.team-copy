// src/pages/CrewDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { startOfToday, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast';
import { useUserProfile, useAuth } from '../context/AuthContext.jsx';
import ScheduleList from './schedule/components/ScheduleList';
import { keyFor, ymd, detectHasCard } from './schedule/scheduleUtils';
import { startSSE } from '../utils/sse';
import HeaderSubslot from '../components/HeaderSubslot';
import { TeamStatusCard, TodayProgressCard } from '../components/dashboard';

/* ---------- inbox hook (same behavior as Schedule.jsx) ---------- */
function useRequestInbox(headersFn, enabled) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!enabled) {
      setItems([]);
      return () => {};
    }
    (async () => {
      try {
        setLoading(true);
        const headers = await headersFn();
        const { data } = await axios.get('/api/owner/customer-requests', {
          headers,
          withCredentials: true,
          params: { status: 'requested' },
          validateStatus: () => true,
        });
        const list = Array.isArray(data?.items) ? data.items : [];
        if (alive) setItems(list);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [headersFn, enabled]);

  return { items, loading };
}

const getGeo = () =>
  new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });

export default function CrewDashboard() {
  const { profile } = useUserProfile() || {};
  const { user, roles = [], permissions = [], loading: authLoading, refreshMe } = useAuth() || {};
  const role = String(profile?.role || '').toLowerCase(); // crew_member | crew_leader | ...
  const isCrewLeader = role === 'crew_leader';
  const canInvoice = ['crew_leader', 'owner', 'admin'].includes(role);
  const readonly = role === 'crew_member';
  const canReschedule = isCrewLeader;

  const navigate = useNavigate();

  const orgId = profile?.organization_id || profile?.org_id || undefined;

  const today = useMemo(() => startOfToday(), []);
  const [occurrences, setOccurrences] = useState([]);
  const [startTimes, setStartTimes] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', duration: 2400 });
  const showToast = (m, d = 2400) => setToast({ show: true, message: m, duration: d });

  // shift + ticking nowTs for hh:mm
  const [shift, setShift] = useState({ active: false, shift_id: null, started_at: null, ended_at: null });
  const [nowTs, setNowTs] = useState(Date.now());

  const authHeaders = useCallback(async () => ({}), []);

  /* ---------- inbox (crew leader sees banner too) ---------- */
  const { items: requestItems, loading: inboxLoading } = useRequestInbox(authHeaders, isCrewLeader);
  const [inboxExpanded, setInboxExpanded] = useState(false);
  const pendingCount = requestItems.length;

  const fetchToday = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const headers = await authHeaders();
      const occReq = axios.get('/api/schedule', {
        headers, withCredentials: true,
        params: { from: ymd(today), to: ymd(today) },
      });
      const svcTimesReq = axios.get('/api/schedule/start-times', {
        headers, withCredentials: true,
        params: { from: ymd(today), to: ymd(today) },
      });
      const [occRes, svcTimesRes] = await Promise.all([occReq, svcTimesReq]);

      const svcOcc = Array.isArray(occRes.data?.occurrences) ? occRes.data.occurrences : [];
      const m = new Map();
      for (const r of (Array.isArray(svcTimesRes.data) ? svcTimesRes.data : [])) {
        const k = keyFor(Number(r.rule_id), String(r.date));
        m.set(k, r.start_minutes == null ? null : Number(r.start_minutes));
      }
      setStartTimes(m);

      const merged = [...svcOcc].sort((a, b) => {
        const am = a.start_minutes == null ? m.get(keyFor(a.rule_id, a.date)) : Number(a.start_minutes);
        const bm = b.start_minutes == null ? m.get(keyFor(b.rule_id, b.date)) : Number(b.start_minutes);
        const aUn = am == null, bUn = bm == null;
        if (aUn !== bUn) return aUn ? 1 : -1;
        if (!aUn && !bUn && am !== bm) return am - bm;
        return (a.customer?.name || '').localeCompare(b.customer?.name || '');
      });
      setOccurrences(merged);
    } catch (e) {
      const s = e?.response?.status;
      setErr(s === 403 || s === 404 ? 'You are not assigned to a team yet.' : 'Failed to load today’s schedule');
      setOccurrences([]);
      setStartTimes(new Map());
    } finally {
      setLoading(false);
    }
  }, [authHeaders, today]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  // Live updates via SSE (cookie-based) + local fallback tick
  useEffect(() => {
    let stop;
    let localTimer;

    try {
      const sse = startSSE({
        orgId,
        onEvent: ({ type, data }) => {
          if (type === 'shift_updated') {
            setShift((prev) => ({ ...prev, ...data }));
          } else if (
            type === 'occurrence_updated' ||
            type === 'schedule_updated' ||
            type === 'schedule_completed' ||
            type === 'invoice_paid' ||
            type === 'invoice_updated'
          ) {
            fetchToday();
          } else if (type === 'shift_tick') {
            setNowTs(Number(data?.ts) || Date.now());
          }
        },
      });

      // Fallback: keep counter alive in case tab throttling halts SSE timer
      localTimer = setInterval(() => setNowTs(Date.now()), 60_000);

      stop = () => {
        sse.close();
        if (localTimer) clearInterval(localTimer);
      };
    } catch (e) {
      console.warn('[CrewDashboard] SSE not started', e);
    }

    return () => { if (stop) stop(); };
  }, [orgId, fetchToday]);

  // On mount (and on role/org change), fetch current shift status so the banner reflects reality after navigation
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const headers = await authHeaders();
        const { data } = await axios.get('/api/crew/shifts/current', {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        });
        if (!alive) return;
        if (data && data.id) {
          setShift({
            active: data.ended_at ? false : true,
            shift_id: data.id,
            started_at: data.started_at || null,
            ended_at: data.ended_at || null,
          });
        }
      } catch (e) {
        // non-blocking; ignore
      }
    })();
    return () => { alive = false; };
  }, [authHeaders, orgId, role]);

  const formatElapsed = useCallback((startIso, now) => {
    if (!startIso) return '00:00';
    const started = new Date(startIso).getTime();
    const mins = Math.max(0, Math.floor((now - started) / 60000));
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }, []);

  // actions
  const hasCard = (occ) => detectHasCard(occ?.customer);
  const statusFor = (occ) => {
    switch ((occ?.invoice_status || '').toLowerCase()) {
      case 'paid': return { status: 'paid' };
      case 'sent':
      case 'scheduled':
      case 'failed': return { status: 'unpaid' };
      case 'void': return { status: 'void' };
      default: return { status: 'none' };
    }
  };
  const invoiceFor = (occ) => {
    const id = Number(occ?.invoice_id);
    return Number.isInteger(id) && id > 0 ? { id, status: occ?.invoice_status || null } : null;
  };

  const goToSchedule = () => navigate('/app/schedule?inbox=1');
  const openOnSchedule = (r) => {
    const params = new URLSearchParams({
      inbox: '1',
      date: String(r?.date || '').slice(0, 10),
      occurrence_id: String(r?.occurrence_id || ''),
      action: String(r?.action || ''),
    });
    navigate(`/app/schedule?${params.toString()}`);
  };

  const clockIn = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const geo = await getGeo(); // may be null in Brave; backend accepts nulls
      const { data } = await axios.post(
        '/api/crew/shifts/clock-in',
        { lat: geo?.lat, lng: geo?.lng, accuracy: geo?.accuracy },
        { headers, withCredentials: true }
      );
      setShift({ active: true, shift_id: data?.shift_id || data?.id || null, started_at: data?.started_at || new Date().toISOString() });
      showToast('Clocked in');
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to clock in');
    }
  }, [authHeaders]);

  const clockOut = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const geo = await getGeo();
      const { data } = await axios.post(
        '/api/crew/shifts/clock-out',
        { lat: geo?.lat, lng: geo?.lng, accuracy: geo?.accuracy },
        { headers, withCredentials: true }
      );
      setShift((s) => ({ ...s, active: false, ended_at: data?.ended_at || new Date().toISOString() }));
      showToast('Clocked out');
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to clock out');
    }
  }, [authHeaders]);

  const onQuickReschedule = useCallback(
    async (occ, to, maybeMinutes) => {
      if (!isCrewLeader) return;
      try {
        const headers = await authHeaders();
        let toDate = typeof to === 'string' ? to.slice(0, 10) : String(to?.toDate || '').slice(0, 10);
        let startMinutes =
          typeof to === 'object' && to && Number.isFinite(to.startMinutes)
            ? Number(to.startMinutes)
            : Number.isFinite(maybeMinutes) ? Number(maybeMinutes) : undefined;

        if (!toDate) { showToast('Pick a date to reschedule'); return; }
        const body = { from_date: occ.date, to_date: toDate };
        if (Number.isFinite(startMinutes)) body.start_minutes = startMinutes;

        await axios.post(`/api/schedule/${occ.rule_id}/reschedule`, body, { headers, withCredentials: true });
        showToast('Rescheduled');
        await fetchToday();
      } catch (e) {
        showToast(e?.response?.data?.error || 'Failed to reschedule');
      }
    },
    [authHeaders, isCrewLeader, fetchToday]
  );

  const onComplete = useCallback(
    async (occ) => {
      if (!isCrewLeader) return;
      try {
        const headers = await authHeaders();
        await axios.post(`/api/schedule/${occ.rule_id}/complete`, { date: occ.date }, { headers, withCredentials: true });
        await fetchToday();
        showToast('Completed');
      } catch (e) {
        // console noise removed; keep silent failure logging to avoid spam
        showToast(e?.response?.data?.error || 'Failed to complete');
      }
    },
    [authHeaders, isCrewLeader, fetchToday]
  );

  return (
    <>
      {/* Renders directly under the sticky header */}
      <HeaderSubslot>
        <div className="border-t bg-white">
          <div className="px-4 md:px-6 py-2 flex items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-medium">
                {shift.active ? 'On the clock' : 'Off the clock'}
              </span>
              {shift.active ? (
                <span className="ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
                  {formatElapsed(shift.started_at, nowTs)}
                </span>
              ) : null}
              {shift.active && shift.started_at ? (
                <span className="ml-2 text-neutral-600">
                  Started {format(new Date(shift.started_at), 'p')}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {!shift.active ? (
                <button
                  type="button"
                  onClick={clockIn}
                  className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs md:text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Clock In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clockOut}
                  className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs md:text-sm font-medium bg-rose-600 text-white hover:bg-rose-700"
                >
                  Clock Out
                </button>
              )}
            </div>
          </div>
        </div>
      </HeaderSubslot>

      <div className="p-4 md:p-6 space-y-4">
        {/* Progress + Team Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodayProgressCard
            total={occurrences.length}
            completed={occurrences.filter((o) => o.is_completed).length}
            inProgress={0}
          />
          {isCrewLeader && <TeamStatusCard />}
        </div>

        {/* Inbox banner for crew leaders */}
        {isCrewLeader && pendingCount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 md:p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-semibold">
                  {pendingCount} customer request{pendingCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToSchedule}
                  className="text-sm underline underline-offset-2 hover:opacity-80"
                >
                  Review on Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setInboxExpanded((v) => !v)}
                  className="text-sm underline underline-offset-2 hover:opacity-80"
                >
                  {inboxExpanded ? 'Hide' : 'Expand'}
                </button>
              </div>
            </div>

            {inboxExpanded && pendingCount > 0 && (
              <div className="mt-3 grid gap-2">
                {requestItems.map((r) => (
                  <div
                    key={`${r.id || ''}-${r.occurrence_id || ''}-${r.date || ''}-${r.action || ''}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white/60 border border-amber-200 px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="font-medium capitalize">{String(r.action || '').toLowerCase() || 'request'}</span>
                      <span className="mx-1">•</span>
                      <span>{String(r.date).slice(0, 10)}</span>
                      {r.service_label ? <span className="mx-1 text-neutral-600">• {r.service_label}</span> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => openOnSchedule(r)}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md border border-amber-300 hover:bg-amber-100"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm text-neutral-600">Crew</div>
          <h1 className="text-xl font-semibold">Today's Schedule</h1>
          <div className="text-neutral-600 text-sm">{format(today, 'EEEE, MMM d')}</div>
          {err ? <div className="mt-2 text-sm text-red-600">{err}</div> : null}
        </div>

        <div className="bg-white rounded-xl border p-0">
          {loading ? (
            <div className="p-4 text-neutral-500">Loading…</div>
          ) : (
            <ScheduleList
              days={[today]}
              occurrences={occurrences}
              startTimes={startTimes}
              canManage={isCrewLeader || (canInvoice && !readonly)}
              hideQuickDropdown={!isCrewLeader}
              statusFor={statusFor}
              isPending={() => false}
              hasCard={hasCard}
              onQuickReschedule={onQuickReschedule}
              onComplete={onComplete}
              invoiceFor={invoiceFor}
              alwaysOpen
            />
          )}
        </div>
      </div>

      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.message}
      </Toast>
    </>
  );
}
