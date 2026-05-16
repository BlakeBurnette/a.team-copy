import React from 'react';

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const LABEL = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' };

function formatWindow(w) {
  return `${w.start}–${w.end}`;
}

export default function AvailabilityByOrgHours({ orgHours, value, onChange }) {
  // orgHours: { mon:[{start,end}], ... }
  // value: { days: { mon:true, ... } }
  const state = value?.days || {};
  const toggle = (d) => {
    const next = { ...state, [d]: !state[d] };
    onChange?.({ type: 'org_hours_v1', days: next });
  };

  const copyWeekdays = () => {
    const next = { ...state };
    ['mon','tue','wed','thu','fri'].forEach(d => { if ((orgHours[d] || []).length) next[d] = true; });
    onChange?.({ type: 'org_hours_v1', days: next });
  };

  const clearAll = () => onChange?.({ type: 'org_hours_v1', days: {} });

  const hasAnyHours = DAYS.some(d => (orgHours?.[d] || []).length > 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <div className="font-medium">Available to receive services</div>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={copyWeekdays} className="px-2 py-1 border rounded hover:bg-gray-100">
            Select weekdays
          </button>
          <button type="button" onClick={clearAll} className="px-2 py-1 border rounded hover:bg-gray-100">
            Clear
          </button>
        </div>
      </div>

      {!hasAnyHours ? (
        <div className="px-3 py-4 text-sm text-gray-600">
          This organization hasn’t published business hours yet. You can still submit the form without selecting availability.
        </div>
      ) : (
        <div className="divide-y">
          {DAYS.map((d) => {
            const windows = orgHours?.[d] || [];
            const disabled = windows.length === 0;
            return (
              <div key={d} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 py-2">
                <div className="w-16 shrink-0 font-medium">{LABEL[d]}</div>

                <div className="flex-1 text-sm text-gray-700">
                  {disabled ? (
                    <span className="text-gray-400">Closed</span>
                  ) : (
                    <span>{windows.map(formatWindow).join(', ')}</span>
                  )}
                </div>

                <label className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={!!state[d]}
                    onChange={() => toggle(d)}
                  />
                  <span className="text-sm">I’m available</span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
