import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Clock, MapPin, FileText, CheckCircle2, Link2, Loader2,
  XCircle, CalendarClock, MoreHorizontal, Phone
} from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import { PaymentStatePill, NoCardPill, AuthorizationStatusPill, RecurringPill } from './PaymentPills';
import { labelTime, keyFor } from '../scheduleUtils';
import axios from 'axios';
import PhotoUploadModal from '../../../components/PhotoUploadModal';
import SendProofModal from '../../../components/SendProofModal';
import Modal from '../../../components/Modal';

/** UTC day label */
const labelUTC = (ymdStr) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${ymdStr}T00:00:00Z`));

/** Safe local date from YYYY-MM-DD */
const ymdToLocalDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Prefer server-provided HH:MM over minutes */
const displayTime = (occ, mins) => {
  if (occ?.start_time && typeof occ.start_time === 'string') return occ.start_time;
  if (Number.isFinite(mins)) return labelTime(mins);
  return 'Unscheduled';
};

// Styles
const BTN = 'inline-flex items-center justify-center gap-2 rounded-lg h-10 px-3.5 text-sm';
const BTN_PRI = `${BTN} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed`;
const BTN_OUT = `${BTN} border bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed`;
const BTN_DANGER = `${BTN} bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed`;
const BTN_DARK = `${BTN} bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed`;
const PILL = 'inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50';

// Status helpers
const toStatus = (s) => (s ? String(s).toLowerCase().trim() : null);
const TERMINAL_SET = new Set(['paid', 'succeeded', 'refunded', 'void', 'failed', 'uncollectible']);
const isTerminal = (s) => TERMINAL_SET.has(toStatus(s));

export default function ScheduleCard({
  occ,
  mins,
  inv,                // optional { id, status } from parent
  pending,
  canManage,
  // normalized props from ScheduleList (preferred)
  hasCardProp,        // boolean
  orgCanCollect = false,
  invoice_status,     // string
  actionable,         // boolean (server- or client-derived)
  // legacy/fallbacks (kept for compatibility)
  hasCard,            // boolean legacy
  invoiceFor,         // fn(occ) -> {id,status,total_cents}
  // actions
  onQuickReschedule,
  orgBusinessHours,
  hideQuickDropdown,
  enableTeamReassign = false,
  onReassignTeam,
  teams = [],
  onSkip,
  onStartWork,
  showToast,
  showPaymentAudit = false,
  pendingScheduleChanges = new Map(),
}) {
  const navigate = useNavigate();
  const c = occ?.customer || {};
  const svc = occ?.service || {};
  const duration = occ?.duration_minutes ?? svc?.estimated_minutes ?? 60;
  const initialTimeLabel = displayTime(occ, mins);
  const property = occ?.property || {};
  const propertyId =
    property.id ||
    property.property_id ||
    occ?.property_id ||
    c?.primary_property_id ||
    c?.property_id ||
    occ?.service_location_id ||
    occ?.serviceLocationId ||
    property?.address_id ||
    property?.addressId ||
    c?.address_id ||
    c?.customer_address_id ||
    c?.addressId ||
    c?.customerAddressId ||
    null;
  const propertyAddress = useMemo(() => {
    const parts = [
      property.normalized_address,
      property.formatted_address,
      property.display_address,
      [property.street, property.city, property.state].filter(Boolean).join(', '),
      [c.street, c.city, c.state].filter(Boolean).join(', '),
    ].filter((p) => p && String(p).trim() !== '');
    const addr = parts.find(Boolean);
    if (addr) return addr;
    const zip = property.zip || c.zip || '';
    if (zip) return zip;
    return '';
  }, [property.city, property.display_address, property.formatted_address, property.normalized_address, property.state, property.street, property.zip, c.city, c.state, c.street, c.zip]);
  const missingProperty = !propertyId;
  const addressIdCandidates = useMemo(() => ({
    property_id: property.id ?? property.property_id ?? null,
    occ_property_id: occ?.property_id ?? null,
    service_location_id: occ?.service_location_id ?? occ?.serviceLocationId ?? null,
    property_address_id: property?.address_id ?? property?.addressId ?? null,
    customer_primary_property_id: c?.primary_property_id ?? c?.primaryPropertyId ?? null,
    customer_property_id: c?.property_id ?? c?.propertyId ?? null,
    customer_address_id: c?.address_id ?? c?.customer_address_id ?? c?.addressId ?? c?.customerAddressId ?? null,
  }), [property.id, property.property_id, property.address_id, property.addressId, occ?.property_id, occ?.service_location_id, occ?.serviceLocationId, c?.primary_property_id, c?.primaryPropertyId, c?.property_id, c?.propertyId, c?.address_id, c?.customer_address_id, c?.addressId, c?.customerAddressId]);
  const addressShapeHints = useMemo(() => {
    const hints = [];
    if (property?.postal_code && !property?.zip) hints.push('property.postal_code present but zip undefined');
    if (c?.postal_code && !c?.zip) hints.push('customer.postal_code present but zip undefined');
    if (property?.region && !property?.state) hints.push('property.region present but state missing');
    if (c?.region && !c?.state) hints.push('customer.region present but state missing');
    return hints;
  }, [property?.postal_code, property?.zip, property?.region, property?.state, c?.postal_code, c?.zip, c?.region, c?.state]);
  // Ignore new/optional payment summaries for UI rendering; tolerate presence without using.

  // Quick reschedule confirm
  const [quickDate, setQuickDate] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const handleRescheduleClick = () => { if (!isLocked && quickDate) setConfirmOpen(true); };
  const handleConfirm = () => { setConfirmOpen(false); onQuickReschedule?.(occ, quickDate); };

  const todayUTC = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const occDate = occ?.date;

  // Availability helpers
  const isOrgOpenOn = useCallback((d) => {
    const local = ymdToLocalDate(d);
    const key = format(local, 'EEE').toLowerCase().slice(0, 3);
    const wnd = orgBusinessHours?.[key];
    if (!wnd) return true;
    return wnd.closed !== true;
  }, [orgBusinessHours]);

  const isCustomerAvailableOn = useCallback((d) => {
    const arr = Array.isArray(c.available_days) ? c.available_days : [];
    if (!arr.length) return true;
    const localDow = ymdToLocalDate(d).getDay();
    if (typeof arr[0] === 'number') return arr.includes(localDow);
    const keys = arr.map((v) => String(v).slice(0, 3).toLowerCase());
    const key = format(ymdToLocalDate(d), 'EEE').toLowerCase().slice(0, 3);
    return keys.includes(key);
  }, [c?.available_days]);

  const dayOptions = useMemo(() => {
    const base = new Date(`${todayUTC}T00:00:00Z`);
    const out = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + i);
      const value = d.toISOString().slice(0, 10);
      if (value < todayUTC) continue;
      if (value === occDate) continue;
      if (!isOrgOpenOn(value)) continue;
      if (!isCustomerAvailableOn(value)) continue;
      out.push({ value, label: labelUTC(value) });
    }
    return out;
  }, [occDate, todayUTC, isOrgOpenOn, isCustomerAvailableOn]);

  const selectedLabel = useMemo(
    () => dayOptions.find((o) => o.value === quickDate)?.label || '',
    [dayOptions, quickDate]
  );

  const [serviceRecord, setServiceRecord] = useState(null); // persist latest returned record info
  const [auditOpen, setAuditOpen] = useState(false);

  // Invoices (normalize + local seed)
  const [localInvoice, setLocalInvoice] = useState(null); // {id, status}
  const invFromWindowRaw = typeof invoiceFor === 'function' ? invoiceFor(occ) : null;

  const toInvId = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
  const invIdFromWindow = toInvId(invFromWindowRaw?.id ?? invFromWindowRaw?.invoice_id);
  const invIdFromOcc    = toInvId(occ?.invoice_id);
  const invIdLocal      = toInvId(localInvoice?.id);
  const invIdFromProp   = toInvId(inv?.id);
  const invIdAuthoritative = invIdFromWindow ?? invIdFromOcc ?? invIdLocal ?? invIdFromProp;
  const hasInvoice = invIdAuthoritative != null;

  // Status resolution (prefer incoming normalized prop, then window/prop/local, with monotonic terminal)
  const statusIndex = useMemo(() => {
    const s =
      invoice_status ??
      invFromWindowRaw?.status ?? invFromWindowRaw?.invoice_status ??
      inv?.status ?? inv?.invoice_status ??
      occ?.invoice_status ?? null;
    return toStatus(s);
  }, [invoice_status, invFromWindowRaw?.status, invFromWindowRaw?.invoice_status, inv?.status, inv?.invoice_status, occ?.invoice_status]);

  const statusLocal = toStatus(localInvoice?.status); // optimistic

  const [stickyTerminal, setStickyTerminal] = useState(null);
  const lastInvoiceIdRef = useRef(invIdAuthoritative || null);

  useEffect(() => {
    const cur = invIdAuthoritative || null;
    if (lastInvoiceIdRef.current !== cur) {
      lastInvoiceIdRef.current = cur;
      setStickyTerminal(null);
      setLocalInvoice((prev) => (prev?.id && prev.id !== cur ? null : prev));
    }
  }, [invIdAuthoritative]);

  const invoiceStatus = useMemo(() => {
    if (!hasInvoice) return null;
    let candidate = statusIndex && statusIndex !== 'processing'
      ? statusIndex
      : (statusLocal || statusIndex || null);
    if (stickyTerminal && !isTerminal(candidate)) return stickyTerminal;
    return candidate;
  }, [hasInvoice, statusIndex, statusLocal, stickyTerminal]);

  useEffect(() => {
    if (!hasInvoice) return;
    if (invoiceStatus && isTerminal(invoiceStatus)) {
      setStickyTerminal((prev) => (prev && prev === invoiceStatus ? prev : invoiceStatus));
    }
  }, [hasInvoice, invoiceStatus]);

  const invObj = hasInvoice ? { id: invIdAuthoritative, status: invoiceStatus } : null;
  const serviceRecordId =
    occ?.service_record_id ||
    serviceRecord?.id ||
    invObj?.service_record_id ||
    invFromWindowRaw?.service_record_id ||
    inv?.service_record_id ||
    null;
  const paymentStatus = toStatus(
    serviceRecord?.payment_state ||
    serviceRecord?.payment_status ||
    occ?.payment_status ||
    invoiceStatus
  );
  const latestHash = useMemo(() => {
    const list = Array.isArray(occ?.service_record_hashes) ? occ.service_record_hashes : [];
    let latest = null;
    if (list.length) {
      latest = list.reduce((acc, cur) => {
        if (!acc) return cur;
        const av = Number(acc.version_no || acc.version || 0);
        const cv = Number(cur.version_no || cur.version || 0);
        return cv > av ? cur : acc;
      }, null);
    }
    const hash =
      occ?.trust_hash_hex ||
      occ?.service_record_hash_hex ||
      latest?.hash_hex ||
      null;
    const version =
      occ?.trust_hash_version ||
      occ?.service_record_hash_version ||
      latest?.version_no ||
      latest?.version ||
      null;
    return { hash, version };
  }, [occ?.trust_hash_hex, occ?.service_record_hash_hex, occ?.service_record_hashes, occ?.trust_hash_version, occ?.service_record_hash_version]);
  const shortHash = latestHash.hash ? `${String(latestHash.hash).slice(0, 6)}…` : null;
  const auditDetails = useMemo(() => {
    return {
      paymentStatus: paymentStatus || invoiceStatus || null,
      invoiceId: invIdAuthoritative || occ?.invoice_id || null,
      serviceRecordId,
      trustHash: occ?.trust_hash_hex || latestHash.hash || null,
      ledgerJournalId: occ?.ledger_journal_id || null,
      blockHeight: occ?.block_height ?? null,
      sealedAt: occ?.sealed_at ?? null,
    };
  }, [paymentStatus, invoiceStatus, invIdAuthoritative, occ?.invoice_id, serviceRecordId, occ?.trust_hash_hex, occ?.ledger_journal_id, occ?.block_height, occ?.sealed_at, latestHash.hash]);
  const recordLabel = serviceRecordId
    ? (shortHash ? `Proof • ${shortHash}` : 'Service Record')
    : null;

  // Amount
  const amountCents = useMemo(() => {
    const fromIdx = Number(invFromWindowRaw?.total_cents);
    if (Number.isFinite(fromIdx) && fromIdx >= 0) return fromIdx;
    const fromOcc = Number(occ?.invoice_total_cents);
    if (Number.isFinite(fromOcc) && fromOcc >= 0) return fromOcc;
    const fromSvc = Number(svc?.price_cents);
    if (Number.isFinite(fromSvc) && fromSvc >= 0) return fromSvc;
    return null;
  }, [invFromWindowRaw?.total_cents, occ?.invoice_total_cents, svc?.price_cents]);

  const amountLabel = amountCents != null ? `$${(amountCents / 100).toFixed(2)}` : null;

  // Visibility
  const completedByStatus = (() => {
    const s = String(paymentStatus || invoiceStatus || occ?.invoice_status || '').toLowerCase();
    return ['paid', 'processing', 'finalized', 'completed', 'succeeded', 'void', 'refunded'].includes(s);
  })();
  // Note: serviceRecordId alone doesn't mean completed - for one-off services, records are created
  // before completion to track authorization. Check explicit completion flag or payment status.
  const isCompleted = Boolean(occ?.is_completed) || completedByStatus;
  const isLocked = isCompleted === true;

  // Authorization gate: block completion if awaiting approval
  const authStatus = toStatus(occ?.authorization_status || occ?.auth_status);
  const needsAuthorization = authStatus && !['authorized', 'not_required', 'not_needed'].includes(authStatus);
  const authorizationBlocked = needsAuthorization === true;
  const authBlockMessage = authStatus === 'pending'
    ? 'This service requires customer authorization before it can be completed.'
    : authStatus === 'declined'
    ? 'Customer declined authorization for this service.'
    : authStatus === 'expired'
    ? 'Authorization request expired. Customer must re-approve before completion.'
    : 'Service is not authorized for completion.';

  const supportsStartWork = !!onStartWork && !!actionable && !isLocked && !pending && !started;
  const showActionsRow = !hideQuickDropdown && canManage;
  const showComplete = showActionsRow && !isCompleted;

  // Final hasCard (prefer normalized prop, then legacy prop, then occ.customer flag)
  const hasCardFinal = (hasCardProp !== undefined ? hasCardProp : hasCard) ?? Boolean(c?.has_card_on_file);

  // Payments / messages
  const [charging, setCharging] = useState(false);
  const [linking, setLinking] = useState(false);
  const [msg, setMsg] = useState('');
  const [skipped, setSkipped] = useState(false);
  const [alignmentStatus, setAlignmentStatus] = useState(
    occ?.location_alignment || occ?.alignment_status || occ?.geo_alignment || null
  );
  const [alignmentMessage, setAlignmentMessage] = useState('');
  const [allowAlignmentOverride, setAllowAlignmentOverride] = useState(false);
  const [overridePrompt, setOverridePrompt] = useState(false);
  const [missingPropertyMsg, setMissingPropertyMsg] = useState(
    missingProperty ? 'Address is required to schedule and verify work. Please add a valid address.' : ''
  );
  const notify = useCallback((text, duration = 5000) => {
    if (typeof showToast === 'function') {
      showToast(text, duration);
    } else {
      setMsg(text);
      setTimeout(() => setMsg(''), duration);
    }
  }, [showToast]);

  // loading states for SMS
  const [onMyWayBusy, setOnMyWayBusy] = useState(false);
  const [arrivingNowBusy, setArrivingNowBusy] = useState(false);
  const [seriesBusy, setSeriesBusy] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  // Approval reminder info from occ
  const approvalRequestId = occ?.approval_request_id || null;
  const canSendReminder = occ?.can_send_reminder !== false;
  const customerOptedOut = occ?.customer_opted_out === true;
  const lastReminderSent = occ?.last_reminder_sent || null;
  const reminderCount = occ?.reminder_count || 0;

  const sendApprovalReminder = useCallback(async () => {
    if (!approvalRequestId || reminderBusy) return;
    setReminderBusy(true);
    try {
      const { data } = await axios.post(`/api/approvals/${approvalRequestId}/remind`, {}, {
        withCredentials: true,
        validateStatus: () => true,
      });
      if (data.ok) {
        notify('Reminder sent!');
      } else if (data.error === 'customer_opted_out') {
        notify(`Customer opted out of SMS. Email: ${data.customer_email || c?.email || 'N/A'}`, 5000);
      } else if (data.error === 'rate_limited') {
        notify(data.message || 'Please wait before sending another reminder', 5000);
      } else {
        notify(data.message || 'Failed to send reminder');
      }
    } catch (e) {
      notify(e?.response?.data?.message || 'Failed to send reminder');
    } finally {
      setReminderBusy(false);
    }
  }, [approvalRequestId, reminderBusy, notify, c?.email]);

  // Local "pending" cache (survives remount via window.__payPending)
  const [pendingLocal, setPendingLocal] = useState(false);
  const actionsMenuRef = useRef(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [sending, setSending] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [locationNote, setLocationNote] = useState('');
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

  const authHeader = useMemo(
    () => ({}),
    []
  );

  const ACTIONABLE = useMemo(
    () => new Set(['open', 'sent', 'processing', 'failed', 'unpaid', 'scheduled', 'draft']),
    []
  );
  const isPaidLike = ['paid', 'succeeded', 'void', 'refunded', 'uncollectible'].includes(invoiceStatus || '');

  const completionMessage = useCallback((state, balanceCents) => {
    const stateNorm = String(state || '').toLowerCase();
    const balance = Number(balanceCents || 0);
    if (stateNorm === 'succeeded' || stateNorm === 'paid' || isPaidLike) return 'Service completed and paid';
    if (stateNorm === 'not_required') return 'Service completed — no payment required';
    if (['requires_payment_method', 'requires_action'].includes(stateNorm)) {
      return 'Service completed — payment link sent to customer';
    }
    if (stateNorm === 'failed' && balance > 0) {
      return 'Service completed — payment link sent to customer';
    }
    return 'Service completed';
  }, [isPaidLike]);

  const showPayLink = canManage && !isPaidLike;
  const showCharge = false; // Complete handles charging
  const showSchedulingBlock = showActionsRow && !isLocked;
  const showBillingBlock = canManage && !isPaidLike;

  // Single concise visibility log
  useEffect(() => {
    try {
      const idStr = `occ rule=${occ?.rule_id} cust=${occ?.customer?.id} date=${occ?.date}`;
      console.log('[ScheduleCard] payment-visibility', {
        idStr,
        canManage,
        invoice_id: invObj?.id ?? null,
        invoice_status: invoiceStatus,
        actionable: invoiceStatus ? ACTIONABLE.has(invoiceStatus) : true,
        isPaidLike,
        hasCardProp: hasCardFinal,
        orgCanCollect,
        showPayLink,
        showCharge,
        isLocked,
        showSchedulingBlock,
        showBillingBlock,
      });
    } catch {}
  }, [occ?.rule_id, occ?.customer?.id, occ?.date, canManage, invObj?.id, invoiceStatus, hasCardFinal, orgCanCollect, showPayLink, showCharge, isLocked, showSchedulingBlock, showBillingBlock, ACTIONABLE, isPaidLike]);

  // Dev-only: surface which fields caused the address banner to render
  useEffect(() => {
    const isProd = (typeof import.meta !== 'undefined' && import.meta.env?.PROD === true) ||
      (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production');
    if (isProd || !missingProperty) return;
    try {
      const addressStrings = {
        normalized_address: property?.normalized_address,
        formatted_address: property?.formatted_address,
        display_address: property?.display_address,
        property_street_line: [property?.street || property?.line1, property?.city, property?.state, property?.zip || property?.postal_code].filter(Boolean).join(', '),
        customer_street_line: [c?.street || c?.line1, c?.city, c?.state, c?.zip || c?.postal_code].filter(Boolean).join(', '),
      };
      console.warn('[ScheduleCard] address-required', {
        requestId: occ?.id ?? occ?.schedule_id ?? null,
        rule_id: occ?.rule_id,
        date: occ?.date,
        customer_id: c?.id,
        propertyId,
        addressIdCandidates,
        addressStrings,
        shapeWarnings: addressShapeHints,
      });
    } catch {}
  }, [missingProperty, occ?.id, occ?.schedule_id, occ?.rule_id, occ?.date, c?.id, propertyId, addressIdCandidates, addressShapeHints, property?.normalized_address, property?.formatted_address, property?.display_address, property?.street, property?.line1, property?.city, property?.state, property?.zip, property?.postal_code, c?.street, c?.line1, c?.city, c?.state, c?.zip, c?.postal_code]);

  // Keep a tiny global "pending" memory by invoice id (survives remounts)
  const globalPending = (() => {
    if (typeof window === 'undefined' || !invObj?.id) return false;
    window.__payPending = window.__payPending || {};
    return !!window.__payPending[invObj.id];
  })();

  // Sync local/global pending and local invoice cache when status is terminal
  useEffect(() => {
    if (typeof window === 'undefined' || !invObj?.id) return;
    window.__payPending = window.__payPending || {};
    if (invoiceStatus && invoiceStatus !== 'processing') {
      delete window.__payPending[invObj.id];
      setPendingLocal(false);
      setLocalInvoice((prev) => {
        const prevId = Number(prev?.id || 0);
        if (prevId === invObj.id && prev?.status !== invoiceStatus) {
          return { id: invObj.id, status: invoiceStatus };
        }
        if (!prev && invoiceStatus) return { id: invObj.id, status: invoiceStatus };
        return prev;
      });
    }
  }, [invObj?.id, invoiceStatus]);

  // Seed invoice
  const createInvoice = useCallback(async () => {
    if (!occ?.rule_id || !occ?.date) return null;
    setMsg('');
    try {
      const { data } = await axios.post(
        `/api/schedule/${occ.rule_id}/seed-invoice`,
        { date: occ.date },
        { headers: authHeader, withCredentials: true }
      );
      const id = toInvId(data?.invoice_id);
      const status = toStatus(data?.status) || 'scheduled';
      if (id) {
        setLocalInvoice({ id, status });
        setMsg('Invoice created');
        return id;
      } else {
        setMsg('Failed to create invoice');
        return null;
      }
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to create invoice');
      return null;
    } finally {
      setTimeout(() => setMsg(''), 5000);
    }
  }, [occ?.rule_id, occ?.date, authHeader]);

  const ensureInvoiceId = useCallback(async () => {
    if (invObj?.id) return invObj.id;
    const id = await createInvoice();
    return id || null;
  }, [invObj?.id, createInvoice]);

  const sendPayLink = useCallback(async () => {
    let id = invObj?.id;
    if (!id) {
      id = await ensureInvoiceId();
      if (!id) return;
    }
    setLinking(true); setMsg('');
    try {
      const { data } = await axios.get(`/api/invoices/${id}/paylink`, { headers: authHeader, withCredentials: true });
      if (data?.paid) {
        setLocalInvoice({ id, status: 'paid' });
        setMsg('Invoice already paid');
        return;
      }
      if (data?.paylink) {
        try { window.open(data.paylink, '_blank', 'noopener,noreferrer'); } catch {}
        try { await navigator.clipboard.writeText(data.paylink); setMsg('Pay link opened & copied'); }
        catch { setMsg('Pay link opened'); }
      } else setMsg('Failed to create pay link');
    } catch (e) {
      const code = e?.response?.data?.code;
      if (code === 'invoice_not_payable' || e?.response?.status === 409) {
        setMsg('Invoice not payable or already paid');
        try {
          const refreshed = await axios.get(`/api/invoices/${id}`, { headers: authHeader, withCredentials: true });
          const status = toStatus(refreshed?.data?.status);
          if (status) setLocalInvoice({ id, status });
        } catch {}
      } else {
        setMsg(e?.response?.data?.error || e?.message || 'Failed to create pay link');
      }
    } finally {
      setLinking(false); setTimeout(() => setMsg(''), 5000);
    }
  }, [invObj?.id, ensureInvoiceId, authHeader, invoiceStatus]);

  // Cancel/skip
  const cancelThisDate = useCallback(async () => {
    if (!occ?.rule_id || !occ?.date) return;
    if (isPaidLike) { setMsg('Already paid — reschedule instead'); return; }

    const isOneOff = occ?.pattern === 'once';
    const confirmMsg = isOneOff
      ? 'Cancel this service? This will also cancel any pending approval request.'
      : 'Cancel this specific date for this customer?';
    if (!confirm(confirmMsg)) return;

    setMsg('');
    try {
      try {
        await axios.post(
          `/api/schedule/${occ.rule_id}/cancel`,
          { date: occ.date },
          { headers: authHeader, withCredentials: true }
        );
      } catch (err) {
        if (err?.response?.status === 404) {
          await axios.post(
            `/api/schedule/${occ.rule_id}/skip`,
            { date: occ.date },
            { headers: authHeader, withCredentials: true }
          );
        } else {
          throw err;
        }
      }
      setSkipped(true);
      setMsg(isOneOff ? 'Service cancelled' : 'Date cancelled');
      try { onSkip?.({ rule_id: occ.rule_id, date: occ.date, isOneOff }); } catch {}
    } catch (e) {
      const m =
        (e?.response?.status === 409 && (e?.response?.data?.error || e?.response?.data?.message)) ||
        e?.response?.data?.error ||
        'Failed to cancel';
      setMsg(m);
    } finally {
      setTimeout(() => setMsg(''), 5000);
    }
  }, [occ?.rule_id, occ?.date, occ?.pattern, authHeader, isPaidLike, onSkip]);

  // Time & team
  const [timeInput, setTimeInput] = useState(() => {
    if (occ?.start_time && /^\d{2}:\d{2}$/.test(occ.start_time)) return occ.start_time;
    if (!Number.isFinite(mins)) return '';
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [localStartLabel, setLocalStartLabel] = useState(initialTimeLabel);
  const [teamForDate, setTeamForDate] = useState(() => Number(occ?.team_id ?? occ?.team?.id ?? '') || '');
  const teamOpts = useMemo(
    () => (Array.isArray(teams) ? teams.map(t => ({ value: Number(t.id), label: t.name || `Team ${t.id}` })) : []),
    [teams]
  );
  const [applyTeamScope, setApplyTeamScope] = useState('date'); // 'date' | 'rule'

  const scheduleTime = useCallback(async () => {
    if (isLocked) return;
    if (!occ?.rule_id || !occ?.date) return;
    if (!timeInput && teamForDate === '' && applyTeamScope !== 'rule') return;
    setMsg('');
    try {
      const payload = { rule_id: occ.rule_id, date: occ.date };
      if (timeInput) payload.start_time = timeInput;
      if (teamForDate === '') payload.team_id = null;
      else if (!Number.isNaN(Number(teamForDate))) payload.team_id = Number(teamForDate);
      payload.apply_team_to = applyTeamScope;

      const { data } = await axios.post('/api/schedule/set-time', payload, { headers: authHeader, withCredentials: true });

      if (typeof data?.start_time === 'string' && /^\d{2}:\d{2}$/.test(data.start_time)) {
        setTimeInput(data.start_time);
        setLocalStartLabel(data.start_time);
      } else if (data?.start_minutes != null) {
        const minsNew = Number(data.start_minutes);
        const hh = String(Math.floor(minsNew / 60)).padStart(2, '0');
        const mm = String(minsNew % 60).padStart(2, '0');
        setTimeInput(`${hh}:${mm}`);
        setLocalStartLabel(labelTime(minsNew));
      }
      setMsg('Time saved');
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to save time');
    } finally {
      setTimeout(() => setMsg(''), 5000);
    }
  }, [occ?.rule_id, occ?.date, timeInput, teamForDate, applyTeamScope, authHeader, isLocked]);

  const timeLabel = localStartLabel;

  // One accordion state
  const [actionsOpen, setActionsOpen] = useState(false);

  // Send "On My Way" SMS (no completion, no invoice changes)
  const sendOnMyWay = useCallback(async () => {
    if (!occ?.rule_id || !occ?.date || onMyWayBusy) return;
    setOnMyWayBusy(true);
    setMsg('');
    try {
      await axios.post(
        `/api/schedule/${occ.rule_id}/on-my-way`,
        { date: occ.date },
        { headers: authHeader, withCredentials: true }
      );
      setMsg('On my way text sent');
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to send on my way text');
    } finally {
      setTimeout(() => setMsg(''), 5000);
      setOnMyWayBusy(false);
    }
  }, [occ?.rule_id, occ?.date, authHeader, onMyWayBusy]);

  // Send "Arriving now" SMS (no completion, no invoice changes)
  const sendArrivingNow = useCallback(async () => {
    if (!occ?.rule_id || !occ?.date || arrivingNowBusy) return;
    setArrivingNowBusy(true);
    setMsg('');
    try {
      const { location, error } = await getGeoLocation();
      const payload = { date: occ.date, ...(location ? { location } : {}) };
      await axios.post(
        `/api/schedule/${occ.rule_id}/arriving-now`,
        payload,
        { headers: authHeader, withCredentials: true }
      );
      if (error) setLocationNote('Location unavailable — status sent without it.');
      else setLocationNote('');
      setMsg(location ? 'Arriving now text sent' : 'Arriving now text sent (no location)');
      if (error === 'denied') setLocationModalOpen(true);
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to send arriving now text');
    } finally {
      setTimeout(() => setMsg(''), 5000);
      setArrivingNowBusy(false);
    }
  }, [occ?.rule_id, occ?.date, authHeader, arrivingNowBusy, getGeoLocation]);

  // Start work (with optional location)
  const runStartWork = useCallback(async (overrideAlignment = false) => {
    if (!supportsStartWork || sending || requestingLocation) return;
    if (!propertyId) {
      const text = 'Address is required to schedule and verify work. Please add a valid address.';
      setMissingPropertyMsg(text);
      notify(text, 5000);
      return;
    }

    const proceed = async (loc, opts = {}) => {
      try {
        setSending(true);
        if (loc) setLocationNote('');
        const res = await onStartWork?.(occ, loc || null, { overrideAlignment: !!opts.overrideAlignment });
        if (res?.alignmentStatus) {
          const status = res.alignmentStatus;
          const text =
            res.alignmentMessage ||
            (status === 'aligned' ? 'Verified arrival' : status === 'not_aligned' ? 'Not at job location' : '');
          setAlignmentStatus(status);
          setAlignmentMessage(text);
          setAllowAlignmentOverride(Boolean(res.allowOverride && status === 'not_aligned'));
        }
        if (res?.alignmentStatus === 'not_aligned' && res?.allowOverride && !opts.overrideAlignment) {
          setOverridePrompt(true);
          return;
        }
        if (res?.ok !== false) setStarted(true);
        setOverridePrompt(false);
      } finally {
        setSending(false);
      }
    };

    const fallbackNoLocation = async (warn) => {
      if (warn) notify('Location unavailable — starting without it', 5000);
      setLocationNote('Location unavailable — proceeding without location.');
      await proceed(null, { overrideAlignment });
    };

    const handlePermissionDenied = () => {
      notify('Location permission denied. See how to enable.', 5000);
      setLocationModalOpen(true);
      fallbackNoLocation(true);
    };

    try {
      setRequestingLocation(true);
      const perm = navigator?.permissions?.query ? await navigator.permissions.query({ name: 'geolocation' }).catch(() => null) : null;
      if (perm && perm.state === 'denied') {
        handlePermissionDenied();
        return;
      }

      const runGeo = () => new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy_m: pos.coords.accuracy,
            };
            resolve(loc);
          },
          (err) => {
            if (err?.code === 1) {
              handlePermissionDenied();
            } else {
              notify("Couldn't get location. Starting without it.", 5000);
              fallbackNoLocation(false);
            }
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      });

      const loc = await runGeo();
      if (loc) {
        await proceed(loc, { overrideAlignment });
      } else {
        await fallbackNoLocation(false);
      }
    } catch (e) {
      notify('Location unavailable — starting without it', 5000);
      await fallbackNoLocation(false);
    } finally {
      setRequestingLocation(false);
    }
  }, [supportsStartWork, sending, requestingLocation, onStartWork, occ, propertyId, notify]);

  const handleStartWork = useCallback(() => runStartWork(false), [runStartWork]);
  const handleOverrideStart = useCallback(() => runStartWork(true), [runStartWork]);
  const endSeries = useCallback(async () => {
    if (!occ?.rule_id) return;
    setSeriesBusy(true);
    try {
      await axios.post(
        `/api/schedule/${occ.rule_id}/end`,
        { end_date: occ.date },
        { headers: authHeader, withCredentials: true }
      );
      notify('Series ended — future occurrences cancelled', 5000);
    } catch (e) {
      notify(e?.response?.data?.error || 'Failed to end series', 5000);
    } finally {
      setSeriesBusy(false);
    }
  }, [occ?.rule_id, authHeader, notify]);

  const deleteSeries = useCallback(async () => {
    if (!occ?.rule_id) return;
    if (!confirm('Delete this series and all future occurrences?')) return;
    setSeriesBusy(true);
    try {
      await axios.delete(
        `/api/schedule/${occ.rule_id}`,
        { headers: authHeader, withCredentials: true, params: { from_date: occ.date } }
      );
      notify('Series deleted', 5000);
      setSkipped(true);
    } catch (e) {
      notify(e?.response?.data?.error || 'Failed to delete series', 5000);
    } finally {
      setSeriesBusy(false);
    }
  }, [occ?.rule_id, authHeader, notify]);

  // ==== Complete flows (UPDATED with Temporal guard) ====
  const completeAndCharge = useCallback(async (opts = {}) => {
    if (!occ?.rule_id || !occ?.date || charging) return;
    if (!propertyId) {
      setMsg('Address is required to schedule and verify work. Please add a valid address.');
      setTimeout(() => setMsg(''), 5000);
      return;
    }
    setCharging(true);
    setMsg('');
    const checklist = opts?.checklist;
    try {
      const { location, error: geoErr } = await getGeoLocation();
      if (geoErr) setLocationNote('Location unavailable — completion recorded without location.');
      else setLocationNote('');

      // 1) Complete (server may enqueue Temporal + return processing)
      const { data } = await axios.post(
        `/api/schedule/${occ.rule_id}/complete`,
        { date: occ.date, collect: true, property_id: propertyId, ...(checklist ? { checklist } : {}), ...(location ? { location } : {}) },
        { headers: authHeader, withCredentials: true }
      );

      const invId = Number(data?.invoice_id);
      const srId = data?.service_record_id || data?.serviceRecordId || data?.service_record?.id || null;
      const paymentState = data?.payment_state || data?.paymentStatus || null;
      const balanceCents = Number(data?.balance_cents ?? data?.balanceCents);
      if (srId) setServiceRecord({ id: srId, payment_state: paymentState, balance_cents: balanceCents });
      const defaultMsg = completionMessage(paymentState, balanceCents);
      const normalizedStatus = toStatus(data?.status) || 'scheduled';
      if (Number.isFinite(invId)) {
        setLocalInvoice({ id: invId, status: normalizedStatus });
      }

      // 2) If server already handed off to Temporal, DON'T try to pay here
      if (data?.collect_enqueued === true || normalizedStatus === 'processing' || data?.via === 'temporal') {
        if (Number.isFinite(invId)) {
          setPendingLocal(true);
          if (typeof window !== 'undefined') {
            window.__payPending = window.__payPending || {};
            window.__payPending[invId] = true;
          }
        }
        setMsg('Service completed — processing payment');
        return; // ⬅️ critical: avoid double charge
      }

      // 3) If no invoice, already paid, or org/cust not ready — bail gracefully
      if (!Number.isFinite(invId)) { setMsg(defaultMsg); return; }
      if (paymentState === 'succeeded' || isPaidLike) { setMsg(defaultMsg); return; }
      if (paymentState === 'not_required') { setMsg(defaultMsg); return; }
      if (orgCanCollect === false) { setMsg('Service completed — payments not enabled'); return; }
      if (hasCardFinal !== true) {
        setMsg('Service completed — payment link sent to customer');
        return;
      }

      // 4) Legacy local charge path (only if not enqueued to Temporal)
      try {
        try {
          await axios.post(`/api/invoices/${invId}/pay`, {}, { headers: authHeader, withCredentials: true });
        } catch (e) {
          if (e?.response?.status === 404) {
            await axios.post(`/api/invoices/${invId}/collect`, {}, { headers: authHeader, withCredentials: true });
          } else {
            throw e;
          }
        }
        setLocalInvoice({ id: invId, status: 'processing' });
        setPendingLocal(true);
        if (typeof window !== 'undefined') {
          window.__payPending = window.__payPending || {};
          window.__payPending[invId] = true;
        }
        setMsg('Service completed and paid');
      } catch (e) {
        if (e?.response?.data?.error === 'org_not_charge_ready') {
          setMsg('Service completed — payments not enabled');
        } else {
          const requires = e?.response?.data?.requires_action;
          const text = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Charge failed';
          setMsg(requires ? 'Service completed — customer action needed' : text);
        }
      }
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to complete service');
    } finally {
      setTimeout(() => setMsg(''), 5000);
      setCharging(false);
    }
  }, [occ?.rule_id, occ?.date, authHeader, charging, orgCanCollect, hasCardFinal, isPaidLike, completionMessage, getGeoLocation]);

  useEffect(() => {
    setStarted(false);
  }, [occ?.rule_id, occ?.date]);
  useEffect(() => { setLocationNote(''); }, [occ?.rule_id, occ?.date]);
  useEffect(() => {
    const onClickAway = (e) => {
      if (!actionsOpen) return;
      if (actionsMenuRef.current?.contains(e.target)) return;
      setActionsOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [actionsOpen]);

  // ---- Photo-upload gating before completion ----
  const [photosOpen, setPhotosOpen] = useState(false);
  const [afterPhotosAction, setAfterPhotosAction] = useState(null); // () => Promise<void>
  const [sendProofOpen, setSendProofOpen] = useState(false);
  const [sendProofSrId, setSendProofSrId] = useState(null);

  // Pending indicator — respect stickyTerminal (don't show spinner if we're terminal)
  const pendingUI = Boolean(
    !stickyTerminal && (pending || charging || (invoiceStatus === 'processing') || pendingLocal || globalPending)
  );
  const pendingScheduleChange = useMemo(
    () => (pendingScheduleChanges instanceof Map
      ? pendingScheduleChanges.get(keyFor(occ?.rule_id, occ?.date))
      : null),
    [pendingScheduleChanges, occ?.rule_id, occ?.date]
  );

  // Remove card after a successful skip (must be after all hooks)
  if (skipped) return null;

  return (
    <div className="rounded-lg border bg-white relative" data-testid="schedule-card">
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-semibold truncate">{c.name || '—'}</div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {timeLabel}
              <span className="mx-1">•</span>
              {duration} min
            </span>

            {svc?.label ? (
              <>
                <span className="mx-1 hidden sm:inline">•</span>
                <span className="inline-flex items-center">
                  {svc.label}
                </span>
              </>
            ) : null}

            {propertyAddress ? (
              <>
                <span className="mx-1 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 max-w-[200px] sm:max-w-xs">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{propertyAddress}</span>
                </span>
              </>
            ) : null}

            {(c?.phone_number || c?.phone) ? (
              <>
                <span className="mx-1 hidden sm:inline">•</span>
                <a
                  href={`tel:${c.phone_number || c.phone}`}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                  title="Call customer"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{c.phone_number || c.phone}</span>
                  <span className="sm:hidden">Call</span>
                </a>
              </>
            ) : null}

            {alignmentStatus ? (
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                  alignmentStatus === 'aligned'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {alignmentStatus === 'aligned' ? 'Verified arrival' : 'Not at job location'}
              </span>
            ) : null}

            <PaymentStatePill invStatus={paymentStatus || invoiceStatus} pending={pendingUI} />
            <AuthorizationStatusPill authStatus={occ?.authorization_status || occ?.auth_status} />
            <RecurringPill pattern={occ?.pattern || occ?.rule_pattern} />
            {occ?.rule_id >= 0 && hasCardFinal === false && <NoCardPill />}
            {pendingScheduleChange ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                Pending approval
                {pendingScheduleChange?.toDate ? ` → ${pendingScheduleChange.toDate}` : ''}
              </span>
            ) : null}

            {/* Amount pill */}
            {amountLabel && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-neutral-300 bg-white"
                title="Amount"
              >
                {amountLabel}
              </span>
            )}

            {/* Only show service record/proof buttons when service is completed (not awaiting approval) */}
            {recordLabel && !authorizationBlocked ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => serviceRecordId && navigate(`/service-records/${serviceRecordId}`)}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-neutral-300 hover:bg-neutral-50"
                  title="View service record"
                  disabled={!serviceRecordId}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{recordLabel}</span>
                </button>
                {serviceRecordId ? (
                  <button
                    type="button"
                    onClick={() => { setSendProofSrId(serviceRecordId); setSendProofOpen(true); }}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-neutral-300 hover:bg-neutral-50"
                    title="Send proof"
                  >
                    Send proof
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {(locationNote || msg) && (
            <div className="text-xs text-neutral-600 flex flex-wrap gap-2">
              {locationNote && <span className="text-amber-700">{locationNote}</span>}
              {msg && <span>{msg}</span>}
            </div>
          )}
        </div>

        {showPaymentAudit ? (
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-neutral-500 mt-1">{occ?.date}</div>
            <button
              type="button"
              onClick={() => setAuditOpen(true)}
              className="text-xs text-blue-700 underline underline-offset-2 hover:text-blue-800"
            >
              View payment audit
            </button>
          </div>
        ) : (
          <div className="text-xs text-neutral-500 mt-1">{occ?.date}</div>
        )}
      </div>

      {missingPropertyMsg && (
        <div className="px-4 pb-3 text-sm text-amber-800 bg-amber-50 border-t border-b border-amber-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{missingPropertyMsg}</span>
          </div>
          <a
            href="/app/customers"
            className="text-sm underline underline-offset-2 text-amber-800"
          >
            Add address
          </a>
        </div>
      )}

      {authorizationBlocked && (
        <div className="px-4 py-3 text-sm bg-red-50 border-t border-b border-red-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authBlockMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              {approvalRequestId && (
                customerOptedOut ? (
                  c?.email ? (
                    <a
                      href={`mailto:${c.email}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white hover:bg-red-100 text-red-800"
                    >
                      Email customer
                    </a>
                  ) : null
                ) : canSendReminder ? (
                  <button
                    type="button"
                    onClick={sendApprovalReminder}
                    disabled={reminderBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white hover:bg-red-100 text-red-800 disabled:opacity-50"
                  >
                    {reminderBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Send Reminder
                  </button>
                ) : null
              )}
            </div>
          </div>
          {approvalRequestId && lastReminderSent && (
            <div className="text-xs text-red-600 mt-1.5 ml-6">
              Last reminder: {(() => {
                const d = new Date(lastReminderSent);
                const diffMs = Date.now() - d.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 60) return `${diffMins}m ago`;
                const diffHrs = Math.floor(diffMins / 60);
                if (diffHrs < 24) return `${diffHrs}h ago`;
                return `${Math.floor(diffHrs / 24)}d ago`;
              })()} ({reminderCount} sent)
            </div>
          )}
        </div>
      )}

      {overridePrompt && allowAlignmentOverride && (
        <div className="px-4 pb-3 text-sm text-amber-800 bg-amber-50 border-t border-b border-amber-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{alignmentMessage || 'Not at job location'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOverrideStart}
              className="px-3 py-1.5 rounded border border-amber-300 bg-white hover:bg-amber-100 text-amber-800"
              disabled={sending || requestingLocation}
            >
              Proceed anyway
            </button>
          </div>
        </div>
      )}

      {showSchedulingBlock && (
        <div className="px-4 pt-4 pb-4 space-y-3">
          {/* Primary actions */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {supportsStartWork && (
              <button
                type="button"
                onClick={handleStartWork}
                className={`${BTN_DARK} w-full sm:flex-1`}
                title="Start work at this location"
                disabled={sending || requestingLocation || started}
              >
                {sending || requestingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {started ? 'Started' : 'Start Work'}
              </button>
            )}
            <button
              type="button"
              onClick={sendOnMyWay}
              className={`${BTN_OUT} w-full sm:flex-1`}
              title='Send an "On My Way" text to the customer'
              disabled={onMyWayBusy || isLocked || skipped}
            >
              {onMyWayBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              On My Way
            </button>
            <button
              type="button"
              onClick={() => { setAfterPhotosAction(() => completeAndCharge); setPhotosOpen(true); }}
              className={`${BTN_PRI} w-full sm:flex-1`}
              title={authorizationBlocked ? authBlockMessage : "Complete this visit (and attempt the charge)"}
              disabled={charging || skipped || authorizationBlocked}
            >
              {charging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Complete
            </button>
            <div className="relative w-full sm:flex-1" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsOpen((v) => !v)}
                className={`${BTN_OUT} w-full`}
                title="More actions"
                disabled={isLocked || skipped}
              >
                <MoreHorizontal className="w-4 h-4" />
                More
              </button>
              {/* Actions dropdown panel */}
              {actionsOpen && (
                <div
                  className="absolute z-20 mt-2 right-0 w-full sm:w-[420px] rounded-xl border bg-white shadow-xl p-3 sm:p-4 space-y-3 max-h-[70vh] overflow-auto"
                >
                {/* Reschedule + end series */}
                <div className="space-y-2">
                  <div className="font-semibold text-sm text-neutral-800">Schedule</div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <div className="md:flex-1">
                      <Dropdown
                        label={null}
                        options={dayOptions}
                        value={quickDate}
                        onChange={(v) => setQuickDate(v)}
                        placeholder={dayOptions.length ? 'Select an allowed day...' : 'No allowed days soon'}
                        buttonClassName="h-11 w-full"
                        disabled={!dayOptions.length || isLocked}
                      />
                    </div>
                    <button type="button" onClick={handleRescheduleClick} className={BTN_OUT} disabled={!quickDate || isLocked}>
                      Reschedule
                    </button>
                  </div>
                  {!isPaidLike && (
                    <button type="button" onClick={cancelThisDate} disabled={skipped || isLocked} className={BTN_DANGER + ' w-full'}>
                      <XCircle className="w-4 h-4" /> {occ?.pattern === 'once' ? 'Cancel Service' : 'Cancel This Date'}
                    </button>
                  )}
                </div>

                {/* Arriving now / pay link */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={sendArrivingNow}
                    className={`${BTN_OUT} w-full sm:flex-1`}
                    title='Send an "Arriving now" text to the customer'
                    disabled={arrivingNowBusy || isLocked || skipped}
                  >
                    {arrivingNowBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                    Arriving now
                  </button>
                  {showPayLink && (
                    <button
                      type="button"
                      onClick={sendPayLink}
                      disabled={linking || invoiceStatus === 'processing'}
                      className={`${PILL} w-full sm:flex-1 justify-center`}
                      title="Create a hosted checkout link"
                    >
                      {linking ? <Loader2 className="h-4 h-4 animate-spin w-4" /> : <Link2 className="h-4 w-4" />} Pay link
                    </button>
                  )}
                </div>

                {/* Team assignment only (time removed per requirements) */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 md:col-span-6">
                    <Dropdown
                      label="Team (optional)"
                      options={teamOpts}
                      value={teamForDate}
                      onChange={(v) => setTeamForDate(v === '' ? '' : Number(v))}
                      placeholder="— Unassigned —"
                      buttonClassName="h-10 w-full"
                      disabled={isLocked}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <Dropdown
                      label="Apply team to"
                      options={[{ value: 'date', label: 'Date only' }, { value: 'rule', label: 'All future for this rule' }]}
                      value={applyTeamScope}
                      onChange={(v) => setApplyTeamScope(String(v))}
                      buttonClassName="h-10 w-full"
                      disabled={isLocked}
                    />
                  </div>
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photos modal gate */}
      <PhotoUploadModal
        open={photosOpen}
        onClose={() => setPhotosOpen(false)}
        scheduleRuleId={occ?.rule_id}
        scheduleDate={occ?.date}
        maxPhotos={10}
        onComplete={async (payload) => {
          try { await afterPhotosAction?.(payload); }
          finally { setPhotosOpen(false); }
        }}
      />

      <SendProofModal
        isOpen={sendProofOpen}
        onClose={() => setSendProofOpen(false)}
        serviceRecordId={sendProofSrId || serviceRecordId}
        headers={authHeader}
        customerContact={{
          name: c?.name,
          email: c?.email,
          phone: c?.phone_number,
        }}
      />

      {/* Admin-only audit drawer (feature-flagged) */}
      <Modal open={auditOpen && showPaymentAudit} onClose={() => setAuditOpen(false)}>
        <div className="space-y-3 max-w-xl">
          <div className="text-lg font-semibold text-neutral-900">Payment audit</div>
          <div className="text-sm text-neutral-700">
            Admin-only ledger/trust visibility. Does not change the schedule or billing flow.
          </div>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <dt className="text-neutral-500">Payment status</dt>
            <dd className="col-span-2 text-neutral-900 break-words">{auditDetails.paymentStatus || '—'}</dd>

            <dt className="text-neutral-500">Invoice ID</dt>
            <dd className="col-span-2 text-neutral-900 break-words">{auditDetails.invoiceId || '—'}</dd>

            <dt className="text-neutral-500">Service record</dt>
            <dd className="col-span-2 text-neutral-900 break-words">{auditDetails.serviceRecordId || '—'}</dd>

            <dt className="text-neutral-500">Trust hash</dt>
            <dd className="col-span-2 text-neutral-900 break-words">{auditDetails.trustHash || 'Not available'}</dd>

            <dt className="text-neutral-500">Ledger journal</dt>
            <dd className="col-span-2 text-neutral-900 break-words">{auditDetails.ledgerJournalId || 'Not available'}</dd>

            <dt className="text-neutral-500">Block height</dt>
            <dd className="col-span-2 text-neutral-900 break-words">{auditDetails.blockHeight ?? 'Not available'}</dd>

            <dt className="text-neutral-500">Sealed at</dt>
            <dd className="col-span-2 text-neutral-900 break-words">{auditDetails.sealedAt || 'Not available'}</dd>
          </dl>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAuditOpen(false)}
              className="px-3 py-2 rounded-lg border text-sm bg-white hover:bg-neutral-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Location help modal */}
      <Modal open={locationModalOpen} onClose={() => setLocationModalOpen(false)}>
        <div className="space-y-3">
          <div className="text-lg font-semibold text-neutral-900">Enable location</div>
          <div className="text-sm text-neutral-700">
            Turn on location for this site to record an arrival trust signal when starting work.
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-neutral-700">
            <li>iPhone/iPad: Settings → Privacy &amp; Security → Location Services → enable, then allow for your browser.</li>
            <li>Chrome/Edge: Address bar → Site settings → Location → Allow.</li>
            <li>Safari macOS: Safari → Settings → Websites → Location → Allow for this site.</li>
          </ul>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setLocationModalOpen(false)}
              className="px-3 py-2 rounded-lg border text-sm bg-white hover:bg-neutral-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick-reschedule confirm */}
      {confirmOpen && !isLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-[min(96vw,480px)] bg-white rounded-xl shadow-2xl p-5">
            <div className="text-lg font-semibold mb-2">Confirm reschedule</div>
            <div className="text-sm text-neutral-700 mb-4">
              Reschedule <span className="font-medium">{c?.name || 'this appointment'}</span>
              {selectedLabel ? <> to <span className="font-medium">{selectedLabel}</span>?</> : '?'}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" className={BTN_OUT} onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button type="button" className={BTN_DARK} onClick={handleConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
