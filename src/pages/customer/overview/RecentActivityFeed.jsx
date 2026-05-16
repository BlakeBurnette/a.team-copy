import React from 'react';
import { CheckCircle2, DollarSign, AlertCircle, Mail, Wrench } from 'lucide-react';

const EVENT_ICONS = {
  service_completed: CheckCircle2,
  payment_succeeded: DollarSign,
  payment_failed: AlertCircle,
  proof_sent: Mail,
  customer_updated: Wrench,
};

const EVENT_COLORS = {
  service_completed: 'text-green-500',
  payment_succeeded: 'text-green-500',
  payment_failed: 'text-red-500',
  proof_sent: 'text-blue-500',
  customer_updated: 'text-neutral-500',
};

export default function RecentActivityFeed({ events = [], onViewAll }) {
  if (!events.length) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
          Recent Activity
        </h3>
        <p className="text-sm text-neutral-400">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
          Recent Activity
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            View all
          </button>
        )}
      </div>
      <div className="space-y-1">
        {events.map((evt, i) => {
          const Icon = EVENT_ICONS[evt.event_type] || CheckCircle2;
          const color = EVENT_COLORS[evt.event_type] || 'text-neutral-400';
          return (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
              <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
              <span className="text-sm text-neutral-700 flex-1">{evt.description}</span>
              <span className="text-xs text-neutral-400 flex-shrink-0">
                {new Date(evt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
