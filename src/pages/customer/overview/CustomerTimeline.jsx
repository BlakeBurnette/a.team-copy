import React from 'react';

const STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'active', label: 'Active' },
  { key: 'at_risk', label: 'At Risk' },
  { key: 'churned', label: 'Churned' },
];

export default function CustomerTimeline({ lifecycle = {} }) {
  const { stage = 'active', since, total_services = 0, ltv_cents = 0 } = lifecycle;
  const currentIdx = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
        Customer Lifecycle
      </h3>

      {/* Stage bar */}
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const isActive = i === currentIdx;
          const isPast = i < currentIdx;
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-2 w-full rounded-full ${
                  isActive ? 'bg-amber-500' :
                  isPast ? 'bg-amber-300' :
                  'bg-neutral-200'
                }`}
              />
              <span className={`text-xs ${
                isActive ? 'font-bold text-amber-700' :
                isPast ? 'text-amber-500' :
                'text-neutral-400'
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-sm">
        {since && (
          <div>
            <span className="text-neutral-500">Since </span>
            <span className="font-medium text-neutral-800">
              {new Date(since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
        <div>
          <span className="text-neutral-500">Services </span>
          <span className="font-medium text-neutral-800">{total_services}</span>
        </div>
        <div>
          <span className="text-neutral-500">LTV </span>
          <span className="font-medium text-neutral-800">
            ${(ltv_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
}
