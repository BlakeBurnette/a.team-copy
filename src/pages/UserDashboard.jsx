// src/pages/UserDashboard.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { format, addDays, startOfToday, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
  Share2,
  XCircle,
  Repeat,
  CheckCircle2,
  Bell,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RecurringAuthorizationsCard from './portal/RecurringAuthorizationsCard';
import UpcomingChargesWidget from './portal/UpcomingChargesWidget';

const ymd = (d) => format(d, 'yyyy-MM-dd');
const labelTime = (minsNullable) => {
  if (minsNullable == null) return 'Unscheduled';
  const mins = Number(minsNullable);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

const ENABLE_REFERRALS = import.meta.env.VITE_ENABLE_REFERRALS === 'true';

const hasRescheduleRequested = (item) =>
  Boolean(
    item?.flags?.reschedule_requested === true ||
      item?.status === 'reschedule_requested' ||
      item?.meta?.reschedule_requested === true
  );

/** NEW: prefer server flag, but allow meta fallback */
const hasRescheduled = (item) =>
  Boolean(item?.flags?.rescheduled === true || item?.meta?.rescheduled === true);

/** Detect cancelled occurrences on the user side */
const isCancelled = (item) => {
  const s = (v) => String(v || '').toLowerCase();
  return Boolean(
    item?.skipped ||
      item?.is_skipped ||
      item?.cancelled ||
      item?.canceled ||
      item?.flags?.cancelled === true ||
      item?.flags?.canceled === true ||
      s(item?.status) === 'cancelled' ||
      s(item?.status) === 'canceled' ||
      s(item?.state) === 'cancelled' ||
      s(item?.state) === 'canceled'
  );
};

/** Check if service is within 48 hours (cancellation not allowed) */
const isWithin48Hours = (item) => {
  if (!item?.date) return false;
  const serviceDate = parseISO(item.date);
  const now = new Date();
  const hoursUntil = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil < 48;
};

const itemKey = (it) =>
  `${it?.occurrence_id ?? ''}|${it?.date ?? ''}|${it?.service?.id ?? ''}`;

function Pill({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
         text-[11px] sm:text-xs font-medium bg-amber-100 text-amber-900
         border border-amber-200 whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

function CardShell({ title, actions, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900">{title}</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">{actions}</div>
      </div>
      <div className="h-px bg-neutral-200" />
      <div className="p-5">{children}</div>
    </div>
  );
}

function UpcomingBlock({ item, onRescheduleClick, onCancel }) {
  const c = item.customer || {};
  const svc = item.service || {};
  const start = item.start_minutes ?? null;
  const dateLabel = format(parseISO(item.date), 'MMM d @ ') + labelTime(start);

  const requested = hasRescheduleRequested(item);
  const rescheduled = !requested && hasRescheduled(item); // requested wins
  const cancelled = isCancelled(item);
  const within48 = isWithin48Hours(item);

  // which pills to show (cancelled overrides others)
  const showRequested = requested && !cancelled;
  const showRescheduled = !requested && !cancelled && rescheduled;

  const addr =
    c.street || c.city || c.state
      ? `${c.street || ''}${c.city ? `, ${c.city}` : ''}${c.state ? `, ${c.state}` : ''}`
      : null;

  return (
    <div className="rounded-xl border border-neutral-200 p-4 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-wide text-neutral-600">
              Upcoming Service
            </div>
            {showRequested && (
              <Pill className="hidden sm:inline-flex shrink-0">
                <Repeat className="w-3.5 h-3.5" />
                Reschedule requested
              </Pill>
            )}
            {showRescheduled && (
              <Pill className="hidden sm:inline-flex shrink-0 bg-green-100 text-green-900 border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Rescheduled
              </Pill>
            )}
            {cancelled && (
              <Pill className="hidden sm:inline-flex shrink-0 bg-rose-100 text-rose-900 border-rose-200">
                <XCircle className="w-3.5 h-3.5" />
                Cancelled
              </Pill>
            )}
          </div>

          <div className="mt-1 font-semibold text-neutral-900 text-lg truncate">
            {svc.label || 'Scheduled Service'}
          </div>

          {showRequested && (
            <Pill className="sm:hidden mt-2 self-start">
              <Repeat className="w-3.5 h-3.5" />
              Reschedule requested
            </Pill>
          )}
          {showRescheduled && (
            <Pill className="sm:hidden mt-2 self-start bg-green-100 text-green-900 border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Rescheduled
            </Pill>
          )}
          {cancelled && (
            <Pill className="sm:hidden mt-2 self-start bg-rose-100 text-rose-900 border-rose-200">
              <XCircle className="w-3.5 h-3.5" />
              Cancelled
            </Pill>
          )}

          <div className="mt-1 text-neutral-700 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{dateLabel}</span>
          </div>
          {addr ? (
            <div className="mt-0.5 text-neutral-700 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{addr}</span>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onRescheduleClick(item)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-neutral-50 w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
            title={cancelled ? 'This visit is cancelled' : 'Request reschedule'}
            disabled={cancelled || requested}
          >
            <Repeat className="w-4 h-4" />
            {requested ? 'Request Sent' : 'Request Reschedule'}
          </button>
          <button
            type="button"
            onClick={() => onCancel(item)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm text-red-600 hover:bg-red-50 w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
            title={cancelled ? 'Already cancelled' : within48 ? 'Cannot cancel within 48 hours' : 'Cancel'}
            disabled={cancelled || within48}
          >
            <XCircle className="w-4 h-4" />
            {cancelled ? 'Cancelled' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Bottom Sheet (Modal) ------------------------- */
function BottomSheet({ open, onClose, children, title }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl border-t border-neutral-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto w-full max-w-2xl">
          <div className="p-4">
            <div className="mx-auto mb-2 h-1.5 w-14 rounded-full bg-neutral-300" />
            {title ? <h3 className="text-lg font-semibold mb-2">{title}</h3> : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { refreshMe } = useAuth() || {};
  const navigate = useNavigate();

  const today = useMemo(() => startOfToday(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [items, setItems] = useState([]);

  const [referralUrl, setReferralUrl] = useState('');
  const didFetchReferral = useRef(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSubmitting, setSheetSubmitting] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [sheetSuccess, setSheetSuccess] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reason, setReason] = useState('');

  // Pending approvals state
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const ENABLE_SSE_RESCHEDULE_REFRESH = false;

  const authHeaders = async () => ({});

  // Fetch pending approvals that need user action
  const fetchPendingApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    try {
      const { data } = await axios.get('/api/portal/approvals', {
        withCredentials: true,
        params: { status: 'pending' },
        validateStatus: () => true,
      });
      const list = Array.isArray(data?.approvals) ? data.approvals : [];
      setPendingApprovals(list);
    } catch {
      setPendingApprovals([]);
    } finally {
      setApprovalsLoading(false);
    }
  }, []);

  // Handle approval action
  const handleApproval = async (approvalId, action) => {
    setApprovingId(approvalId);
    try {
      await axios.post(`/api/portal/approvals/${approvalId}/${action}`, {}, {
        withCredentials: true,
      });
      fetchPendingApprovals();
    } catch (e) {
      alert(e?.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setApprovingId(null);
    }
  };

  const fetchUpcoming = async () => {
    setLoading(true);
    setErr('');
    try {
      await refreshMe?.();
      const headers = await authHeaders();
      const params = { from: ymd(today), to: ymd(addDays(today, 30)) };
      const { data } = await axios.get('/api/users/upcoming-services', {
        headers,
        withCredentials: true,
        params,
      });

      const list = Array.isArray(data?.items) ? data.items : [];
      const sorted = list.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const as = a.start_minutes ?? Number.MAX_SAFE_INTEGER;
        const bs = b.start_minutes ?? Number.MAX_SAFE_INTEGER;
        return as - bs;
      });
      setItems(sorted);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load upcoming services');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  useEffect(() => {
    if (!ENABLE_REFERRALS) {
      setReferralUrl(`${window.location.origin}/r`);
      return;
    }
    if (didFetchReferral.current) return;
    didFetchReferral.current = true;

    (async () => {
      try {
        const headers = await authHeaders();
        const { data } = await axios.get('/api/users/referral-link', {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        });
        if (data && data.link) {
          setReferralUrl(data.link);
        } else {
          setReferralUrl(`${window.location.origin}/r`);
        }
      } catch {
        setReferralUrl(`${window.location.origin}/r`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    const text = 'I use this service—want to try it?';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Referral', text, url: referralUrl });
      } else {
        await navigator.clipboard.writeText(referralUrl);
        alert('Referral link copied to clipboard.');
      }
    } catch {}
  };

  const openRescheduleSheet = (item) => {
    setSelectedItem(item || null);
    setReason('');
    setSheetError('');
    setSheetSuccess(false);
    setSheetOpen(true);
  };

  const submitRescheduleRequest = async () => {
    if (!selectedItem) return;
    setSheetSubmitting(true);
    setSheetError('');
    setSheetSuccess(false);
    try {
      const headers = await authHeaders();
      const payload = {
        date: selectedItem.date,
        service_id: selectedItem?.service?.id ?? null,
        occurrence_id: selectedItem?.occurrence_id ?? null,
        reason: reason || null,
      };

      await axios.post('/api/users/request-reschedule', payload, {
        headers,
        withCredentials: true,
      });

      await fetchUpcoming();
      setSheetSuccess(true);
      setTimeout(() => setSheetOpen(false), 900);
    } catch (e) {
      setSheetError(e?.response?.data?.error || 'Failed to submit request');
    } finally {
      setSheetSubmitting(false);
    }
  };

  const handleCancel = async (item) => {
    if (!confirm('Are you sure you want to cancel this service?')) return;
    try {
      const headers = await authHeaders();
      await axios.post(
        '/api/users/cancel-service',
        {
          date: item.date,
          service_id: item?.service?.id ?? null,
          occurrence_id: item?.occurrence_id ?? null,
        },
        { headers, withCredentials: true }
      );
      fetchUpcoming();
    } catch (e) {
      const errData = e?.response?.data;
      const message = errData?.message || errData?.error || 'Failed to cancel service';
      alert(message);
    }
  };

  useEffect(() => {
    if (!ENABLE_SSE_RESCHEDULE_REFRESH || typeof window === 'undefined' || !window.EventSource)
      return;

    let es;
    (async () => {
      try {
        es = new EventSource('/api/sse');
        es.addEventListener('reschedule_granted', () => fetchUpcoming());
        es.addEventListener('schedule_updated', () => fetchUpcoming());
      } catch {}
    })();

    return () => { if (es) es.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ENABLE_SSE_RESCHEDULE_REFRESH]);

  const nextItem = items[0] || null;

  return (
    <div className="space-y-6">
      {/* Pending Approvals - Show prominently at top if any exist */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-900">
              Action Required ({pendingApprovals.length})
            </h2>
          </div>
          <div className="h-px bg-amber-200" />
          <div className="p-5 space-y-3">
            {pendingApprovals.map((approval) => {
              const id = approval.approvalRequestId;
              const scheduledDate = approval.metadata?.scheduled_date || null;
              return (
                <div
                  key={id}
                  className="bg-white rounded-xl border border-amber-200 p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-amber-700 mb-1">
                        Approval Needed
                      </div>
                      <div className="font-semibold text-neutral-900">
                        {approval.summary || approval.metadata?.service_name || 'Service Authorization'}
                      </div>
                      {approval.amountCents > 0 && (
                        <div className="text-sm text-neutral-600 mt-1">
                          Amount: ${(approval.amountCents / 100).toFixed(2)}
                        </div>
                      )}
                      {scheduledDate && (
                        <div className="text-sm text-neutral-600 flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4" />
                          Scheduled: {format(parseISO(scheduledDate), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproval(id, 'approve')}
                        disabled={approvingId === id}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {approvingId === id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproval(id, 'decline')}
                        disabled={approvingId === id}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-neutral-300 hover:bg-neutral-50 disabled:opacity-60"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => navigate('/app/user/approvals')}
              className="text-sm text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              View all approvals →
            </button>
          </div>
        </div>
      )}

      <CardShell
        title="Customer Self-Service Portal"
        actions={
          <>
            {ENABLE_REFERRALS && (
              <button
                onClick={handleShare}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border hover:bg-neutral-50 text-sm w-full sm:w-auto"
              >
                <Share2 className="w-4 h-4" />
                Refer a Friend
              </button>
            )}
            <button
              onClick={fetchUpcoming}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md ring-1 ring-amber-300/60 text-amber-800 hover:bg-amber-50 text-sm w-full sm:w-auto"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </>
        }
      >
        {loading ? (
          <div className="text-neutral-500">Loading…</div>
        ) : err ? (
          <div className="inline-flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            {err}
          </div>
        ) : !nextItem ? (
          <div className="text-neutral-700">No upcoming services.</div>
        ) : (
          <UpcomingBlock
            item={nextItem}
            onRescheduleClick={openRescheduleSheet}
            onCancel={handleCancel}
          />
        )}
      </CardShell>

      {items.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2 text-neutral-800">
            <CalendarDays className="w-5 h-5" />
            <h2 className="font-semibold">More Upcoming</h2>
          </div>
          <div className="h-px bg-neutral-200" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.slice(1).map((it, idx) => (
              <UpcomingBlock
                key={`${it.date}-${idx}-${it?.service?.id || 'svc'}`}
                item={it}
                onRescheduleClick={openRescheduleSheet}
                onCancel={handleCancel}
              />
            ))}
          </div>
        </div>
      )}

      {/* NACHA Compliance: Upcoming Charges Widget */}
      <UpcomingChargesWidget daysAhead={30} />

      {/* NACHA Compliance: Recurring Authorizations */}
      <RecurringAuthorizationsCard />

      <BottomSheet
        open={sheetOpen}
        onClose={() => !sheetSubmitting && setSheetOpen(false)}
        title="Request a Reschedule"
      >
        {selectedItem ? (
          <div className="space-y-4">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm text-neutral-800">
              <div className="font-medium">
                {selectedItem?.service?.label || 'Scheduled Service'}
              </div>
              <div className="flex items-center gap-2 mt-1 text-neutral-700">
                <Clock className="w-4 h-4" />
                <span>
                  {format(parseISO(selectedItem.date), 'EEE, MMM d')} — {labelTime(selectedItem.start_minutes)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Optional note</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-300/70 p-2 text-sm"
                rows={3}
                placeholder="e.g., Out of town that day"
                maxLength={500}
                disabled={sheetSubmitting}
              />
              <div className="text-xs text-neutral-500">
                This sends a request to your provider. They’ll pick a new time.
              </div>
            </div>

            {sheetError ? <div className="text-sm text-red-600">{sheetError}</div> : null}
            {sheetSuccess ? (
              <div className="text-sm text-green-700">Request sent. We’ll notify you when it’s rescheduled.</div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={submitRescheduleRequest}
                disabled={sheetSubmitting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {sheetSubmitting ? 'Sending…' : 'Send Request'}
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                disabled={sheetSubmitting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-neutral-300 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
