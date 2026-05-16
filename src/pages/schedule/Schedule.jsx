// src/pages/schedule/Schedule.jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { addDays } from 'date-fns';

import Toast from '../../components/Toast';
import { useUserProfile, useAuth } from '../../context/AuthContext.jsx';
import ScheduleList from './components/ScheduleList';
import EditTimeModal from './components/EditTimeModal';
import RescheduleModal from './components/RescheduleModal';
import { TopBar, OwnerPanels } from './components';

import { ymd, keyFor, detectHasCard } from './scheduleUtils';
import useAuthHeaders from './hooks/useAuthHeaders';
import useScheduleRange from './hooks/useScheduleRange';
import useStartTimes from './hooks/useStartTimes';
import useOccurrences from './hooks/useOccurrences';
import useInvoiceIndex from './hooks/useInvoiceIndex';
import useInvoiceSSE from './hooks/useInvoiceSSE';
import {
  getMyOrganization,
  getTeams,
  postSetTime,
  deleteTime,
  postSkip,
  postCancelOccurrence,
  postReschedule,
  getAvailableSlots,
  patchReorderStops,
} from './lib/api';
import { postStartWork } from './lib/api';
import { buildRescheduleOptions } from './lib/slots';
import { ymdToLocalDate } from './utils/dates';
import OrgEventsPanel from './OrgEventsPanel';
import { createApproval } from '../../api/approvals';
import { proposeScheduleChange } from '../../api/scheduleChanges';

// NEW: shared SSE helper (handles reconnects + typed events)
import { startSSE } from '../../utils/sse';
import TimeClockPanel from '../../components/time/TimeClockPanel';

/* ----------------- helpers ----------------- */
const isCancelledOcc = (o) => {
  const s = (v) => String(v || '').toLowerCase();
  return !!(
    o?.skipped ||
    o?.is_skipped ||
    o?.cancelled ||
    o?.canceled ||
    s(o?.status) === 'cancelled' ||
    s(o?.status) === 'canceled' ||
    s(o?.state) === 'cancelled' ||
    s(o?.state) === 'canceled'
  );
};

// Canonical property/service location resolver (shared by start/complete/reschedule)
const propertyIdOf = (occ) => {
  if (!occ) return null;
  const prop = occ.property || {};
  const cust = occ.customer || {};
  return (
    prop.id ||
    prop.property_id ||
    occ.property_id ||
    cust.primary_property_id ||
    cust.property_id ||
    occ.service_location_id ||
    occ.serviceLocationId ||
    prop.address_id ||
    prop.addressId ||
    cust.address_id ||
    cust.customer_address_id ||
    cust.addressId ||
    cust.customerAddressId ||
    null
  );
};

/* ------------------------- inbox (w/ manual refresh + dismiss) ------------------------- */
function useRescheduleInbox(headersFn, rangeFrom, rangeTo, enabled) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // optimistic local dismiss
  const dismissedRef = useRef(new Set());
  const dismiss = useCallback((id) => {
    if (!id) return;
    const k = String(id);
    dismissedRef.current.add(k);
    setItems((prev) => prev.filter((x) => String(x.id) !== k));
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) { setItems([]); return; }
    try {
      setLoading(true);
      const headers = await headersFn();
      const { data } = await axios.get('/api/owner/customer-requests', {
        headers,
        withCredentials: true,
        params: {
          status: 'requested',
          from: ymd(rangeFrom),
          to: ymd(rangeTo),
        },
        validateStatus: () => true,
      });

      const raw = Array.isArray(data?.items) ? data.items : [];
      const filtered = raw.filter((r) => {
        const id = String(r?.id ?? '');
        const st = String(r?.status ?? '').toLowerCase();
        const resolved = !!r?.resolved_at || ['resolved','approved','denied','closed'].includes(st);
        const requested = !st || ['requested','pending','open'].includes(st);
        return requested && !resolved && !dismissedRef.current.has(id);
      });

      setItems(filtered);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [headersFn, rangeFrom, rangeTo, enabled]);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, loading, refresh, dismiss };
}

class ScheduleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[Schedule] boundary caught', { error, info });
    this.setState({ info });
  }
  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
          <div className="font-semibold text-lg mb-2">Schedule unavailable</div>
          <div className="text-sm mb-3">Something went wrong while rendering the schedule. Please reload. The error has been logged to the console for diagnostics.</div>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScheduleInner({ mode = 'owner', groupByTeam = false, teamId = null }) {
  const { user, roles = [], permissions = [], loading: authLoading, refreshMe } = useAuth() || {};
  const { isOwner, isManager, profile } = useUserProfile() || {};
  const role = String(profile?.role || '').toLowerCase();

  const canSeeRequestInbox = ['owner', 'manager', 'crew_leader'].includes(role);
  const FEATURE_PAYMENT_AUDIT_DRAWER =
    (typeof import.meta !== 'undefined' && String(import.meta.env?.VITE_FEATURE_PAYMENT_AUDIT_DRAWER || '').toLowerCase() === 'true') ||
    (typeof process !== 'undefined' && String(process.env?.VITE_FEATURE_PAYMENT_AUDIT_DRAWER || '').toLowerCase() === 'true');
  const showPaymentAudit = FEATURE_PAYMENT_AUDIT_DRAWER && role === 'admin';

  const crewCanManage = mode === 'crew' && (role === 'crew_owner' || role === 'crew_leader');
  const canManage = (isOwner || isManager) || crewCanManage;

  const headersFn = useAuthHeaders();
  const { rangeFrom, rangeTo, setRangeFrom, setRangeTo, days, nextRange, prevRange } = useScheduleRange('10', 10);
  const { startTimes, refreshStartTimes } = useStartTimes(headersFn, rangeFrom, rangeTo);
  const { occurrences, setOccurrences, loading, fetchAll } = useOccurrences(
    headersFn,
    { mode, teamId, profile },
    { rangeFrom, rangeTo },
  );
  const { invoiceIndex, setInvoiceIndex, buildInvoiceIndex, statusForOccurrence } = useInvoiceIndex(headersFn);

  const occRef = useRef(occurrences);
  useEffect(() => { occRef.current = occurrences; }, [occurrences]);

  // Owner resources
  const [org, setOrg] = useState(null);
  const [teams, setTeams] = useState([]);
  const teamOptions = useMemo(() => teams.map((t) => ({ value: String(t.id), label: t.name })), [teams]);

  const [toast, setToast] = useState({ show: false, message: '', duration: 3000 });
  const showToast = (message, duration = 3000) => setToast({ show: true, message, duration });

  const fetchSlots = useCallback(
    async (occ, dateYmd, teamIdOverride = null) => {
      try {
        const team_id = teamIdOverride ?? occ?.team_id ?? null;
        const svcMin = Number(occ?.service?.estimated_minutes ?? occ?.duration_minutes ?? 45);
        const headers = await headersFn();
        const data = await getAvailableSlots(headers, {
          date: dateYmd,
          schedule_rule_id: occ?.rule_id,
          service_minutes: Number.isFinite(svcMin) && svcMin > 0 ? svcMin : undefined,
          team_id,
        });
        const list = Array.isArray(data?.slots) ? data.slots : Array.isArray(data) ? data : [];
        const slots = list
          .map((s) => (typeof s === 'object' ? s.start_minutes : s))
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n));
        if (!slots.length) showToast('Unable to load availability—pick a different day or try again', 5000);
        return slots;
      } catch (e) {
        console.warn('[Schedule] availability load failed', e?.response?.data || e);
        showToast('Unable to load availability—pick a different day or try again', 5000);
        return [];
      }
    },
    [headersFn, showToast]
  );

  const getGeoLocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return { location: null, error: 'unsupported' };
    try {
      const perm = navigator?.permissions?.query ? await navigator.permissions.query({ name: 'geolocation' }).catch(() => null) : null;
      if (perm && perm.state === 'denied') return { location: null, error: 'denied' };
    } catch {}
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_m: pos.coords.accuracy,
          },
          error: null,
        }),
        (err) => resolve({ location: null, error: err?.code === 1 ? 'denied' : 'unavailable' }),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }, []);

  const { pendingKeys, setPendingKeys, setOccurrencesRef } = useInvoiceSSE(
    org?.id,
    setInvoiceIndex,
    { rangeFrom, rangeTo },
  );

  const workStartEnabled = !!(org?.enable_work_start ?? org?.settings?.enable_work_start);
  const canStartWorkRole = role === 'owner' || role === 'crew_leader';

  /* ---------------- owner data fetch ---------------- */
  useEffect(() => {
    (async () => {
      if (mode === 'crew') return;
      try {
        const headers = await headersFn();
        const [orgData, teamData] = await Promise.all([
          getMyOrganization(headers).catch(() => null),
          getTeams(headers).catch(() => []),
        ]);
        setOrg(orgData || null);
        setTeams(Array.isArray(teamData) ? teamData : []);
      } catch {}
    })();
  }, [mode, headersFn]);

  // keep SSE ref in sync
  useEffect(() => {
    setOccurrencesRef(occurrences);
  }, [occurrences, setOccurrencesRef]);

  // invoice index (skip for crew)
  useEffect(() => {
    (async () => {
      if (mode === 'crew') {
        setInvoiceIndex({});
        return;
      }
      await buildInvoiceIndex(occurrences);
    })();
  }, [mode, occurrences, buildInvoiceIndex, setInvoiceIndex]);

  /* -------------------- SSE: live invoice + schedule → UI -------------------- */
  useEffect(() => {
    let closer = null;
    try {
      closer = startSSE({
        orgId: org?.id ?? undefined,
        onOpen: () => console.log('[SSE] open'),
        onError: (e) => console.warn('[SSE] error', e),
        onEvent: ({ type, data }) => {
          // Handle schedule completion events - mark occurrence as completed
          if (type === 'schedule_completed' || type === 'schedule.completed') {
            const ruleId = Number(data?.rule_id || 0) || null;
            const dateYmd = (data?.date && String(data.date).slice(0, 10)) || null;

            if (ruleId && dateYmd) {
              setOccurrences((prev) => {
                if (!Array.isArray(prev)) return prev;
                let changed = false;
                const next = prev.map((o) => {
                  if (Number(o.rule_id) === ruleId && String(o.date).slice(0, 10) === dateYmd) {
                    if (!o.is_completed) {
                      changed = true;
                      return { ...o, is_completed: true };
                    }
                  }
                  return o;
                });
                return changed ? next : prev;
              });

              // Clear pending spinner
              setPendingKeys((prevSet) => {
                const nextSet = new Set(prevSet);
                nextSet.delete(keyFor(ruleId, dateYmd));
                return nextSet;
              });
            }
          }

          // Handle invoice updates (payment completed, etc.)
          if (type === 'invoice_updated' || type === 'invoice_paid') {
            const invId = Number(data?.invoice_id || 0);
            const status = String(data?.status || '').toLowerCase() || null;
            const customerId = Number(data?.customer_id || 0) || null;
            const ruleId = Number(data?.rule_id || 0) || null;
            const dateYmd = (data?.date && String(data.date).slice(0, 10)) || null;

            // 1) Update invoiceIndex so status badges/logic recompute
            if (customerId && invId && status) {
              setInvoiceIndex((prev) => {
                const next = { ...prev };
                const list = Array.isArray(next[customerId]) ? [...next[customerId]] : [];
                const idx = list.findIndex((x) => Number(x.id || x.invoice_id) === invId);
                const base =
                  idx >= 0
                    ? { ...list[idx] }
                    : { id: invId, invoice_id: invId, customer_id: customerId };
                base.status = status;
                // keep period bounds if present on payload (publishInvoiceUpdate tries to include them)
                if (data?.period_start) base.period_start = data.period_start;
                if (data?.period_end) base.period_end = data.period_end;
                if (idx >= 0) list[idx] = base;
                else list.push(base);
                next[customerId] = list;
                return next;
              });
            }

            // 2) Update the visible occurrence that this invoice maps to (if we can infer it)
            setOccurrences((prev) => {
              if (!Array.isArray(prev) || (!ruleId && !customerId)) return prev;
              let changed = false;
              const next = prev.map((o) => {
                const matchesRule = ruleId && Number(o.rule_id) === ruleId;
                const matchesCust = customerId && Number(o?.customer?.id) === customerId;
                const matchesDate = dateYmd ? String(o.date).slice(0, 10) === dateYmd : true;

                if ((matchesRule || matchesCust) && matchesDate) {
                  // only change if something actually differs
                  const curStatus = String(o.invoice_status || '').toLowerCase();
                  if (curStatus !== status || Number(o.invoice_id || 0) !== invId) {
                    changed = true;
                    const updated = {
                      ...o,
                      invoice_id: invId || o.invoice_id,
                      invoice_status: status || o.invoice_status,
                    };
                    return updated;
                  }
                }
                return o;
              });
              if (!changed) return prev;

              // 3) Clear local pending spinner for this occurrence
              if (ruleId && dateYmd) {
                setPendingKeys((prevSet) => {
                  const nextSet = new Set(prevSet);
                  nextSet.delete(keyFor(ruleId, dateYmd));
                  return nextSet;
                });
              }
              return next;
            });
          }
        },
      });
    } catch (e) {
      console.warn('[SSE] failed to open', e);
    }
    return () => { try { closer && closer.close(); } catch {} };
  }, [org?.id, setInvoiceIndex, setOccurrences, setPendingKeys]);

  /* ---------------- inbox + local controls ---------------- */
  const { items: requestItems, loading: requestLoading, refresh: refreshInbox, dismiss } =
    useRescheduleInbox(headersFn, rangeFrom, rangeTo, canSeeRequestInbox);

  // hide requests for cancelled occurrences
  const displayRequests = useMemo(() => {
    const list = Array.isArray(requestItems) ? requestItems : [];
    return list.filter((r) => {
      const d = String(r?.date || '').slice(0, 10);
      const occ = (occRef.current || []).find(
        (o) => String(o.date).slice(0, 10) === d && Number(o.rule_id) === Number(r.occurrence_id)
      );
      return !isCancelledOcc(occ);
    });
  }, [requestItems, occurrences]);

  const [inboxExpanded, setInboxExpanded] = useState(false);
  const pendingCount = displayRequests.length;
  const [pendingScheduleChanges, setPendingScheduleChanges] = useState(() => new Map());

  // track which inbox item opened the modal
  const [activeRequest, setActiveRequest] = useState(null);

  // ---- modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editOcc, setEditOcc] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedMinutes, setSelectedMinutes] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const [resOpen, setResOpen] = useState(false);
  const [resDate, setResDate] = useState('');
  const [resSlots, setResSlots] = useState([]);
  const [resMinutes, setResMinutes] = useState(null);
  const [resOptions, setResOptions] = useState([]);
  const [resAllowedLabel, setResAllowedLabel] = useState('');

  const canCancelEditOcc = useMemo(() => {
    if (!editOcc) return false;
    const st = String(statusForOccurrence(editOcc || {}).status || '').toLowerCase();
    return !['paid', 'succeeded', 'void', 'refunded'].includes(st);
  }, [editOcc, statusForOccurrence]);

  // ---- helpers
  const invoiceFor = useCallback((occ) => {
    if (!occ) return null;
    const cid = occ?.customer?.id;
    const invs = invoiceIndex[cid] || [];
    if (!invs.length) return null;
    const d = String(occ.date);
    return (
      invs.find((iv) => {
        const ps = String(iv.period_start || '').slice(0, 10);
        const pe = String(iv.period_end || '').slice(0, 10);
        return ps && pe && ps <= d && d <= pe;
      }) || null
    );
  }, [invoiceIndex]);

  // ---- actions
  const openEdit = useCallback(
    async (occ) => {
      try {
        if (isCancelledOcc(occ)) {
          showToast('This visit is cancelled — you can’t edit/reschedule it.');
          return;
        }
        const k = keyFor(occ.rule_id, occ.date);
        const mins = startTimes.get(k);
        setEditOcc(occ);
        setSelectedMinutes(Number.isFinite(mins) ? mins : null);
        setSelectedTeamId(occ?.team_id ?? null);
        const slots = await fetchSlots(occ, occ.date, occ?.team_id ?? null);
        setAvailableSlots(slots || []);
        setEditOpen(true);
      } catch (e) {
        console.error('[Schedule] openEdit failed', e);
        showToast('Unable to open editor', 5000);
      }
    },
    [startTimes, fetchSlots],
  );

  const saveEdit = useCallback(
    async () => {
      if (!editOcc) return;
      try {
        const headers = await headersFn();
        await postSetTime(headers, {
          rule_id: editOcc.rule_id,
          date: editOcc.date,
          start_minutes: selectedMinutes,
          team_id: selectedTeamId ?? null,
        });
        await Promise.all([refreshStartTimes(), fetchAll()]);
        showToast('Saved', 5000);

        // Resolve the active request (best-effort)
        try {
          if (activeRequest?.id) {
            await axios.post(
              `/api/owner/customer-requests/${activeRequest.id}/resolve`,
              { status: 'approved' },
              { headers, withCredentials: true }
            );
            refreshInbox();
          }
        } catch {}
        setActiveRequest(null);

        setEditOpen(false);
      } catch (e) {
        console.error('[Schedule] saveEdit error', e?.response?.data || e);
        showToast('Failed to save changes', 5000);
      }
    },
    [headersFn, editOcc, selectedMinutes, selectedTeamId, refreshStartTimes, fetchAll, activeRequest, refreshInbox],
  );

  const clearTime = useCallback(
    async () => {
      if (!editOcc) return;
      try {
        const headers = await headersFn();
        await deleteTime(headers, editOcc.rule_id, editOcc.date);
        await Promise.all([refreshStartTimes(), fetchAll()]);
        showToast('Cleared scheduled time', 5000);
        setEditOpen(false);
      } catch (e) {
        console.error('[Schedule] clearTime error', e?.response?.data || e);
        showToast('Failed to clear time', 5000);
      }
    },
    [headersFn, editOcc, refreshStartTimes, fetchAll],
  );

  const cancelOccurrence = useCallback(
    async () => {
      if (!editOcc) return;
      try {
        const st = String(statusForOccurrence(editOcc || {}).status || '').toLowerCase();
        if (['paid', 'succeeded', 'void', 'refunded'].includes(st)) {
          showToast('Already paid — reschedule instead', 5000);
          return;
        }

        const headers = await headersFn();
        try {
          await postCancelOccurrence(headers, editOcc.rule_id, editOcc.date);
        } catch (err) {
          if (err?.response?.status === 404) {
            await postSkip(headers, editOcc.rule_id, editOcc.date);
          } else {
            throw err;
          }
        }
        await refreshStartTimes();
        showToast('Occurrence cancelled', 5000);
        setEditOpen(false);
      } catch (e) {
        console.error('[Schedule] cancelOccurrence error', e?.response?.data || e);
        const msg =
          (e?.response?.status === 409 && (e?.response?.data?.error || e?.response?.data?.message)) ||
          e?.response?.data?.error ||
          'Failed to cancel occurrence';
        showToast(msg, 5000);
      }
    },
    [headersFn, editOcc, refreshStartTimes, statusForOccurrence, showToast],
  );

  // Updated: let the server/Temporal perform collection; we just mark pending
  const completeOccurrence = useCallback(
    async (occ) => {
      try {
        const propertyId = propertyIdOf(occ);
        if (!propertyId) {
          showToast('Address is required to schedule and verify work. Please add a valid address.', 5000);
          return;
        }
        const headers = await headersFn();
        const { location, error: geoErr } = await getGeoLocation();
        if (geoErr) showToast('Location unavailable — completing without location', 5000);

        const { data } = await axios.post(
          `/api/schedule/${occ.rule_id}/complete`,
          { date: occ.date, collect: true, property_id: propertyId, ...(location ? { location } : {}) },
          { headers, withCredentials: true }
        );

        await Promise.all([refreshStartTimes(), fetchAll()]);
        await buildInvoiceIndex(occurrences);

        // Mark local pending only if collection is actually enqueued/processing
        const enq = data?.collect_enqueued === true || String(data?.status || '').toLowerCase() === 'processing';
        if (enq) {
          setPendingKeys((prev) => {
            const k = new Set(prev);
            k.add(keyFor(occ.rule_id, occ.date));
            return k;
          });
          showToast('Completed — collecting payment', 5000);
        } else {
          showToast('Completed — invoice created', 5000);
        }
      } catch (e) {
        console.error('[Schedule] completeOccurrence error', e?.response?.data || e);
        showToast(e?.response?.data?.error || 'Failed to complete', 5000);
      }
    },
    [headersFn, refreshStartTimes, fetchAll, buildInvoiceIndex, occurrences, setPendingKeys, showToast, getGeoLocation]
  );

  const startWork = useCallback(
    async (occ, location, opts = {}) => {
      try {
        const propertyId = propertyIdOf(occ);
        if (!propertyId) {
          showToast('Address is required to schedule and verify work. Please add a valid address.', 5000);
          return { ok: false, error: 'missing_property_id' };
        }
        const headers = await headersFn();
        const data = await postStartWork(headers, occ.rule_id, {
          date: occ.date,
          property_id: propertyId,
          ...(opts?.overrideAlignment ? { override_alignment: true } : {}),
          ...(location ? { location } : {}),
        });
        await Promise.all([refreshStartTimes(), fetchAll()]);
        const alignmentStatus =
          data?.alignment_status || data?.alignment || data?.location_alignment || data?.location_status || null;
        const allowOverride = data?.allow_override || data?.allow_alignment_override || false;
        const alignmentMessage =
          data?.alignment_message ||
          data?.message ||
          (alignmentStatus === 'aligned' ? 'Verified arrival' : alignmentStatus === 'not_aligned' ? 'Not at job location' : '');
        if (alignmentStatus === 'aligned') {
          showToast(alignmentMessage || 'Verified arrival', 5000);
        } else if (alignmentStatus === 'not_aligned') {
          showToast(alignmentMessage || 'Not at job location', 5000);
        } else {
          showToast('Work started', 5000);
        }
        return { ok: true, alignmentStatus, allowOverride, alignmentMessage };
      } catch (e) {
        console.error('[Schedule] startWork error', e?.response?.data || e);
        const msg = e?.response?.data?.error || 'Failed to start work';
        const lower = String(msg || '').toLowerCase();
        const isMissing = lower.includes('property') && lower.includes('missing');
        showToast(
          isMissing
            ? 'Address is required to schedule and verify work. Please add a valid address.'
            : msg,
          2600
        );
        return { ok: false, error: isMissing ? 'missing_property_id' : msg };
      }
    },
    [headersFn, refreshStartTimes, fetchAll, showToast]
  );

  const quickRescheduleOccurrence = useCallback(
    async (occ, toDateYMD) => {
      try {
        if (isCancelledOcc(occ)) {
          showToast('This visit is cancelled — cannot reschedule.');
          return;
        }
        const dup = (occRef.current || []).some(
          (o) =>
            Number(o?.customer?.id) === Number(occ?.customer?.id) &&
            String(o?.date).slice(0, 10) === String(toDateYMD).slice(0, 10) &&
            Number(o?.rule_id) !== Number(occ?.rule_id)
        );
        if (dup) {
          showToast('Already scheduled for this customer on that date.', 5000);
          return;
        }
        const headers = await headersFn();
        await proposeScheduleChange(
          {
            scheduleRuleId: occ.rule_id,
            customerId: occ?.customer?.id,
            fromDate: occ.date,
            toDate: toDateYMD,
            serviceRecordId: occ?.service_record_id || null,
          },
          headers
        );
        const key = keyFor(occ.rule_id, occ.date);
        setPendingScheduleChanges((prev) => {
          const next = new Map(prev);
          next.set(key, { toDate: toDateYMD });
          return next;
        });
        showToast('Sent to customer for approval', 5000);
      } catch (e) {
        console.error('[Schedule] quickReschedule error', e?.response?.data || e);
        showToast(e?.response?.data?.error || 'Failed to reschedule', 5000);
      }
    },
    [
      headersFn,
      showToast,
    ],
  );

  const openRescheduleDirect = useCallback(
    async (occ) => {
      if (isCancelledOcc(occ)) {
        showToast('This visit is cancelled — cannot reschedule.');
        return;
      }
      const d = occ.date;
      const k = keyFor(occ.rule_id, d);
      const mins = startTimes.get(k);
      setEditOcc(occ);
      setSelectedMinutes(Number.isFinite(mins) ? mins : null);
      setSelectedTeamId(occ?.team_id ?? null);
      setResDate(d);
      setResMinutes(Number.isFinite(mins) ? mins : null);
      setResOpen(true);

      const { options, label } = buildRescheduleOptions(occ, org);
      setResOptions(options);
      setResAllowedLabel(label);

      const slots = await fetchSlots(occ, d, occ?.team_id ?? null);
      setResSlots(slots || []);
    },
    [startTimes, org, fetchSlots],
  );

  const confirmReschedule = useCallback(
    async () => {
      if (!editOcc) return;
      try {
        const dup = (occRef.current || []).some(
          (o) =>
            Number(o?.customer?.id) === Number(editOcc?.customer?.id) &&
            String(o?.date).slice(0, 10) === String(resDate).slice(0, 10) &&
            Number(o?.rule_id) !== Number(editOcc?.rule_id)
        );
        if (dup) {
          showToast('Already scheduled for this customer on that date.', 5000);
          return;
        }
        const headers = await headersFn();
        if (resDate !== editOcc.date) {
          setOccurrences((prev) =>
            (prev || []).map((o) =>
              Number(o.rule_id) === Number(editOcc.rule_id) && String(o.date).slice(0, 10) === String(editOcc.date).slice(0, 10)
                ? { ...o, date: resDate }
                : o
            )
          );
        }
        if (resDate !== editOcc.date) {
          let startMins = Number.isFinite(resMinutes) ? resMinutes : null;
          if (!Number.isFinite(startMins)) {
            const slots = await fetchSlots(
              editOcc,
              resDate,
              selectedTeamId ?? editOcc?.team_id ?? null,
            );
            startMins = Array.isArray(slots) && slots.length ? slots[0] : null;
          }
          await postReschedule(
            headers,
            editOcc.rule_id,
            {
              from_date: editOcc.date,
              to_date: resDate,
              start_minutes: startMins,
              ...(mode !== 'crew' && { team_id: selectedTeamId ?? editOcc?.team_id ?? null }),
            },
            { from: ymd(rangeFrom), to: ymd(rangeTo), return: 'window' },
          );
        } else {
          let startMins = Number.isFinite(resMinutes) ? resMinutes : null;
          if (!Number.isFinite(startMins)) {
            const slots = await fetchSlots(
              editOcc,
              resDate,
              selectedTeamId ?? editOcc?.team_id ?? null,
            );
            startMins = Array.isArray(slots) && slots.length ? slots[0] : null;
          }
          await postSetTime(headers, {
            rule_id: editOcc.rule_id,
            date: resDate,
            start_minutes: startMins,
            ...(mode !== 'crew' && { team_id: selectedTeamId ?? editOcc?.team_id ?? null }),
          });
        }

        // refresh window & state
        const dt = ymdToLocalDate(resDate);
        if (dt < rangeFrom || dt > rangeTo) {
          setRangeFrom(dt);
          setRangeTo(addDays(dt, 6));
        }
        await Promise.all([refreshStartTimes(), fetchAll()]);
        showToast('Rescheduled', 5000);

        // best-effort resolve of the active inbox item, if any
        try {
          if (activeRequest?.id) {
            const headers = await headersFn();
            await axios.post(
              `/api/owner/customer-requests/${activeRequest.id}/resolve`,
              { status: 'approved' },
              { headers, withCredentials: true }
            );
            refreshInbox();
          }
        } catch {}
        setActiveRequest(null);

        setResOpen(false);
        setEditOpen(false);
      } catch (e) {
        console.error('[Schedule] confirmReschedule error', e?.response?.data || e);
        setOccurrences(occRef.current || []);
        showToast(e?.response?.data?.error || 'Failed to reschedule', 5000);
      }
    },
    [
      headersFn,
      editOcc,
      resDate,
      resMinutes,
      selectedTeamId,
      mode,
      rangeFrom,
      rangeTo,
      setRangeFrom,
      setRangeTo,
      refreshStartTimes,
      fetchAll,
      org,
      fetchSlots,
      activeRequest,
      refreshInbox,
      showToast,
    ],
  );

  // open a request (handles cancelled: deny + hide)
  const openRequest = useCallback(
    async (req) => {
      try {
        setActiveRequest(req);
        const d = String(req.date).slice(0, 10);
        // Try to find occurrence in current window
        let occ = (occRef.current || []).find(
          (o) => String(o.date).slice(0, 10) === d && Number(o.rule_id) === Number(req.occurrence_id)
        );

        // If not visible, jump to that week and refetch
        if (!occ) {
          const dt = ymdToLocalDate(d);
          if (dt < rangeFrom || dt > rangeTo) {
            setRangeFrom(dt);
            setRangeTo(addDays(dt, 6));
          }
          await fetchAll();
          occ = (occRef.current || []).find(
            (o) => String(o.date).slice(0, 10) === d && Number(o.rule_id) === Number(req.occurrence_id)
          );
        }

        if (!occ) {
          showToast('Could not locate the requested occurrence in this range', 5000);
          return;
        }

        if (isCancelledOcc(occ)) {
          // auto-deny + remove from inbox
          showToast('This visit is cancelled — the request was denied.');
          try {
            const headers = await headersFn();
            if (req?.id) {
              await axios.post(
                `/api/owner/customer-requests/${req.id}/resolve`,
                { status: 'denied', reason: 'cancelled' },
                { headers, withCredentials: true }
              );
            }
          } catch {}
          dismiss(req?.id);
          setActiveRequest(null);
          return;
        }

        if (String(req.action) === 'reschedule') {
          await openRescheduleDirect(occ);
        } else if (String(req.action) === 'cancel') {
          await openEdit(occ);
        } else {
          await openEdit(occ);
        }
      } catch (e) {
        console.warn('[Schedule] openRequest failed', e);
        showToast('Unable to open request', 5000);
      }
    },
    [rangeFrom, rangeTo, setRangeFrom, setRangeTo, fetchAll, openRescheduleDirect, openEdit, showToast, headersFn, dismiss],
  );

  const canManageUI = canManage;

  /* Deep-link: ?inbox=1&date=YYYY-MM-DD&occurrence_id=&action= */
  const [searchParams] = useSearchParams();
  const handledDeepLinkRef = useRef(false);
  useEffect(() => {
    if (handledDeepLinkRef.current) return;
    const want = searchParams.get('inbox') === '1';
    const d = searchParams.get('date');
    const occId = searchParams.get('occurrence_id');
    const action = searchParams.get('action');
    if (!want || !d || !occId) return;
    if (loading) return; // wait for occurrences
    handledDeepLinkRef.current = true;
    setInboxExpanded(true);
    openRequest({ date: d, occurrence_id: occId, action });
  }, [searchParams, loading, openRequest]);

  // Prefer org flag from org object
  const orgCanCollect = org?.stripe_charges_enabled === true;
  useEffect(() => {
    console.log('[Schedule.jsx] orgCanCollect =', orgCanCollect);
  }, [orgCanCollect]);

  return (
    <div className="space-y-6">
      <TopBar
        title={mode === 'crew' ? 'My Team Schedule' : 'Schedule'}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onPrev={prevRange}
        onNext={nextRange}
      />

      {mode === 'crew' && (
        <TimeClockPanel role={profile?.role} />
      )}

      {canSeeRequestInbox && (pendingCount > 0 || requestLoading) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 md:p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold">
                {requestLoading ? 'Checking customer requests…' : `${pendingCount} customer request${pendingCount === 1 ? '' : 's'}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setInboxExpanded((v) => !v)}
              className="text-sm underline underline-offset-2 hover:opacity-80"
            >
              {inboxExpanded ? 'Hide' : 'Review'}
            </button>
          </div>

          {inboxExpanded && !requestLoading && pendingCount > 0 && (
            <div className="mt-3 grid gap-2">
              {displayRequests.map((r) => (
                <div
                  key={`${r.id || ''}-${r.occurrence_id || ''}-${r.date || ''}-${r.action || ''}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white/60 border border-amber-200 px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="font-medium capitalize">{String(r.action || '').toLowerCase() || 'request'}</span>
                    <span className="mx-1">•</span>
                    <span>{String(r.date).slice(0, 10)}</span>
                    {r.service_label ? <span className="mx-1 text-neutral-600">• {r.service_label}</span> : null}
                    {r.user_email ? <span className="mx-1 text-neutral-600">• {r.user_email}</span> : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openRequest(r)}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md border border-amber-300 hover:bg-amber-100"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(isOwner || isManager) && mode !== 'crew' && (
        <OwnerPanels
          teamOptions={teamOptions}
          orgBusinessHours={org?.business_hours || {}}
          onRefresh={async () => {
            await Promise.all([fetchAll(), refreshStartTimes()]);
            refreshInbox();
          }}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
        {loading ? (
          <div className="text-neutral-500">Loading…</div>
        ) : (
          <ScheduleList
            days={days}
            occurrences={occurrences}
            startTimes={startTimes}
            onOpenEdit={openEdit}
            onReschedule={openRescheduleDirect}
            onQuickReschedule={quickRescheduleOccurrence}
            onComplete={completeOccurrence}
            onStartWork={workStartEnabled && canStartWorkRole ? startWork : undefined}
            onDeleteRule={() => {}}
            canManage={canManageUI}
            statusFor={statusForOccurrence}
            invoiceFor={invoiceFor}
            isPending={(occ) => !!(occ && pendingKeys.has(keyFor(occ.rule_id, occ.date)))}
            hasCard={(occ) => detectHasCard(occ?.customer)}
            groupByTeam={groupByTeam}
            teams={teams}
            orgBusinessHours={org?.business_hours || {}}
            hideQuickDropdown={!canManageUI}
            /* pass org flag down so payment UI can show the right actions */
            orgCanCollect={orgCanCollect}
            showToast={showToast}
            showPaymentAudit={showPaymentAudit}
            pendingScheduleChanges={pendingScheduleChanges}
          />
        )}
      </div>

      {/* Lazy, incremental org/team events */}
      {['owner', 'manager', 'crew_leader', 'crew_owner'].includes(role) && (
        <OrgEventsPanel autoStart={false} windowDays={7} pageSizeHint={200} />
      )}

      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.message}
      </Toast>

      <EditTimeModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        occurrence={editOcc}
        availableSlots={availableSlots}
        selectedMinutes={selectedMinutes}
        setSelectedMinutes={setSelectedMinutes}
        selectedTeamId={selectedTeamId}
        setSelectedTeamId={setSelectedTeamId}
        teamOptions={teamOptions}
        onSave={saveEdit}
        onClearTime={clearTime}
        onCancelOccurrence={canCancelEditOcc ? cancelOccurrence : undefined}
        onOpenReschedule={() => openRescheduleDirect(editOcc)}
        onComplete={editOcc ? () => completeOccurrence(editOcc) : undefined}
        canManage={canManageUI}
        showPendingPill={!!(editOcc && pendingKeys.has(keyFor(editOcc.rule_id, editOcc.date)))}
        invoiceStatus={statusForOccurrence(editOcc || {}).status}
        hasCard={(occ) => detectHasCard(occ?.customer)}
        canCancel={canCancelEditOcc}
      />

      <RescheduleModal
        open={resOpen}
        onClose={() => setResOpen(false)}
        occurrence={editOcc}
        dateValue={resDate}
        setDateValue={setResDate}
        timeSlots={resSlots}
        timeMinutes={resMinutes}
        setTimeMinutes={setResMinutes}
        onChangeDateFetchSlots={async (_dateYMD) => {
          setResDate(_dateYMD);
          if (!editOcc) return;
          const slots = await fetchSlots(
            editOcc,
            _dateYMD,
            selectedTeamId ?? editOcc?.team_id ?? null,
          );
          setResSlots(slots || []);
          setResMinutes((prev) => (Array.isArray(slots) && slots.includes(prev) ? prev : null));
        }}
        onConfirm={confirmReschedule}
        canManage={canManageUI}
        dateOptions={resOptions}
        allowedLabel={resAllowedLabel}
      />
    </div>
  );
}

export default function Schedule(props) {
  return (
    <ScheduleErrorBoundary>
      <ScheduleInner {...props} />
    </ScheduleErrorBoundary>
  );
}
