import React from 'react';
import { MapPin, Clock3 } from 'lucide-react';

export default function OfferCard({ offer, onAccept, onDismiss, loading }) {
  const {
    id,
    provider_name,
    providerName,
    service_type,
    serviceType,
    day_of_week,
    dayOfWeek,
    message,
  } = offer || {};

  const day = day_of_week || dayOfWeek;
  const service = service_type || serviceType || 'Service';

  return (
    <div className="border rounded-xl bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-neutral-900">{provider_name || providerName || 'Provider'}</div>
          <div className="text-sm text-neutral-600">{service}</div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
          <MapPin className="w-4 h-4" />
          Services your area
        </span>
      </div>

      <div className="text-sm text-neutral-700">
        {message || `Already services your area${day ? ` on ${day}s` : ''}.`}
      </div>

      {day ? (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neutral-100 text-neutral-800 text-xs font-medium border">
          <Clock3 className="w-4 h-4" />
          Preferred day: {day}
        </div>
      ) : null}

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => onDismiss?.(offer)}
          disabled={loading}
          className="px-3 py-2 rounded-lg border text-sm bg-white hover:bg-neutral-50 disabled:opacity-60"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={() => onAccept?.(offer)}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? 'Sending...' : "Yes, I'm interested"}
        </button>
      </div>
    </div>
  );
}
