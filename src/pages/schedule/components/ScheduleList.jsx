// pages/schedule/components/ScheduleList.jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { keyFor, ymd, teamLabelOf } from '../scheduleUtils';
import ScheduleCard from './ScheduleCard';
import { getPaymentPillProps } from './PaymentPills';
import axios from 'axios';

const DEBUG_PAY = false; // flip to true for payment prop logging

// very small client-side paid-like helper (keeps it local to this file)
const isPaidLikeStatus = (s) => getPaymentPillProps(s).category === 'paid';

export default function ScheduleList({
  days,
  occurrences,
  startTimes,
  onOpenEdit, // kept for API compatibility
  onReschedule, // kept for API compatibility
  onQuickReschedule,
  onComplete,
  onStartWork,
  onDeleteRule, // kept for API compatibility
  canManage,
  statusFor,
  invoiceFor,
  isPending,
  hasCard, // optional callback (occ) => boolean, legacy path
  groupByTeam = false,
  teams = [],
  orgBusinessHours = {},
  hideQuickDropdown = false,
  alwaysOpen = false,
  enableTeamReassign = false,
  onReassignTeam,
  // NEW (optional): if parent knows top-level org flag, pass it
  orgCanCollect = false,
  showToast,
  showPaymentAudit = false,
  pendingScheduleChanges = new Map(),
}) {
  const patchReorderStops = useRef(null);
  const lastReorderError = useRef(null);
  useEffect(() => {
    patchReorderStops.current = async (date, team_id, stops) => {
      try {
        await axios.patch('/api/schedule/reorder', { date, team_id, stops }, { withCredentials: true });
        lastReorderError.current = null;
      } catch (e) {
        const msg = e?.response?.data?.error || e?.response?.data?.message || 'Failed to save stop order';
        if (lastReorderError.current !== msg) {
          showToast?.(msg, 3500);
          lastReorderError.current = msg;
        }
      }
    };
  }, [showToast]);

  const dayKeys = useMemo(() => days.map((d) => ymd(d)), [days]);
  const stopOrderStorageKey = 'payhive-stop-order-v1';
  const [orderByDate, setOrderByDate] = useState(() => {
    if (typeof window === 'undefined') return new Map();
    try {
      const raw = localStorage.getItem(stopOrderStorageKey);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw);
      return new Map(Object.entries(parsed || {}));
    } catch {
      return new Map();
    }
  });

  const persistOrder = useCallback((map) => {
    if (typeof window === 'undefined') return;
    try {
      const obj = {};
      for (const [k, v] of map.entries()) obj[k] = v;
      localStorage.setItem(stopOrderStorageKey, JSON.stringify(obj));
    } catch {}
  }, []);

  const stopId = useCallback((occ) => `${occ?.rule_id || 'r'}-${occ?.customer?.id || 'c'}-${occ?.date || 'd'}`, []);

  // ensure stored order includes current items (and drop stale)
  useEffect(() => {
    const next = new Map(orderByDate);
    let changed = false;
    for (const k of dayKeys) {
      const items = occurrences.filter((o) => o.date === k);
      const ids = items.map(stopId);
      const existing = Array.isArray(next.get(k)) ? next.get(k) : [];
      const filtered = existing.filter((id) => ids.includes(id));
      const missing = ids.filter((id) => !filtered.includes(id));
      const merged = [...filtered, ...missing];
      if (JSON.stringify(merged) !== JSON.stringify(existing)) {
        next.set(k, merged);
        changed = true;
      }
    }
    if (changed) {
      setOrderByDate(next);
      persistOrder(next);
    }
  }, [occurrences, dayKeys, stopId, orderByDate, persistOrder]);

  const itemsByDate = useMemo(() => {
    const m = new Map();
    for (const k of dayKeys) m.set(k, []);
    for (const occ of occurrences) {
      const k = occ.date;
      if (m.has(k)) m.get(k).push(occ);
    }
    for (const [, arr] of m) {
      const key = arr[0]?.date ? String(arr[0].date).slice(0, 10) : null;
      const order = key ? orderByDate.get(key) : null;
      arr.sort((a, b) => {
        const aId = stopId(a);
        const bId = stopId(b);
        const aIdx = order ? order.indexOf(aId) : -1;
        const bIdx = order ? order.indexOf(bId) : -1;
        if (aIdx >= 0 && bIdx >= 0 && aIdx !== bIdx) return aIdx - bIdx;
        const ma = startTimes.get(keyFor(a.rule_id, a.date));
        const mb = startTimes.get(keyFor(b.rule_id, b.date));
        if ((ma ?? Infinity) !== (mb ?? Infinity)) return (ma ?? Infinity) - (mb ?? Infinity);
        return (a.customer?.name || '').localeCompare(b.customer?.name || '');
      });
    }
    return m;
  }, [dayKeys, occurrences, startTimes, orderByDate, stopId]);

  const [openKeys, setOpenKeys] = useState(() => (alwaysOpen ? new Set(dayKeys) : new Set()));
  const toggleKey = useCallback((key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /** Format YMD using UTC so the calendar date doesn’t drift */
  const labelUTC = (ymdStr) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${ymdStr}T00:00:00Z`));

  // Decide if Complete button should show for an occurrence
  const shouldShowComplete = useCallback(
    (occ, invStatus) => {
      const show = !!canManage && !occ?.completed;
      return show;
    },
    [canManage]
  );

  // --- Payment field normalization helpers (works with old or new API shapes) ---
  const normalizePaymentFields = useCallback(
    (occ) => {
      // server may provide these new fields already
      const serverHasCard =
        occ?.has_card ??
        occ?.customer?.has_card_on_file ??
        false;

      // optional legacy selector function provided by parent
      const legacyHasCard = hasCard?.(occ) === true;

      const hasCardProp = Boolean(serverHasCard || legacyHasCard);

      const invoice_total_cents =
        Number(occ?.invoice_total_cents ?? invoiceFor?.(occ)?.total_cents ?? 0);

      // prefer normalized status from server, then raw, then parent statusFor
      const invoice_status =
        occ?.invoice_status_normalized ??
        occ?.invoice_status ??
        statusFor?.(occ)?.status ??
        null;

      const isPaidLike = isPaidLikeStatus(invoice_status);

      // If server precalculated, prefer it; otherwise derive locally
      const derivedActionable =
        orgCanCollect &&
        hasCardProp &&
        !isPaidLike &&
        (invoice_status !== 'draft') &&
        invoice_total_cents > 0;

      const actionable = Boolean(
        (occ?.can_charge !== undefined ? occ.can_charge : derivedActionable)
      );

      return {
        hasCardProp,
        invoice_status,
        isPaidLike,
        actionable,
        invoice_total_cents,
      };
    },
    [hasCard, invoiceFor, orgCanCollect, statusFor]
  );

  // Debug: log which props we pass into ScheduleCard for payment UI
  useEffect(() => {
    if (!DEBUG_PAY) return;
    try {
      const sample = occurrences.slice(0, 50); // avoid giant spam
      for (const occ of sample) {
        const { hasCardProp, invoice_status, isPaidLike, actionable } = normalizePaymentFields(occ);
        const idStr = `occ rule=${occ?.rule_id} cust=${occ?.customer?.id} date=${occ?.date}`;
        // eslint-disable-next-line no-console
        console.log(
          `[ScheduleList] payment-props  ${occ?.customer?.name || occ?.customer?.email || 'Unknown Customer'}`,
          {
            idStr,
            canManage,
            invoice_id: occ?.invoice_id ?? null,
            inv_status: invoice_status ?? 'none',
            hasCard: hasCardProp,
            pending: isPending?.(occ) ?? false,
            actionable,
            orgCanCollect,
          }
        );
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DEBUG_PAY, occurrences, orgCanCollect]);

  const renderGroup = (group) => (
    <ul className="space-y-4">
      {group.map((occ, idx) => {
        const inv = statusFor ? statusFor(occ) : { status: 'none' };
        const { hasCardProp, invoice_status, actionable } = normalizePaymentFields(occ);
        const showComplete = shouldShowComplete(occ, inv.status);
        const k = occ.date;
        const order = orderByDate.get(k) || [];
        const move = (from, to) => {
          const nextArr = [...order];
          const id = stopId(occ);
          if (!nextArr.length) {
            group.forEach((g) => nextArr.push(stopId(g)));
          }
          const curIdx = nextArr.indexOf(id);
          const startIdx = curIdx >= 0 ? curIdx : from;
          nextArr.splice(startIdx, 1);
          nextArr.splice(to, 0, id);
          const nextMap = new Map(orderByDate);
          nextMap.set(k, nextArr);
          setOrderByDate(nextMap);
          persistOrder(nextMap);
          // Best-effort persist to backend
          try {
            const stops = nextArr.map((sid, i) => {
              const found = group.find((g) => stopId(g) === sid);
              const stopType = found?.stop_type || 'job';
              const stopIdVal = found?.rule_id || found?.schedule_rule_id || found?.occurrence_id || sid;
              return {
                stop_id: stopIdVal,
                schedule_rule_id: found?.rule_id ?? found?.schedule_rule_id ?? null,
                stop_type: stopType,
                stop_order: i + 1,
                occurrence_date: found?.date || k,
                team_id: found?.team_id ?? occ?.team_id ?? null,
              };
            });
            patchReorderStops?.current?.(k, occ?.team_id ?? null, stops);
          } catch {}
        };
        const moveUp = () => move(idx, Math.max(0, idx - 1));
        const moveDown = () => move(idx, Math.min(group.length - 1, idx + 1));

        return (
          <li
            key={`${occ.rule_id}-${occ.customer?.id}-${occ.date}`}
            className="flex flex-col sm:flex-row gap-3 items-start"
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData('text/plain'));
              if (Number.isFinite(from)) move(from, idx);
            }}
          >
            <div className="flex items-center gap-2 sm:flex-col sm:pt-2 sm:min-w-[70px]">
              <div className="text-xs text-neutral-500">Stop {idx + 1}</div>
              <GripVertical className="w-4 h-4 text-neutral-500 hidden sm:block cursor-grab" title="Drag to reorder" />
              <div className="flex items-center gap-1">
                <button type="button" onClick={moveUp} className="p-1 rounded border hover:bg-neutral-50" aria-label="Move up" title="Move up">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={moveDown} className="p-1 rounded border hover:bg-neutral-50" aria-label="Move down" title="Move down">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <ScheduleCard
                occ={occ}
                mins={startTimes.get(keyFor(occ.rule_id, occ.date))}
                inv={inv}
                pending={isPending?.(occ)}
                canManage={canManage}
                // legacy prop name kept for API compatibility:
                hasCard={hasCardProp}
                // explicit props many cards look for:
                hasCardProp={hasCardProp}
                orgCanCollect={orgCanCollect}
                invoice_status={invoice_status}
                actionable={actionable}
                onQuickReschedule={onQuickReschedule}
                onComplete={showComplete ? () => onComplete?.(occ) : undefined}
                onStartWork={onStartWork ? (loc, opts) => onStartWork(occ, loc, opts) : undefined}
                orgBusinessHours={orgBusinessHours}
                hideQuickDropdown={hideQuickDropdown}
                enableTeamReassign={enableTeamReassign}
                onReassignTeam={onReassignTeam}
                teams={teams}
                invoiceFor={invoiceFor}
                showComplete={showComplete}
                showToast={showToast}
                showPaymentAudit={showPaymentAudit}
                pendingScheduleChanges={pendingScheduleChanges}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-6">
      {dayKeys.map((key) => {
        const items = itemsByDate.get(key) || [];
        const isOpen = openKeys.has(key);

        return (
          <section key={key} className="rounded-xl border bg-white overflow-visible">
            {alwaysOpen ? (
              <div className="w-full flex items-center justify-between px-4 sm:px-6 py-3 bg-neutral-50 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-sm sm:text-base font-semibold text-neutral-800">
                    {labelUTC(key)}
                  </span>
                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-neutral-200/70 text-neutral-700">
                    {items.length}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => toggleKey(key)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-3 bg-neutral-50 hover:bg-neutral-100 border-b"
                aria-expanded={isOpen}
                aria-controls={`day-panel-${key}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm sm:text-base font-semibold text-neutral-800">
                    {labelUTC(key)}
                  </span>
                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-neutral-200/70 text-neutral-700">
                    {items.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-neutral-600 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}

            {isOpen && (
              <div id={`day-panel-${key}`}>
                {items.length === 0 ? (
                  <div className="px-4 sm:px-6 py-5 text-neutral-600">No items</div>
                ) : groupByTeam ? (
                  <div className="divide-y">
                    {Object.entries(
                      items.reduce((acc, occ) => {
                        const label = teamLabelOf(occ, teams);
                        (acc[label] ||= []).push(occ);
                        return acc;
                      }, {})
                    ).map(([label, group]) => (
                      <div key={label} className="px-4 sm:px-6 py-4">
                        <div className="mb-3 text-sm font-semibold text-neutral-700">{label}</div>
                        {renderGroup(group)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="divide-y">
                    {items.map((occ) => {
                      const inv = statusFor ? statusFor(occ) : { status: 'none' };
                      const { hasCardProp, invoice_status, actionable } = normalizePaymentFields(occ);
                      const showComplete = shouldShowComplete(occ, inv.status);
                      return (
                        <li
                          key={`${occ.rule_id}-${occ.customer?.id}-${occ.date}`}
                          className="px-4 sm:px-6 py-5"
                        >
                          <ScheduleCard
                            occ={occ}
                            mins={startTimes.get(keyFor(occ.rule_id, occ.date))}
                            inv={inv}
                            pending={isPending?.(occ)}
                            canManage={canManage}
                            hasCard={hasCardProp}
                            hasCardProp={hasCardProp}
                            orgCanCollect={orgCanCollect}
                            invoice_status={invoice_status}
                          actionable={actionable}
                          onQuickReschedule={onQuickReschedule}
                          onComplete={showComplete ? () => onComplete?.(occ) : undefined}
                          orgBusinessHours={orgBusinessHours}
                          hideQuickDropdown={hideQuickDropdown}
                          enableTeamReassign={enableTeamReassign}
                          onReassignTeam={onReassignTeam}
                          teams={teams}
                          invoiceFor={invoiceFor}
                          showComplete={showComplete}
                          showPaymentAudit={showPaymentAudit}
                          pendingScheduleChanges={pendingScheduleChanges}
                        />
                      </li>
                    );
                  })}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
