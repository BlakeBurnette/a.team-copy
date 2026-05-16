// src/components/ApprovalModal.jsx
import React from 'react';
import Modal from './Modal';
import { Loader2 } from 'lucide-react';

export default function ApprovalModal({
  open,
  mode = 'approve', // 'approve' | 'decline'
  approval,
  onConfirm,
  onClose,
  loading,
  error,
  title,
  summaryOverride,
  amountOverride,
  showReason = false,
  reason = '',
  onReasonChange,
}) {
  if (!open) return null;
  const isApprove = mode === 'approve';
  const summary = summaryOverride ?? approval?.summary ?? approval?.description ?? '';
  const amountCents = amountOverride ?? approval?.amount_cents ?? approval?.amountCents ?? approval?.amount ?? null;
  const currency = approval?.currency || 'USD';
  const fmtMoney = (cents) => {
    if (typeof cents !== 'number') return '';
    const n = cents / 100;
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="text-lg font-semibold">
          {title || (isApprove ? 'Approve request' : 'Decline request')}
        </div>
        <div className="space-y-1 text-sm text-neutral-700">
          <div className="font-medium text-neutral-900">{summary || 'Are you sure?'}</div>
          {amountCents != null && (
            <div className="text-neutral-600">Amount: {fmtMoney(amountCents)}</div>
          )}
        </div>
        {!isApprove && showReason ? (
          <div className="space-y-1 text-sm">
            <div className="text-neutral-700">Reason (optional)</div>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows="3"
              value={reason}
              onChange={(e) => onReasonChange?.(e.target.value)}
              placeholder="Let us know why you declined"
            />
          </div>
        ) : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border text-sm bg-white hover:bg-neutral-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
              isApprove ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            } disabled:opacity-60`}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? (isApprove ? 'Approving…' : 'Declining…') : (isApprove ? 'Approve with device unlock' : 'Decline')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
