import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

const PAID_STATUSES = new Set(['paid', 'succeeded', 'success', 'completed_paid']);
const PENDING_STATUSES = new Set(['pending', 'pending_capture', 'requires_action', 'requires_payment_method', 'processing', 'queued']);
const FAILED_STATUSES = new Set(['failed']);
const NOT_COLLECTED_STATUSES = new Set(['not_collected', 'no-charge', 'no_charge']);

const warnedUnknownStatuses = new Set();
const isDev = typeof import.meta !== 'undefined' ? import.meta.env?.DEV === true : process?.env?.NODE_ENV !== 'production';

const normalizeStatus = (raw) => (raw ? String(raw).toLowerCase().trim() : '');

export const getPaymentPillProps = (rawStatus, { pending } = {}) => {
  if (pending) {
    return { category: 'pending', label: 'Pending', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-blue-50 text-blue-900 border-blue-200', icon: null };
  }
  const s = normalizeStatus(rawStatus);
  if (PAID_STATUSES.has(s)) {
    return { category: 'paid', label: 'Paid', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-green-50 text-green-800 border-green-200', icon: CheckCircle2 };
  }
  if (PENDING_STATUSES.has(s)) {
    return { category: 'pending', label: 'Pending', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-blue-50 text-blue-900 border-blue-200', icon: null };
  }
  if (FAILED_STATUSES.has(s)) {
    return { category: 'failed', label: 'Failed', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-red-50 text-red-700 border-red-200', icon: XCircle };
  }
  if (NOT_COLLECTED_STATUSES.has(s)) {
    return { category: 'not_collected', label: 'Not collected', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-neutral-100 text-neutral-700 border-neutral-200', icon: null };
  }
  if (s && !warnedUnknownStatuses.has(s) && isDev) {
    // eslint-disable-next-line no-console
    console.warn('[PaymentStatePill] Unknown payment status', s);
    warnedUnknownStatuses.add(s);
  }
  return { category: 'unpaid', label: 'Unpaid', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-amber-50 text-amber-900 border-amber-200', icon: null };
};

export const Pill = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 ${className}`}>
    {children}
  </span>
);

export const NoCardPill = () => (
  <span
    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border bg-red-50 text-red-700 border-red-200 whitespace-nowrap shrink-0"
    title="No card on file"
    aria-label="No card on file"
  >
    <XCircle className="h-3 w-3" /> No card
  </span>
);

export const PendingPill = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-blue-50 text-blue-900 border-blue-200">
    Pending
  </span>
);

export const PaymentStatePill = ({ invStatus, pending }) => {
  const { category, label, className, icon: Icon } = getPaymentPillProps(invStatus, { pending });
  if (category === 'pending') return <PendingPill />;
  return (
    <span className={className}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
};

// Authorization status pill for pre-authorization model
const AUTHORIZATION_STATUSES = {
  pending: { label: 'Awaiting approval', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-red-50 text-red-700 border-red-200', icon: AlertCircle },
  authorized: { label: 'Authorized', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-green-50 text-green-800 border-green-200', icon: CheckCircle2 },
  declined: { label: 'Declined', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-red-50 text-red-700 border-red-200', icon: XCircle },
  expired: { label: 'Expired', className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-amber-50 text-amber-800 border-amber-200', icon: Clock },
};

// Recurring vs One-off indicator pill
export const RecurringPill = ({ pattern }) => {
  if (!pattern) return null;
  const isRecurring = pattern !== 'once';

  if (isRecurring) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-purple-50 text-purple-700 border-purple-200">
        Recurring
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-neutral-50 text-neutral-600 border-neutral-200">
      One-off
    </span>
  );
};

export const AuthorizationStatusPill = ({ authStatus }) => {
  if (!authStatus) return null;
  const status = normalizeStatus(authStatus);

  // Don't show pill if authorization is not required
  if (status === 'not_required' || status === 'not_needed') return null;

  const config = AUTHORIZATION_STATUSES[status];
  if (!config) {
    // Unknown status - show as pending/warning
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-amber-50 text-amber-800 border-amber-200">
        <AlertCircle className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  }

  const Icon = config.icon;
  return (
    <span className={config.className}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {config.label}
    </span>
  );
};
