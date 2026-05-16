import React from 'react';
import { ShieldCheck, MapPin, Sparkles } from 'lucide-react';

function trustLabel(score) {
  if (typeof score === 'number') {
    if (score >= 80) return 'High';
    if (score >= 50) return 'Medium';
    return 'Emerging';
  }
  if (typeof score === 'string') return score;
  return 'Verified';
}

export default function ProviderCard({ provider, onRequest, loading }) {
  const {
    id,
    name,
    provider_name,
    service_type,
    serviceType,
    trust_score,
    trustScore,
    already_servicing,
    day_of_week,
    dayOfWeek,
    note,
  } = provider || {};

  const serviceTypeLabel = service_type || serviceType || 'Service';
  const scoreLabel = trustLabel(trust_score ?? trustScore);
  const dayLabel = day_of_week || dayOfWeek || null;

  return (
    <div className="border rounded-xl bg-white shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-neutral-900">{name || provider_name || 'Provider'}</div>
          <div className="text-sm text-neutral-600">{serviceTypeLabel}</div>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
          <ShieldCheck className="w-4 h-4" />
          Verified by PayHive
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neutral-100 border text-neutral-800 text-xs font-medium">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Trust score: {scoreLabel}
        </span>
        {already_servicing ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
            <MapPin className="w-4 h-4" />
            Already services your area{dayLabel ? ` on ${dayLabel}` : ''}
          </span>
        ) : null}
      </div>

      {note ? <div className="text-sm text-neutral-700">{note}</div> : null}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => onRequest?.(provider)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? 'Requesting...' : 'Request this service'}
        </button>
      </div>
    </div>
  );
}
