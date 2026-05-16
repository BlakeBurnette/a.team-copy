import React from 'react';
import { AlertTriangle, CreditCard, Clock, MessageSquare } from 'lucide-react';

const ICON_MAP = {
  overdue_invoice: Clock,
  missing_payment_method: CreditCard,
  pending_approval: AlertTriangle,
  unanswered_followup: MessageSquare,
};

const LABEL_MAP = {
  overdue_invoice: (item) => `Invoice overdue by ${item.days_overdue} days — $${(item.amount_cents / 100).toFixed(2)}`,
  missing_payment_method: () => 'No payment method on file',
  pending_approval: (item) => `Pending approval: ${item.description || 'Change order'}`,
  unanswered_followup: (item) => `No response to follow-up (${item.days_ago}d ago)`,
};

export default function NeedsAttentionSection({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
        Needs Attention
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => {
          const Icon = ICON_MAP[item.type] || AlertTriangle;
          const label = (LABEL_MAP[item.type] || (() => item.type))(item);
          return (
            <div
              key={`${item.type}-${i}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800"
            >
              <Icon className="h-5 w-5 flex-shrink-0 text-red-500" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
