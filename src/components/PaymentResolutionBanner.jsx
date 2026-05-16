import React from 'react';
import PaymentStatusPill from './PaymentStatusPill';

const shouldShow = (status) => {
  const normalized = String(status || '').toLowerCase();
  return ['requires_customer_action', 'requires_action', 'payment_method_required', 'retry_scheduled'].includes(
    normalized
  );
};

export default function PaymentResolutionBanner({
  resolutionStatus,
  resolutionCode,
  serviceRecordId,
  token,
  className = '',
}) {
  if (!shouldShow(resolutionStatus || resolutionCode)) return null;

  const href = token
    ? `/m/resolve/${encodeURIComponent(token)}`
    : serviceRecordId
    ? `/app/user/service-records/${serviceRecordId}/resolve-payment`
    : null;

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${className}`}
      data-testid="payment-resolution-banner"
    >
      <div>
        <div className="text-sm font-semibold text-neutral-900">Service completed and verified</div>
        <div className="text-sm text-neutral-700">Payment needs one quick step to finalize.</div>
        <div className="mt-1">
          <PaymentStatusPill resolutionStatus={resolutionStatus} resolutionCode={resolutionCode} />
        </div>
      </div>
      {href ? (
        <a
          href={href}
          className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
        >
          Resolve payment
        </a>
      ) : null}
    </div>
  );
}
