// src/components/admin/ScheduleHoursEditor.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

console.log('[ScheduleHoursEditor v3.7.1] loaded');

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const toKey = (d) => d.toLowerCase();

/* ---------- value <-> state helpers ---------- */
const normalizeHours = (val) => {
  let raw = val;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = {}; }
  }
  raw = raw && typeof raw === 'object' ? raw : {};
  const hasAnyData = Object.keys(raw).length > 0;
  const out = {};
  for (const d of DAYS) {
    const k = toKey(d);
    const item = raw[k] || {};
    // Default: Mon-Fri 9-5, Sat/Sun closed
    const isWeekend = k === 'sunday' || k === 'saturday';
    const defaultOpen = isWeekend ? '' : '9:00 AM';
    const defaultClose = isWeekend ? '' : '5:00 PM';
    const defaultClosed = isWeekend;
    out[k] = {
      open: typeof item.open === 'string' ? item.open : (hasAnyData ? '' : defaultOpen),
      close: typeof item.close === 'string' ? item.close : (hasAnyData ? '' : defaultClose),
      closed: hasAnyData ? !!item.closed : defaultClosed,
    };
  }
  return out;
};

const hoursEqual = (a, b) => {
  if (!a || !b) return false;
  for (const d of DAYS) {
    const k = toKey(d);
    const A = a[k] || {};
    const B = b[k] || {};
    if (A.open !== B.open || A.close !== B.close || !!A.closed !== !!B.closed) return false;
  }
  return true;
};

/* ---------- time parsing/formatting ---------- */
const cleanInt = (s) => (s === '' ? NaN : parseInt(String(s).replace(/\D/g, ''), 10));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function parseFlexibleTime(input) {
  const s = String(input || '').trim().toLowerCase();

  let meridian = null;
  if (/\bam\b/.test(s)) meridian = 'AM';
  if (/\bpm\b/.test(s)) meridian = 'PM';

  let digits = s.replace(/[^0-9:]/g, '');
  let h = NaN, m = NaN;

  if (digits.includes(':')) {
    const [hs, ms = ''] = digits.split(':');
    h = cleanInt(hs);
    m = ms === '' ? 0 : cleanInt(ms);
  } else {
    if (digits.length >= 3) {
      const ms = digits.slice(-2);
      const hs = digits.slice(0, -2);
      h = cleanInt(hs);
      m = cleanInt(ms);
    } else {
      h = cleanInt(digits);
      m = 0;
    }
  }

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  if (h === 0) { h = 12; meridian = meridian ?? 'AM'; }
  else if (h === 12) { meridian = meridian ?? 'PM'; }
  else if (h > 12) { meridian = 'PM'; h = h - 12; }

  h = clamp(h, 1, 12);
  m = clamp(m, 0, 59);

  return { h12: h, m, meridian: meridian ?? 'AM' };
}

const fmt2 = (n) => String(n).padStart(2, '0');
const toDisplay = ({ h12, m, meridian }) => `${h12}:${fmt2(m)} ${meridian}`;

/* ---------- Native time input helpers ---------- */
// Convert "9:00 AM" to "09:00" (24-hour for native input)
const to24Hour = (timeStr) => {
  const parsed = parseFlexibleTime(timeStr);
  if (!parsed) return '';
  let h24 = parsed.h12;
  if (parsed.meridian === 'AM' && h24 === 12) h24 = 0;
  else if (parsed.meridian === 'PM' && h24 !== 12) h24 += 12;
  return `${fmt2(h24)}:${fmt2(parsed.m)}`;
};

// Convert "14:30" (24-hour) to "2:30 PM"
const from24Hour = (time24) => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const meridian = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return toDisplay({ h12: h, m, meridian });
};

// Time dropdown options (15-min increments)
const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${fmt2(h)}:${fmt2(m)}`);
  }
}
const formatTimeOption = (t) => {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const mer = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${mer}`;
};

