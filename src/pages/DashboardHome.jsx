import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { startOfToday, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast';
import { useAuth, useUserProfile } from '../context/AuthContext';
import ScheduleList from './schedule/components/ScheduleList';
import { keyFor, ymd, detectHasCard } from './schedule/scheduleUtils';
import { startSSE } from '../utils/sse';
import { FinancialSummary, QuickStats, FlaggedItemsCard } from '../components/dashboard';

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
        // No date window here; show all currently "requested"
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

/* ---------- pending approvals hook ---------- */
function usePendingApprovals(headersFn, enabled) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

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
        const { data } = await axios.get('/api/approvals/dashboard', {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        });
        const list = Array.isArray(data?.approvals) ? data.approvals : [];
        if (alive) setItems(list);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [headersFn, enabled, refreshKey]);

  return { items, loading, refresh };
}

export default function DashboardHome() {
  const { isOwner, isManager, isAdmin, isSuperAdmin, profile, user, roles: roleList } = useUserProfile() || {};
  const { refreshMe } = useAuth() || {};
  const navigate = useNavigate();
  const fetchedTodayRef = React.useRef(false);

  const role = String(profile?.role || user?.role || (Array.isArray(roleList) ? roleList[0] : '') || '').toLowerCase();
  // Hive-identity admins (isSuperAdmin) have full access like owners
  const isOwnerOrManager = isOwner || isManager || isSuperAdmin || role === 'owner' || role === 'manager';
  const canSeeInbox = ['owner', 'manager', 'crew_leader'].includes(role) || isSuperAdmin;

  const today = useMemo(() => startOfToday(), []);
  const [occurrences, setOccurrences] = useState([]);
  const [startTimes, setStartTimes] = useState(() => new Map());
  const [teams, setTeams] = useState([]);
  const [orgBusinessHours, setOrgBusinessHours] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', duration: 2400 });
  const showToast = (m, d = 2400) => setToast({ show: true, message: m, duration: d });

  const authHeaders = useCallback(async () => ({}), []);

  const fetchTeams = useCallback(async () => {
    const headers = await authHeaders();
    const { data } = await axios.get('/api/owner/teams', { headers, withCredentials: true });
    return Array.isArray(data) ? data : [];
  }, [authHeaders]);

  const fetchOrg = useCallback(async () => {
    try {
      const headers = await authHeaders();
      // Provided by routes/owner/organization.js as "/api/owner/my-organization"
      const { data } = await axios.get('/api/owner/my-organization', { headers, withCredentials: true });
      return data || null;
    } catch {
      return null;
    }
  }, [authHeaders]);

  /* ---------- inbox (same as Schedule.jsx) ---------- */
  const { items: requestItems, loading: inboxLoading } = useRequestInbox(authHeaders, canSeeInbox);
  const [inboxExpanded, setInboxExpanded] = useState(false);
  const pendingCount = requestItems.length;

  /* ---------- pending approvals ---------- */
  const { items: approvalItems, loading: approvalsLoading, refresh: refreshApprovals } = usePendingApprovals(authHeaders, isOwnerOrManager);
  const [approvalsExpanded, setApprovalsExpanded] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(null);
  const approvalsCount = approvalItems.length;

  const sendReminder = async (approvalId) => {
    setSendingReminder(approvalId);
    try {
      const headers = await authHeaders();
      const { data } = await axios.post(`/api/approvals/${approvalId}/remind`, {}, {
        headers,
        withCredentials: true,
        validateStatus: () => true,
      });
      if (data.ok) {
        showToast('Reminder sent!');
        refreshApprovals();
      } else if (data.error === 'customer_opted_out') {
        showToast(`Customer opted out of SMS. Email: ${data.customer_email || 'N/A'}`, 4000);
      } else if (data.error === 'rate_limited') {
        showToast(data.message || 'Please wait before sending another reminder', 3000);
      } else {
        showToast(data.message || 'Failed to send reminder');
      }
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  /* ---------- accounts receivable ---------- */
  const [arSummary, setArSummary] = useState(null);
  const [arLoading, setArLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!isOwnerOrManager) return;
    (async () => {
      try {
        setArLoading(true);
        const headers = await authHeaders();
        const { data } = await axios.get('/api/accounts-receivable/summary', {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        });
        if (alive) setArSummary(data);
      } catch {
        if (alive) setArSummary(null);
      } finally {
        if (alive) setArLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isOwnerOrManager, authHeaders]);

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

      const [teamsList, orgData, [occRes, svcTimesRes]] = await Promise.all([
        fetchTeams(),
        fetchOrg(),
        Promise.all([occReq, svcTimesReq]),
      ]);

      setTeams(teamsList);
      setOrgBusinessHours(orgData?.business_hours || {});

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
      setErr('Failed to load today’s schedule');
      setOccurrences([]);
      setStartTimes(new Map());
    } finally {
      setLoading(false);
    }
  }, [authHeaders, fetchTeams, fetchOrg, today]);

  useEffect(() => {
    if (isOwnerOrManager && !fetchedTodayRef.current) {
      fetchedTodayRef.current = true;
      refreshMe?.().catch(() => {});
      fetchToday();
    }
  }, [isOwnerOrManager, fetchToday, refreshMe]);

  /* -------------------- SSE: live schedule updates -------------------- */
  useEffect(() => {
    if (!isOwnerOrManager) return;

    let closer = null;
    try {
      closer = startSSE({
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
            }
          }

          // Handle invoice updates
          if (type === 'invoice_updated' || type === 'invoice_paid') {
            const invId = Number(data?.invoice_id || 0);
            const status = String(data?.status || '').toLowerCase() || null;
            const ruleId = Number(data?.rule_id || 0) || null;
            const dateYmd = (data?.date && String(data.date).slice(0, 10)) || null;

            setOccurrences((prev) => {
              if (!Array.isArray(prev)) return prev;
              let changed = false;
              const next = prev.map((o) => {
                const matchesRule = ruleId && Number(o.rule_id) === ruleId;
                const matchesDate = dateYmd ? String(o.date).slice(0, 10) === dateYmd : true;

                if (matchesRule && matchesDate) {
                  const curStatus = String(o.invoice_status || '').toLowerCase();
                  if (curStatus !== status || Number(o.invoice_id || 0) !== invId) {
                    changed = true;
                    return {
                      ...o,
                      invoice_id: invId || o.invoice_id,
                      invoice_status: status || o.invoice_status,
                    };
                  }
                }
                return o;
              });
              return changed ? next : prev;
            });
          }
        },
      });
    } catch (e) {
      console.warn('[SSE] failed to open', e);
    }
    return () => { try { closer && closer.close(); } catch {} };
  }, [isOwnerOrManager]);

  if (!isOwnerOrManager) {
    return <div className="p-6 text-neutral-600">You don’t have permission to view the owner dashboard.</div>;
  }

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

  const isPending = () => false;
  const hasCard = (occ) => detectHasCard(occ?.customer);
  const invoiceFor = (occ) => {
    const id = Number(occ?.invoice_id);
    return Number.isInteger(id) && id > 0 ? { id, status: occ?.invoice_status || null } : null;
  };

  /* ----- navigate helpers for inbox ----- */
  const goToSchedule = () => navigate('/app/schedule?inbox=1');
  const openOnSchedule = (r) => {
    const params = new URLSearchParams({
      inbox: '1',
      date: String(r?.date || '').slice(0, 10),
      occurrence_id: String(r?.occurrence_id || ''),
      action: String(r?.action || ''),
    });
    navigate(`app/schedule?${params.toString()}`);
  };

  // Handlers for ScheduleList (unchanged)
  const onReassignTeam = async (occ, teamId) => {
    try {
      const headers = await authHeaders();
      await axios.patch(`/api/schedule/${occ.rule_id}/team`, { team_id: teamId }, { headers, withCredentials: true });
      showToast('Reassigned to team');
      await fetchToday();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to reassign');
    }
  };

  const onComplete = async (occ) => {
    try {
      const headers = await authHeaders();
      await axios.post(`/api/schedule/${occ.rule_id}/complete`, { date: occ.date }, { headers, withCredentials: true });
      await fetchToday();
      showToast('Completed');
    } catch (e) {
      console.error('[DashboardHome] complete error', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Failed to complete');
    }
  };

  const onQuickReschedule = async (occ, toDate) => {
    try {
      const headers = await authHeaders();
      await axios.post(`/api/schedule/${occ.rule_id}/reschedule`, {
        from_date: occ.date, to_date: toDate,
      }, { headers, withCredentials: true });
      showToast('Rescheduled');
      await fetchToday();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to reschedule');
    }
  };

  const goToApprovals = () => navigate('/app/approvals');
  const goToAR = () => navigate('/app/payments?tab=receivables');

  const hasOutstandingAR = arSummary?.count > 0;
  const arTotal = arSummary?.total_cents ? (arSummary.total_cents / 100).toFixed(2) : '0.00';

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Schedule - Always at top */}
      <div className="bg-white rounded-xl border p-4">
        <div className="text-sm text-neutral-600">Owner</div>
        <h1 className="text-xl font-semibold">Today • All Teams</h1>
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
            canManage
            statusFor={statusFor}
            isPending={() => false}
            hasCard={hasCard}
            groupByTeam
            teams={teams}
            alwaysOpen
            enableTeamReassign
            onReassignTeam={onReassignTeam}
            onComplete={onComplete}
            onQuickReschedule={onQuickReschedule}
            invoiceFor={invoiceFor}
            orgBusinessHours={orgBusinessHours}
            hideQuickDropdown={false}
          />
        )}
      </div>

      {/* Financial Summary - Owner and super admins */}
      {(isOwner || isSuperAdmin) && (
        <FinancialSummary onARClick={goToAR} />
      )}

      {/* Quick Stats - Manager (owners/superadmins get FinancialSummary instead) */}
      {isOwnerOrManager && !isOwner && !isSuperAdmin && (
        <QuickStats
          onCustomersClick={() => navigate('/app/customers')}
          onScheduleClick={() => navigate('/app/schedule')}
          onApprovalsClick={goToApprovals}
          onARClick={goToAR}
        />
      )}

      {/* Admin: Flagged Items */}
      {isAdmin && (
        <FlaggedItemsCard
          onViewAll={goToAR}
          onItemClick={(item) => navigate(`/app/payments?tab=receivables&ar=${item.id}`)}
        />
      )}

      {/* Accounts Receivable Alert - Only show if no FinancialSummary (for managers) */}
      {isOwnerOrManager && !isOwner && !isSuperAdmin && hasOutstandingAR && (
        <div className="bg-red-50 border-l-4 border-l-red-500 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">!</span>
              </div>
              <div>
                <p className="text-lg font-bold text-red-900">
                  {arSummary.count} Outstanding Payment{arSummary.count !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700">
                  Total: ${arTotal} needs collection
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={goToAR}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Review Now →
            </button>
          </div>
        </div>
      )}

      {/* Pending approvals banner */}
      {isOwnerOrManager && (approvalsCount > 0 || approvalsLoading) && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-900 p-3 md:p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="font-semibold">
                {approvalsLoading ? 'Checking pending approvals…' : `${approvalsCount} service${approvalsCount === 1 ? '' : 's'} awaiting authorization`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToApprovals}
                className="text-sm underline underline-offset-2 hover:opacity-80"
              >
                Review approvals
              </button>
              <button
                type="button"
                onClick={() => setApprovalsExpanded((v) => !v)}
                className="text-sm underline underline-offset-2 hover:opacity-80"
              >
                {approvalsExpanded ? 'Hide' : 'Expand'}
              </button>
            </div>
          </div>

          {approvalsExpanded && !approvalsLoading && approvalsCount > 0 && (
            <div className="mt-3 grid gap-2">
              {approvalItems.map((item) => {
                const itemId = item?.approval_request_id || item?.id || Math.random();
                const customerName = item?.customer_name || item?.customer?.name || 'Unknown customer';
                const serviceLabel = item?.service_name || item?.summary || 'Service';
                const date = item?.scheduled_date || item?.date || '';
                const amount = item?.amount_cents ? `$${(item.amount_cents / 100).toFixed(2)}` : '';
                const lastReminder = item?.last_reminder_sent;
                const reminderCount = item?.reminder_count || 0;
                const canSend = item?.can_send_reminder !== false;
                const optedOut = item?.customer_opted_out === true;
                const isSending = sendingReminder === itemId;

                const formatRelative = (dateStr) => {
                  if (!dateStr) return 'Never';
                  const d = new Date(dateStr);
                  const now = new Date();
                  const diffMs = now - d;
                  const diffMins = Math.floor(diffMs / 60000);
                  if (diffMins < 60) return `${diffMins}m ago`;
                  const diffHrs = Math.floor(diffMins / 60);
                  if (diffHrs < 24) return `${diffHrs}h ago`;
                  const diffDays = Math.floor(diffHrs / 24);
                  return `${diffDays}d ago`;
                };

                return (
                  <div
                    key={itemId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white/60 border border-red-200 px-3 py-2"
                  >
                    <div className="text-sm flex-1">
                      <div>
                        <span className="font-medium">{customerName}</span>
                        <span className="mx-1">•</span>
                        <span>{serviceLabel}</span>
                        {date && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="text-neutral-600">{String(date).slice(0, 10)}</span>
                          </>
                        )}
                        {amount && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="font-medium">{amount}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {optedOut ? (
                          <span className="text-amber-600">Customer opted out of SMS • {item?.customer_email || ''}</span>
                        ) : (
                          <span>Last reminder: {formatRelative(lastReminder)} ({reminderCount} sent)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!optedOut && canSend && (
                        <button
                          type="button"
                          onClick={() => sendReminder(itemId)}
                          disabled={isSending}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md border border-amber-400 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {isSending ? 'Sending…' : 'Send Reminder'}
                        </button>
                      )}
                      {optedOut && item?.customer_email && (
                        <a
                          href={`mailto:${item.customer_email}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md border border-neutral-300 hover:bg-neutral-100"
                        >
                          Email
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={goToApprovals}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md border border-red-300 hover:bg-red-100"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inbox banner/accordion */}
      {canSeeInbox && (pendingCount > 0 || inboxLoading) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 md:p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold">
                {inboxLoading ? 'Checking customer requests…' : `${pendingCount} customer request${pendingCount === 1 ? '' : 's'}`}
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

          {inboxExpanded && !inboxLoading && pendingCount > 0 && (
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
                    {r.user_email ? <span className="mx-1 text-neutral-600">• {r.user_email}</span> : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openOnSchedule(r)}
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

      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.message}
      </Toast>
    </div>
  );
}
