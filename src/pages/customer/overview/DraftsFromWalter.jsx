import React, { useState } from 'react';
import { Mail, MessageSquare, Edit3, Check, X } from 'lucide-react';

const CHANNEL_ICON = {
  email: Mail,
  sms: MessageSquare,
};

const TYPE_LABELS = {
  payment_reminder: 'Payment Reminder',
  seasonal_upsell: 'Seasonal Upsell',
  quote_follow_up: 'Quote Follow-up',
  post_service: 'Post-Service',
  on_my_way: 'On My Way',
};

export default function DraftsFromWalter({ drafts = [] }) {
  const [dismissed, setDismissed] = useState(new Set());

  const visible = drafts.filter((d) => !dismissed.has(d.id));
  if (!visible.length) return null;

  const handleApprove = (id) => {
    // TODO: POST /api/customers/{id}/drafts/{draft_id}/approve
    setDismissed((prev) => new Set([...prev, id]));
  };

  const handleReject = (id) => {
    // TODO: DELETE /api/customers/{id}/drafts/{draft_id}
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
        Drafts from Sir Walter
      </h3>
      <div className="space-y-3">
        {visible.map((draft) => {
          const ChannelIcon = CHANNEL_ICON[draft.channel] || Mail;
          const typeLabel = TYPE_LABELS[draft.type] || draft.type;
          return (
            <div
              key={draft.id}
              className="p-4 rounded-lg bg-white border border-neutral-200 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChannelIcon className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600 uppercase">{typeLabel}</span>
                  <span className="text-xs text-neutral-400">via {draft.channel}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleApprove(draft.id)}
                    className="p-1.5 rounded-md hover:bg-green-50 text-green-600"
                    title="Approve & send"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(draft.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                    title="Discard"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {draft.subject && (
                <div className="text-sm font-medium text-neutral-800">{draft.subject}</div>
              )}
              <div className="text-sm text-neutral-600 whitespace-pre-wrap">{draft.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
