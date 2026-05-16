import React from 'react';

const toneToClasses = {
  success: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-800 bg-amber-50 border-amber-200',
  info: 'text-blue-800 bg-blue-50 border-blue-200',
  danger: 'text-red-800 bg-red-50 border-red-200',
  muted: 'text-neutral-700 bg-neutral-100 border-neutral-200',
};

export function getPaymentStatusMeta(resolutionStatus, resolutionCode) {
  const status = String(resolutionStatus || resolutionCode || '').toLowerCase();

  if (['succeeded', 'paid', 'complete', 'completed'].includes(status)) {
    return { label: 'Paid', tone: 'success' };
  }

  if (
    ['requires_customer_action', 'requires_action', 'payment_method_required'].includes(status)
  ) {
    return { label: 'Action needed', tone: 'warning' };
  }

  if (['retry_scheduled', 'insufficient_funds', 'ach_return'].includes(status)) {
    return { label: 'Retrying', tone: 'info' };
  }

  if (['processing', 'pending', 'transient'].includes(status)) {
    return { label: 'Processing', tone: 'info' };
  }

  if (['exhausted', 'failed', 'canceled', 'unknown', 'compatibility_required'].includes(status)) {
    return { label: 'Payment failed', tone: 'danger' };
  }

  return { label: 'Payment pending', tone: 'muted' };
}

export default function PaymentStatusPill({ resolutionStatus, resolutionCode, className = '' }) {
  const meta = getPaymentStatusMeta(resolutionStatus, resolutionCode);
  const toneClass = toneToClasses[meta.tone] || toneToClasses.muted;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${toneClass} ${className}`}
      data-testid="payment-status-pill"
    >
      <span className="w-2 h-2 rounded-full bg-current/70" />
      {meta.label}
    </span>
  );
}
