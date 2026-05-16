import React from 'react';

const palette = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-neutral-50 text-neutral-800 border-neutral-200',
};

export default function StatusCallout({ tone = 'info', children }) {
  return (
    <div className={`border rounded-lg px-3 py-2 text-sm ${palette[tone] || palette.info}`}>
      {children}
    </div>
  );
}