/* ---------- Time triple (compact + no wrap) ---------- */
function TimeTriple({ value, disabled, onChange, defaultMeridian = 'AM' }) {
  const m = /^\s*(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)\s*$/i.exec(String(value || ''));
  const [h, setH] = useState(m ? m[1] : '');
  const [mm, setMM] = useState(m ? m[2] : '');
  const [mer, setMer] = useState(m ? m[3].toUpperCase() : defaultMeridian);

  useEffect(() => {
    const mx = /^\s*(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)\s*$/i.exec(String(value || ''));
    setH(mx ? mx[1] : '');
    setMM(mx ? mx[2] : '');
    setMer(mx ? mx[3].toUpperCase() : defaultMeridian);
  }, [value, defaultMeridian]);

  const tryEmit = (hPart, mPart, merPart) => {
    const hNum = cleanInt(hPart);
    const mNum = cleanInt(mPart);
    if (!Number.isNaN(hNum) && !Number.isNaN(mNum)) {
      const h12 = clamp(hNum, 1, 12);
      const min = clamp(mNum, 0, 59);
      const meridian = (merPart || mer || defaultMeridian).toUpperCase();
      onChange?.(toDisplay({ h12, m: min, meridian }));
    }
  };

  const normalizeAndCommit = () => {
    const mmVal = String(mm).trim() === '' ? '00' : mm;
    const parsed = parseFlexibleTime(`${h}:${mmVal} ${mer}`);
    if (parsed) {
      setH(String(parsed.h12));
      setMM(fmt2(parsed.m));
      setMer(parsed.meridian);
      onChange?.(toDisplay(parsed));
    } else {
      if (!String(h).trim() && !String(mm).trim()) onChange?.('');
    }
  };

  const stopAll = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div
      className="flex items-center gap-1 whitespace-nowrap"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={h}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d]/g, '').slice(0, 2);
          setH(v);
          tryEmit(v, mm, mer);
        }}
        onBlur={normalizeAndCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { stopAll(e); normalizeAndCommit(); }
          else e.stopPropagation();
        }}
        placeholder="hh"
        className="w-10 text-center border rounded-md px-1 py-1"
        aria-label="Hour"
      />
      <span className="text-neutral-500">:</span>
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={mm}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d]/g, '').slice(0, 2);
          setMM(v);
          tryEmit(h, v, mer);
        }}
        onBlur={normalizeAndCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { stopAll(e); normalizeAndCommit(); }
          else e.stopPropagation();
        }}
        placeholder="mm"
        className="w-10 text-center border rounded-md px-1 py-1"
        aria-label="Minute"
      />
      <select
        disabled={disabled}
        value={mer}
        onChange={(e) => { setMer(e.target.value); normalizeAndCommit(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { stopAll(e); normalizeAndCommit(); }
          else e.stopPropagation();
        }}
        onBlur={normalizeAndCommit}
        className="w-14 border rounded-md px-1 py-1"
        aria-label="AM/PM"
      >
        <option>AM</option>
        <option>PM</option>
      </select>
    </div>
  );
}

