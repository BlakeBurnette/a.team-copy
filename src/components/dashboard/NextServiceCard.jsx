// src/components/dashboard/NextServiceCard.jsx
import React from 'react';
import { format, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { Calendar, Clock, MapPin, Repeat, XCircle } from 'lucide-react';

/**
 * Prominent next service card for customer dashboard
 */
export default function NextServiceCard({
  service,
  onReschedule,
  onCancel,
  className = '',
}) {
  if (!service) {
    return (
      <div className={`bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl border-2 border-dashed border-neutral-300 p-6 text-center ${className}`}>
        <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-neutral-700">No Upcoming Services</h3>
        <p className="text-sm text-neutral-500 mt-1">
          You don't have any services scheduled
        </p>
      </div>
    );
  }

  const serviceDate = parseISO(service.date);
  const daysUntil = differenceInDays(serviceDate, new Date());
  const svc = service.service || {};
  const customer = service.customer || {};

  // Format time
  const formatTime = (mins) => {
    if (mins == null) return 'Time TBD';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hh = ((h + 11) % 12) + 1;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Date label
  let dateLabel;
  if (isToday(serviceDate)) {
    dateLabel = 'Today';
  } else if (isTomorrow(serviceDate)) {
    dateLabel = 'Tomorrow';
  } else if (daysUntil <= 7) {
    dateLabel = format(serviceDate, 'EEEE');
  } else {
    dateLabel = format(serviceDate, 'MMM d');
  }

  const isRescheduleRequested = service.flags?.reschedule_requested || service.status === 'reschedule_requested';
  const isCancelled = service.skipped || service.cancelled || service.flags?.cancelled;

  // Address
  const addr = customer.street || customer.city
    ? `${customer.street || ''}${customer.city ? `, ${customer.city}` : ''}${customer.state ? `, ${customer.state}` : ''}`
    : null;

  return (
    <div className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-sm font-medium">Next Service</p>
            <h2 className="text-2xl font-bold mt-0.5">
              {dateLabel}
            </h2>
          </div>
          {daysUntil >= 0 && (
            <div className="text-right">
              <span className="text-3xl font-bold">{daysUntil}</span>
              <p className="text-amber-100 text-sm">day{daysUntil !== 1 ? 's' : ''} away</p>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="text-xl font-semibold text-neutral-900">
          {svc.label || 'Scheduled Service'}
        </h3>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-neutral-700">
            <Clock className="w-4 h-4 text-neutral-500" />
            <span>{format(serviceDate, 'EEEE, MMMM d')} at {formatTime(service.start_minutes)}</span>
          </div>
          {addr && (
            <div className="flex items-center gap-2 text-neutral-700">
              <MapPin className="w-4 h-4 text-neutral-500" />
              <span>{addr}</span>
            </div>
          )}
        </div>

        {/* Status badges */}
        {(isRescheduleRequested || isCancelled) && (
          <div className="mt-3">
            {isRescheduleRequested && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                <Repeat className="w-3 h-3" />
                Reschedule Requested
              </span>
            )}
            {isCancelled && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                <XCircle className="w-3 h-3" />
                Cancelled
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {!isCancelled && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onReschedule?.(service)}
              disabled={isRescheduleRequested}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Repeat className="w-4 h-4" />
              {isRescheduleRequested ? 'Request Sent' : 'Request Reschedule'}
            </button>
            <button
              type="button"
              onClick={() => onCancel?.(service)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
