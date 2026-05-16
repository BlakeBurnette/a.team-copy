// src/components/common/TimeField.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Mobile-friendly, keyboard-first 12h time input with AM/PM.
 * Emits 24h "HH:MM" (or "" if incomplete).
 */
export default function TimeField({
  value = '',
  onChange,
  step = 15,
  disabled = false,
  className = '',
}) {
  // ---------- parse incoming ----------
  const initial = useMemo(() => {
    if (!/^\d{2}:\d{2}$/.test(String(value || ''))) {
      return { h: '', m: '', ampm: 'AM' };
    }
    const [HH, MM] = value.split(':').map((s) => parseInt(s, 10));
    const ampm = HH >= 12 ? 'PM' : 'AM';
    const h12 = HH % 12 === 0 ? 12 : HH % 12;
    return { h: String(h12).padStart(2, '0'), m: String(MM).padStart(2, '0'), ampm };
  }, [value]);

  const [h, setH] = useState(initial.h);
  const [m, setM] = useState(initial.m);
  const [ampm, setAmPm] = useState(initial.ampm);

  useEffect(() => {
    setH(initial.h);
    setM(initial.m);
    setAmPm(initial.ampm);
  }, [initial.h, initial.m, initial.ampm]);

  // ---------- refs for auto-advance / backspace nav ----------
  const hourRef = useRef(null);
  const minRef = useRef(null);
  const merRef = useRef(null);

  // ---------- helpers ----------
  const clamp2 = (s) => String(s || '').replace(/\D/g, '').slice(0, 2);

  const emit = (hh, mm, mer) => {
    const H = parseInt(hh, 10);
    const M = parseInt(mm, 10);
    if (Number.isFinite(H) && H >= 1 && H <= 12 && Number.isFinite(M) && M >= 0 && M < 60) {
      let H24 = H % 12;
      if (mer === 'PM') H24 += 12;
      onChange?.(`${String(H24).padStart(2, '0')}:${String(M).padStart(2, '0')}`);
    } else {
      onChange?.('');
    }
  };

  const bumpHour = (dir) => {
    const cur = parseInt(h || '12', 10);
    let next = cur + dir;
    if (next < 1) next = 12;
    if (next > 12) next = 1;
    const hh = String(next).padStart(2, '0');
    setH(hh);
    emit(hh, m || '00', ampm);
  };

  const bumpMinute = (dir) => {
    const cur = Number.isFinite(parseInt(m, 10)) ? parseInt(m, 10) : 0;
    let mm = cur + dir * step;

    let newH = parseInt(h || '12', 10);
    let newMer = ampm;

    while (mm < 0) {
      mm += 60;
      newH -= 1;
      if (newH < 1) {
        newH = 12;
        newMer = newMer === 'AM' ? 'PM' : 'AM';
      }
    }
    while (mm >= 60) {
      mm -= 60;
      newH += 1;
      if (newH > 12) {
        newH = 1;
        newMer = newMer === 'AM' ? 'PM' : 'AM';
      }
    }

    const hh = String(newH).padStart(2, '0');
    const mmStr = String(mm).padStart(2, '0');
    setH(hh);
    setM(mmStr);
    setAmPm(newMer);
    emit(hh, mmStr, newMer);
  };

  const snapMinuteOnBlur = () => {
    if (!m) return;
    const cur = parseInt(m, 10);
    if (!Number.isFinite(cur)) return;
    const snapped = Math.max(0, Math.min(59, Math.round(cur / step) * step));
    const mm = String(snapped).padStart(2, '0');
    setM(mm);
    emit(h || '12', mm, ampm);
  };

  // ---------- styles ----------
  // Keep font-size ≥16px to prevent iOS zoom; compact widths; allow AM/PM to wrap.
  const inputCls =
    'text-center border rounded outline-none disabled:bg-gray-100 ' +
    'focus:ring-2 focus:ring-neutral-300 ' +
    'h-11 w-12 text-base px-2 ' +     // compact for tight 2-col mobile cards
    'sm:h-12 sm:w-14 sm:px-3 ' +      // a bit roomier on slightly larger screens
    'md:h-9 md:w-12 md:text-sm';      // compact on md+

  const selectCls =
    'border rounded outline-none bg-white disabled:bg-gray-100 ' +
    'focus:ring-2 focus:ring-neutral-300 ' +
    'h-11 text-base px-2 shrink-0 w-16 ' + // fixed width so it doesn’t overflow; wraps if needed
    'md:h-9 md:text-sm md:w-auto';

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-2 ${className}`}>
      {/* HH:MM group stays together; AM/PM can wrap below on narrow screens */}
      <div className="inline-flex items-center gap-2">
        {/* Hour */}
        <input
          ref={hourRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Hour"
          placeholder="hh"
          className={inputCls}
          disabled={disabled}
          value={h}
          onChange={(e) => {
            const v = clamp2(e.target.value);
            const n = parseInt(v, 10);
            const fixed = v && (n < 1 ? '01' : n > 12 ? '12' : v);
            setH(fixed);
            emit(fixed, m || '00', ampm);
            if (fixed?.length === 2) minRef.current?.focus();
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'ArrowUp') { e.preventDefault(); bumpHour(+1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); bumpHour(-1); }
            if (e.key === ':') { e.preventDefault(); minRef.current?.focus(); }
          }}
        />

        <span className="opacity-60 select-none">:</span>

        {/* Minute */}
        <input
          ref={minRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Minute"
          placeholder="mm"
          className={inputCls}
          disabled={disabled}
          value={m}
          onChange={(e) => {
            const v = clamp2(e.target.value);
            const n = parseInt(v || '0', 10);
            const fixed = v && (n > 59 ? '59' : v);
            setM(fixed);
            emit(h || '12', fixed, ampm);
            if (fixed?.length === 2) merRef.current?.focus();
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'ArrowUp') { e.preventDefault(); bumpMinute(+1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); bumpMinute(-1); }
            if (e.key === 'Backspace' && !m) { e.preventDefault(); hourRef.current?.focus(); }
          }}
          onBlur={snapMinuteOnBlur}
        />
      </div>

      {/* AM/PM — wraps under the HH:MM group on very narrow widths */}
      <select
        ref={merRef}
        aria-label="AM or PM"
        className={selectCls}
        disabled={disabled}
        value={ampm}
        onChange={(e) => {
          const mer = e.target.value === 'PM' ? 'PM' : 'AM';
          setAmPm(mer);
          emit(h || '12', m || '00', mer);
        }}
      >
        <option>AM</option>
        <option>PM</option>
      </select>
    </div>
  );
}
