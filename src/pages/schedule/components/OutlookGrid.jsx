import React, { useMemo } from 'react';
import { teamLabelOf, ymd, keyFor, labelTime } from '../scheduleUtils';
import { PaymentStatePill, NoCardPill } from './PaymentPills';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export default function OutlookGrid({
  days, occurrences, startTimes, onOpenEdit, orgHours, canManage,
  statusFor, // (occ) => {status}
  isPending, // (occ) => boolean
  hasCard,
  teams = [],
}) {
  const PX_PER_MIN = 2;

  function toHH(hhmm) {
    const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 8 * 60;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  const first = days[0];
  const firstKey = first ? format(first, 'EEE').toLowerCase().slice(0,3) : 'mon';
  const wnd = (orgHours && orgHours[firstKey]) || { open: '08:00', close: '17:00', closed: false };
  const openMin = toHH(wnd.open);
  const closeMin = toHH(wnd.close);
  const totalMin = Math.max(60, closeMin - openMin);

  const byDate = useMemo(() => {
    const m = new Map();
    for (const d of days) m.set(ymd(d), []);
    for (const occ of occurrences) {
      if (m.has(occ.date)) m.get(occ.date).push(occ);
    }
    return m;
  }, [days, occurrences]);

  return (
    <>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[80px_repeat(7,minmax(220px,1fr))] gap-3">
          <div />
          {days.map((d) => (
            <div key={ymd(d)} className="text-lg font-semibold px-2">
              {format(d, 'EEE, MMM d')}
            </div>
          ))}

          {/* time gutter */}
          <div className="border rounded-xl relative" style={{ height: totalMin * PX_PER_MIN }}>
            {Array.from({ length: Math.ceil((closeMin - openMin) / 60) + 1 }).map((_, i) => {
              const t = openMin + i * 60;
              const top = (t - openMin) * PX_PER_MIN;
              const hh = ((Math.floor(t / 60) + 11) % 12) + 1;
              const ampm = Math.floor(t / 60) < 12 ? 'AM' : 'PM';
              return (
                <div key={i} className="absolute left-2 text-neutral-500 text-sm" style={{ top }}>
                  {hh}:00 {ampm}
                </div>
              );
            })}
          </div>

          {/* day columns */}
          {days.map((d) => {
            const k = ymd(d);
            const items = byDate.get(k) || [];
            const scheduled = [];
            for (const occ of items) {
              const mins = startTimes.get(keyFor(occ.rule_id, occ.date));
              if (mins != null) scheduled.push({ occ, mins });
            }

            return (
              <div
                key={k}
                className="border rounded-xl relative"
                style={{ height: totalMin * PX_PER_MIN }}
              >
                {Array.from({ length: Math.ceil((closeMin - openMin) / 60) + 1 }).map((_, i) => {
                  const t = openMin + i * 60;
                  const top = (t - openMin) * PX_PER_MIN;
                  return (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-neutral-200"
                      style={{ top }}
                    />
                  );
                })}

                {scheduled.map(({ occ, mins }) => {
                  const svcMin = Number(occ.service?.estimated_minutes) || 45;
                  const top = Math.max(0, (mins - openMin) * PX_PER_MIN);
                  const height = Math.max(24, svcMin * PX_PER_MIN);
                  const clickable = canManage
                    ? { onClick: () => onOpenEdit(occ), title: 'Click to edit / cancel / reschedule' }
                    : {};
                  const inv = statusFor ? statusFor(occ) : { status: 'none' };

                  return (
                    <div
                      key={`${occ.rule_id}-${occ.customer?.id}-${occ.date}`}
                      className="absolute left-2 right-2 bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-2"
                      style={{ top, height, cursor: canManage ? 'pointer' : 'default' }}
                      {...clickable}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-blue-900 truncate">
                            {occ.customer?.name || 'Item'}
                          </div>
                          <div className="text-[11px] text-blue-800/80">
                            {teamLabelOf(occ, teams)}
                          </div>
                          {occ.service?.label ? (
                            <div className="text-sm text-blue-800 truncate">
                              {occ.service.label}
                            </div>
                          ) : null}
                          <div className="text-xs text-blue-800 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {labelTime(mins)} • {occ.service?.estimated_minutes ? `${occ.service.estimated_minutes} min` : '—'}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <PaymentStatePill invStatus={inv.status} pending={isPending?.(occ)} />
                          {occ.rule_id >= 0 && hasCard && !hasCard(occ) && <NoCardPill />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled below grid */}
      <div className="mt-4 space-y-4">
        {days.map((d) => {
          const k = ymd(d);
          const items = byDate.get(k) || [];
          const unscheduled = items.filter(occ => startTimes.get(keyFor(occ.rule_id, occ.date)) == null);
          if (!unscheduled.length) return null;

          return (
            <section key={`unsched-${k}`} className="border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-neutral-800">
                  Unscheduled — {format(d, 'EEE, MMM d')}
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {unscheduled.map((occ) => {
                  const inv = statusFor ? statusFor(occ) : { status: 'none' };
                  const clickable = canManage
                    ? { onClick: () => onOpenEdit(occ), title: 'Click to schedule time / cancel / reschedule' }
                    : {};
                  return (
                    <div
                      key={`${occ.rule_id}-${occ.customer?.id}-${occ.date}-unsched`}
                      className="bg-white border rounded-lg shadow-sm p-2"
                      style={{ cursor: canManage ? 'pointer' : 'default' }}
                      {...clickable}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{occ.customer?.name || 'Item'}</div>
                          <div className="text-[11px] text-neutral-700/80">
                            {teamLabelOf(occ, teams)}
                          </div>
                          {occ.service?.label ? (
                            <div className="text-sm text-neutral-700 truncate">
                              {occ.service.label}
                            </div>
                          ) : null}
                          <div className="text-xs text-neutral-600">Unscheduled</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <PaymentStatePill invStatus={inv.status} pending={isPending?.(occ)} />
                          {occ.rule_id >= 0 && hasCard && !hasCard(occ) && <NoCardPill />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