/* ======================== Component ======================== */
export default function ScheduleHoursEditor({ value, onChange }) {
  const [hours, setHours] = useState(() => normalizeHours(value));
  const lastPropRef = useRef(hours);
  const lastSentRef = useRef(hours);
  const skipEmitRef = useRef(false);

  useEffect(() => {
    const next = normalizeHours(value);
    if (!hoursEqual(lastPropRef.current, next)) {
      lastPropRef.current = next;
      skipEmitRef.current = true;
      setHours(next);
    }
  }, [value]);

  useEffect(() => {
    if (skipEmitRef.current) {
      skipEmitRef.current = false;
      lastSentRef.current = hours;
      return;
    }
    if (!hoursEqual(hours, lastSentRef.current)) {
      lastSentRef.current = hours;
      onChange?.(hours);
    }
  }, [hours, onChange]);

  const setField = (key, field, val) => {
    setHours((prev) => {
      const next = { ...prev, [key]: { ...prev[key], [field]: val } };
      return next;
    });
  };

  const copyMonToFri = () => {
    setHours((prev) => {
      const mon = prev.monday;
      const next = {
        ...prev,
        tuesday: { ...mon },
        wednesday: { ...mon },
        thursday: { ...mon },
        friday: { ...mon },
      };
      return next;
    });
  };

  const rows = useMemo(
    () => DAYS.map((d) => ({ label: d, key: toKey(d), ...(hours[toKey(d)] || {}) })),
    [hours]
  );

  // Only suppress key events so outer pages don't trap shortcuts; let clicks through.
  const stopKey = (e) => e.stopPropagation();

  return (
    <div
      className="space-y-3 sm:space-y-4"
      onKeyDownCapture={stopKey}
      onKeyUpCapture={stopKey}
    >
      {/* Actions */}
      <div className="flex justify-center sm:justify-start max-w-[720px] mx-auto">
        <button
          type="button"
          onClick={copyMonToFri}
          className="px-4 py-2 text-sm font-medium border border-neutral-300 rounded-full hover:border-amber-500 hover:text-amber-600 transition-colors"
        >
          Copy Mon → Fri
        </button>
      </div>

      {/* Desktop table: Day | Closed | Open | Close */}
      <div className="hidden md:block">
        <div className="max-w-[720px] mx-auto">
          <table className="w-full border-collapse border text-sm bg-white">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[8%]" />
              <col className="w-[29%]" />
              <col className="w-[29%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Day</th>
                <th className="border p-2 text-center">Closed</th>
                <th className="border p-2 text-left">Open</th>
                <th className="border p-2 text-left">Close</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, key, open, close, closed }) => (
                <tr key={key}>
                  <td className="border p-2">{label.slice(0, 3)}</td>
                  <td className="border p-2 text-center align-middle">
                    <input
                      aria-label={`${label} closed`}
                      type="checkbox"
                      checked={closed}
                      onChange={(e) => setField(key, 'closed', e.target.checked)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="border p-2 align-middle">
                    <TimeTriple
                      value={open}
                      disabled={closed}
                      onChange={(v) => setField(key, 'open', v)}
                      defaultMeridian="AM"
                    />
                  </td>
                  <td className="border p-2 align-middle">
                    <TimeTriple
                      value={close}
                      disabled={closed}
                      onChange={(v) => setField(key, 'close', v)}
                      defaultMeridian="PM"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[11px] text-neutral-500 mt-2">
            Type <span className="tabular-nums">9</span>, <span className="tabular-nums">930</span>,{' '}
            <span className="tabular-nums">9:30</span>, or <span className="tabular-nums">14:30</span>. We normalize to{' '}
            <span className="tabular-nums">h:mm AM/PM</span> on blur/Enter or AM/PM change. <strong>(Hours editor v3.7.1)</strong>
          </div>
        </div>
      </div>

      {/* Mobile - stacked layout with day as header */}
      <div className="md:hidden space-y-3 overflow-hidden">
        {rows.map(({ label, key, open, close, closed }) => (
          <div
            key={key}
            className={`px-4 py-3 rounded-xl border ${closed ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-200 bg-white'}`}
          >
            {/* Day header */}
            <div className={`font-semibold mb-2 ${closed ? 'text-neutral-400' : 'text-neutral-800'}`}>
              {label}
            </div>

            {/* Toggle + times row */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={!closed}
                aria-label={`${label} open or closed`}
                onClick={() => setField(key, 'closed', !closed)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  closed ? 'bg-neutral-300' : 'bg-amber-500'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    closed ? 'translate-x-0' : 'translate-x-5'
                  }`}
                />
              </button>

              {closed ? (
                <span className="text-neutral-400 text-sm">Closed</span>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <select
                    value={to24Hour(open)}
                    onChange={(e) => setField(key, 'open', from24Hour(e.target.value))}
                    className="appearance-none border border-neutral-300 rounded-full px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white cursor-pointer"
                    aria-label={`${label} open time`}
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeOption(t)}</option>)}
                  </select>
                  <span className="text-neutral-400 flex-shrink-0">–</span>
                  <select
                    value={to24Hour(close)}
                    onChange={(e) => setField(key, 'close', from24Hour(e.target.value))}
                    className="appearance-none border border-neutral-300 rounded-full px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white cursor-pointer"
                    aria-label={`${label} close time`}
                  >
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeOption(t)}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
