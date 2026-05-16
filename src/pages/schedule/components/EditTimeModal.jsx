// src/pages/schedule/components/EditTimeModal.jsx
import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import { PaymentStatePill, NoCardPill, Pill } from './PaymentPills';
import { labelTime } from '../scheduleUtils';

export default function EditTimeModal({
  open, onClose, occurrence, availableSlots,
  selectedMinutes, setSelectedMinutes,
  selectedTeamId, setSelectedTeamId,
  teamOptions,
  onSave, onClearTime, onCancelOccurrence, onOpenReschedule,
  onComplete,
  canManage,
  showPendingPill = false,
  invoiceStatus,
  hasCard,
}) {
  if (!open || !occurrence) return null;

  const c = occurrence.customer || {};
  const svc = occurrence.service || {};
  const price =
    typeof svc.price_cents === 'number' ? `$${(svc.price_cents / 100).toFixed(2)}` : null;

  const teamOpts = useMemo(
    () => [{ value: '', label: '— Unassigned —' }, ...(teamOptions || [])],
    [teamOptions]
  );
  const timeOpts = useMemo(
    () => (availableSlots || []).map((min) => ({ value: Number(min), label: labelTime(min) })),
    [availableSlots]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[min(720px,92vw)] bg-white sm:rounded-xl rounded-t-2xl shadow-2xl max-h[95vh] flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold truncate">{c.name || 'Item'}</div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <PaymentStatePill invStatus={invoiceStatus} pending={showPendingPill} />
              {occurrence?.rule_id >= 0 && !hasCard?.(occurrence) && <NoCardPill />}
              <span className="text-xs text-neutral-500">scheduled</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            aria-label="Close"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          <div className="rounded-lg border bg-neutral-50/50 p-3 sm:p-4">
            <div className="text-sm text-neutral-800 leading-relaxed">
              {(c.street || c.city || c.state || c.zip) && (
                <div className="mb-0.5">
                  {c.street ? `${c.street}, ` : ''}
                  {c.city ? `${c.city}, ` : ''}
                  {c.state ? `${c.state} ` : ''}
                  {c.zip || ''}
                </div>
              )}
              {c.email && (
                <div className="mb-0.5">
                  <span className="text-neutral-500">Email: </span>
                  <a className="underline text-zinc-700" href={`mailto:${c.email}`}>{c.email}</a>
                </div>
              )}
              {c.phone_number && (
                <div className="mb-0.5">
                  <span className="text-neutral-500">Phone: </span>
                  <a className="underline text-zinc-700" href={`tel:${c.phone_number}`}>{c.phone_number}</a>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {svc?.label ? (
                  <Pill>{svc.label}{price ? ` • ${price}` : ''}</Pill>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Dropdown
              label="Team"
              options={teamOpts}
              value={selectedTeamId == null ? '' : String(selectedTeamId)}
              onChange={(v) => setSelectedTeamId(v === '' ? null : Number(v))}
              disabled={!canManage}
              buttonClassName="h-11"
            />
            <Dropdown
              label="Start time"
              options={timeOpts}
              value={selectedMinutes ?? ''}
              onChange={(v) => setSelectedMinutes(v === '' ? null : Number(v))}
              placeholder="Select a time…"
              disabled={!canManage}
              buttonClassName="h-11"
            />
            {occurrence?.service?.estimated_minutes ? (
              <div className="text-xs text-neutral-500 -mt-2">
                Duration: {occurrence.service.estimated_minutes} min
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 border-t bg-white">
          <div className="hidden sm:flex items-center justify-between">
            <div />
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  className="inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                  disabled={selectedMinutes == null && selectedTeamId == null}
                >
                  Save
                </button>

                {/* Optional: complete directly from modal */}
                {typeof onComplete === 'function' && (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Complete
                  </button>
                )}

                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={onOpenReschedule}
                    className="px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={onClearTime}
                    className="px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 ml-2"
                  >
                    Clear time
                  </button>
                  <button
                    type="button"
                    onClick={onCancelOccurrence}
                    className="px-3 py-2 rounded-lg border bg-white text-red-600 hover:bg-red-50/50 ml-2"
                  >
                    Cancel Appointment
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile actions */}
          <div className="sm:hidden grid gap-2">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                  disabled={selectedMinutes == null && selectedTeamId == null}
                >
                  Save
                </button>
                {typeof onComplete === 'function' && (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Complete
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenReschedule}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg border hover:bg-neutral-50"
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={onClearTime}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg border hover:bg-neutral-50"
                >
                  Clear time
                </button>
                <button
                  type="button"
                  onClick={onCancelOccurrence}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-lg border text-red-600 hover:bg-red-50/50"
                >
                  Cancel Appointment
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
