// src/components/dashboard/TodayProgressCard.jsx
import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

/**
 * Today's progress card for crew dashboard
 * Shows completion progress for the day
 */
export default function TodayProgressCard({
  total = 0,
  completed = 0,
  inProgress = 0,
  className = '',
}) {
  const remaining = Math.max(0, total - completed - inProgress);
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className={`bg-white rounded-xl border p-4 ${className}`}>
        <div className="flex items-center gap-2 text-neutral-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm">No services scheduled today</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-neutral-900">Today's Progress</h3>
        <span className="text-2xl font-bold text-neutral-900">
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-neutral-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 text-emerald-700">
            <CheckCircle className="w-4 h-4" />
            <span className="font-bold">{completed}</span>
          </div>
          <p className="text-xs text-emerald-600 mt-0.5">Completed</p>
        </div>

        <div className="bg-amber-50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 text-amber-700">
            <Clock className="w-4 h-4" />
            <span className="font-bold">{inProgress}</span>
          </div>
          <p className="text-xs text-amber-600 mt-0.5">In Progress</p>
        </div>

        <div className="bg-neutral-50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 text-neutral-700">
            <AlertCircle className="w-4 h-4" />
            <span className="font-bold">{remaining}</span>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5">Remaining</p>
        </div>
      </div>

      {progressPercent === 100 && (
        <div className="mt-4 text-center py-2 bg-emerald-100 rounded-lg">
          <p className="text-sm font-medium text-emerald-700">
            All done for today!
          </p>
        </div>
      )}
    </div>
  );
}
