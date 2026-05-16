// src/components/MobileSafeDate.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function MobileSafeDate({ label, value, onChange, disabled=false, className='' }) {
  const [open, setOpen] = useState(false);
  const isMobile = typeof window !== 'undefined'
    ? window.matchMedia && window.matchMedia('(max-width: 640px)').matches
    : false;

  if (!isMobile) {
    return (
      <div>
        {label ? <label className="block text-sm text-neutral-600 mb-1">{label}</label> : null}
        <input
          type="date"
          className={`w-full border rounded-lg px-3 py-2 ${className}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div>
      {label ? <label className="block text-sm text-neutral-600 mb-1">{label}</label> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`w-full text-left border rounded-lg px-3 py-2 bg-white ${disabled ? 'opacity-60' : 'hover:bg-neutral-50'} ${className}`}
      >
        {value || 'Select date'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{label || 'Select date'}</div>
              <button type="button" className="p-1 rounded hover:bg-neutral-100" onClick={() => setOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
