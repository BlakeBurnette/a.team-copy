// src/components/ServiceRecordTimeline.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { fetchServiceRecordEvents } from '../api/serviceRecords';

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

const labelForEvent = (t) => {
  const key = String(t || '').toUpperCase();
  const map = {
    SR_ARRIVAL_RECORDED: 'Arrived',
    SR_COMPLETION_RECORDED: 'Completed',
    SERVICE_COMPLETED: 'Completed',
    PAYMENT_SUCCEEDED: 'Payment succeeded',
    PAYMENT_FAILED: 'Payment failed',
    PAYMENT_PENDING: 'Payment pending',
    PAYMENT_CAPTURED: 'Payment captured',
    SR_SCHEDULED: 'Scheduled',
    APPROVAL_REQUESTED: 'Approval requested',
    APPROVAL_APPROVED: 'Approval approved',
    APPROVAL_DECLINED: 'Approval declined',
    SCHEDULE_CHANGE_APPLIED: 'Schedule updated',
    SCHEDULE_CHANGE_REJECTED: 'Schedule change rejected',
    ADD_ON_APPLIED: 'Add-on added to invoice',
    ADD_ON_DECLINED: 'Add-on declined',
    CAMPAIGN_OFFER_SENT: 'Offer sent',
    CAMPAIGN_OFFER_APPROVED: 'Offer approved',
    CAMPAIGN_OFFER_DECLINED: 'Offer declined',
    CHANGE_ORDER_PROPOSED: 'Change order sent for approval',
    CHANGE_ORDER_APPROVED: 'Change order approved',
    CHANGE_ORDER_DECLINED: 'Change order declined',
  };
  if (map[key]) return map[key];
  const spaced = key.replace(/_/g, ' ').toLowerCase();
  if (!spaced) return 'Event';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const CopyChip = ({ label, value, ariaLabel }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const short = value.length > 24 ? `${value.slice(0, 24)}…` : value;

  const handleCopy = async (e) => {
    e?.stopPropagation?.();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full border bg-neutral-50 text-xs text-neutral-700">
      <span className="font-medium">{label}:</span>
      <span className="font-mono text-[11px]">{short}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-800"
        aria-label={ariaLabel || `Copy ${label}`}
      >
        <Copy className="w-3 h-3" />
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};

function normalizeHashes(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((h) => (h || '').toString()).filter(Boolean);
  if (typeof input === 'string') {
    return input
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

const EventRow = ({ ev, hideNotes, hideLocationCell, serviceRecordId }) => {
  const payload = ev.payload || ev.data || ev.metadata || {};
  const locationCommitment = payload.location_commitment || payload.locationCommitment || payload.location_commitment_hash;
  const locationCell = payload.location_cell || payload.locationCell;
  const checklistSummaryHash = payload.checklist_summary_hash || payload.checklistSummaryHash;
  const photoHashes = normalizeHashes(payload.photo_hashes || payload.photoHashes);
  const notes = payload.notes || ev.notes || '';
  const summary = payload.summary || payload.description || ev.summary || '';
  const amountCents = payload.amount_cents ?? payload.amountCents ?? payload.amount ?? null;
  const currency = payload.currency || 'USD';

  const ts = ev.occurred_at || ev.created_at || ev.inserted_at || ev.timestamp;
  const eventType = String(ev.event_type || ev.type || '').toUpperCase();
  let label = labelForEvent(eventType);
  const changeOrderId =
    payload.change_order_id ||
    payload.changeOrderId ||
    payload.change_order?.id ||
    ev.change_order_id ||
    ev.changeOrderId;
  const srId = ev.service_record_id || ev.serviceRecordId || serviceRecordId;

  const fmtMoney = (cents) => {
    if (typeof cents !== 'number') return '';
    const n = cents / 100;
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
    catch { return `$${n.toFixed(2)}`; }
  };
  if (eventType === 'CHANGE_ORDER_APPROVED' && amountCents != null) {
    label = `${label} (${fmtMoney(amountCents)})`;
  }

  return (
    <li className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-neutral-800">{label}</div>
        <div className="text-xs text-neutral-500">{fmtDateTime(ts)}</div>
      </div>

      {summary ? (
        <div className="text-sm text-neutral-800">{summary}</div>
      ) : null}
      {amountCents != null ? (
        <div className="text-xs text-neutral-600">Amount: {fmtMoney(amountCents)}</div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-sm text-neutral-700">
        {locationCommitment ? (
          <CopyChip label="Location commitment" value={locationCommitment} ariaLabel="Copy location commitment" />
        ) : null}
        {checklistSummaryHash ? (
          <CopyChip label="Checklist summary" value={checklistSummaryHash} ariaLabel="Copy checklist summary hash" />
        ) : null}
        {photoHashes.length ? (
          <CopyChip
            label={`Photo hashes (${photoHashes.length})`}
            value={photoHashes.join('\n')}
            ariaLabel="Copy photo hashes"
          />
        ) : null}
        {locationCell && !hideLocationCell ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs">
            Cell: {locationCell}
          </span>
        ) : null}
        {notes && !hideNotes ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs">
            Notes: {notes}
          </span>
        ) : null}
        {changeOrderId && srId ? (
          <a
            href={`/app/service-records/${srId}?changeOrder=${changeOrderId}`}
            className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs"
          >
            View change order
          </a>
        ) : null}
      </div>
    </li>
  );
};

export default function ServiceRecordTimeline({
  serviceRecordId,
  fetchHeaders,
  status,
  hideLocationCell = false,
  hideNotes = false,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const safeHeaders = useCallback(async () => {
    try {
      if (typeof fetchHeaders === 'function') return await fetchHeaders();
      return fetchHeaders || {};
    } catch {
      return fetchHeaders || {};
    }
  }, [fetchHeaders]);

  const loadEvents = useCallback(async (opts = { silent: false }) => {
    if (!serviceRecordId) return;
    if (!opts.silent) setLoading(true);
    setError('');
    try {
      const headers = await safeHeaders();
      const data = await fetchServiceRecordEvents(serviceRecordId, headers);
      const list = Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];
      const sorted = list.slice().sort((a, b) => {
        const aTime = new Date(a.occurred_at || a.created_at || a.inserted_at || a.timestamp || 0).getTime();
        const bTime = new Date(b.occurred_at || b.created_at || b.inserted_at || b.timestamp || 0).getTime();
        return aTime - bTime;
      });
      setEvents(sorted);
    } catch (e) {
      setEvents([]);
      setError(e?.response?.data?.error || e?.message || 'Failed to load timeline');
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [safeHeaders, serviceRecordId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const lastEventAt = useMemo(() => {
    if (!events.length) return null;
    const last = events[events.length - 1];
    return last?.occurred_at || last?.created_at || last?.inserted_at || last?.timestamp || null;
  }, [events]);

  const shouldPoll = useMemo(() => {
    const s = String(status || '').toLowerCase();
    if (s === 'in_progress') return true;
    if (!lastEventAt) return false;
    const diff = Date.now() - new Date(lastEventAt).getTime();
    return diff < 2 * 60 * 1000;
  }, [lastEventAt, status]);

  // Determine completion status from status prop or events
  const isCompleted = useMemo(() => {
    const s = String(status || '').toLowerCase();
    // Check status prop for completed states
    if (['completed', 'paid', 'captured', 'succeeded'].includes(s)) return true;
    // Check events for completion event (handle both old and new event type names)
    const hasCompletionEvent = events.some((ev) => {
      const type = String(ev.event_type || ev.type || '').toUpperCase();
      return type === 'SR_COMPLETION_RECORDED' || type === 'SERVICE_COMPLETED' ||
             type === 'PAYMENT_SUCCEEDED' || type === 'PAYMENT_CAPTURED';
    });
    return hasCompletionEvent;
  }, [status, events]);

  useEffect(() => {
    if (!shouldPoll) return undefined;
    const id = setInterval(() => {
      loadEvents({ silent: true });
    }, 10000);
    return () => clearInterval(id);
  }, [loadEvents, shouldPoll]);

  return (
    <div className="border rounded-lg bg-white">
        <div className="px-3 py-2 border-b flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-neutral-800">Timeline</div>
            {shouldPoll ? (
              <div className="text-xs text-emerald-700">Live updates enabled</div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadEvents()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {/* Completion status indicator */}
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Not Completed
              </span>
            )}
          </div>
        </div>

        <ul className="divide-y">
          {loading ? (
            <li className="p-3 text-sm text-neutral-600">Loading timeline…</li>
          ) : error ? (
            <li className="p-3 text-sm text-red-600">{error}</li>
          ) : events.length === 0 ? (
            <li className="p-3 text-sm text-neutral-600">No events yet.</li>
          ) : (
            events.map((ev, idx) => (
              <EventRow
                key={ev.id || ev.event_id || `${ev.event_type}-${ev.occurred_at || ev.created_at || idx}`}
                ev={ev}
                hideNotes={hideNotes}
                hideLocationCell={hideLocationCell}
                serviceRecordId={serviceRecordId}
              />
            ))
          )}
        </ul>
    </div>
  );
}
