import React from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';

function FieldLabel({ children }) {
  return <label className="text-sm font-medium text-neutral-800">{children}</label>;
}

/* --------------------------- Drop-up DateSelect --------------------------- */
function DateSelect({ value, onChange, options = [], placeholder = 'Select an allowed day…', disabled }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const [menuPos, setMenuPos] = React.useState({ left: 0, top: 0, width: 0 });

  const close = React.useCallback(() => setOpen(false), []);
  const toggle = React.useCallback(() => {
    if (disabled) return;
    if (!open) {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setMenuPos({ left: r.left, top: r.top, width: r.width });
    }
    setOpen((v) => !v);
  }, [open, disabled]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    const onClickAway = (e) => {
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target)) close();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickAway);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickAway);
    };
  }, [open, close]);

  const labelFor = (iso) => {
    if (!iso) return '';
    try { return format(parseISO(String(iso).slice(0, 10)), 'EEE, MMM d'); }
    catch { return String(iso).slice(0, 10); }
  };

  const btnLabel = value ? labelFor(value) : placeholder;

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={toggle}
        className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-left text-sm
                    ${disabled ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-white hover:bg-neutral-50'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {btnLabel}
      </button>

      {open && createPortal(
        <div
          className="fixed z-[9999]"
          style={{
            left: `${menuPos.left}px`,
            width: `${menuPos.width}px`,
            top: `${menuPos.top - 8}px`,
            transform: 'translateY(-100%)', // drop-up
          }}
        >
          <div role="listbox" className="max-h-80 overflow-auto rounded-lg border border-neutral-300 bg-white shadow-xl">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-neutral-500">No allowed days</div>
            ) : (
              options.map((opt) => {
                const v = typeof opt === 'string' ? opt.slice(0, 10) : opt.value;
                const lbl = typeof opt === 'string'
                  ? labelFor(opt)
                  : (opt.label ?? labelFor(opt.value));
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { onChange(v); setOpen(false); }}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-neutral-50
                               ${String(value) === String(v) ? 'bg-amber-50' : ''}`}
                  >
                    {lbl}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* --------------------------- Drop-up TimeSelect --------------------------- */
function TimeSelect({ value, onChange, options = [], placeholder = 'Select a time…', disabled }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const [menuPos, setMenuPos] = React.useState({ left: 0, top: 0, width: 0 });

  const close = React.useCallback(() => setOpen(false), []);
  const toggle = React.useCallback(() => {
    if (disabled) return;
    if (!open) {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setMenuPos({ left: r.left, top: r.top, width: r.width });
    }
    setOpen((v) => !v);
  }, [open, disabled]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    const onClickAway = (e) => {
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target)) close();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickAway);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickAway);
    };
  }, [open, close]);

  const labelFor = (mins) => {
    if (mins == null) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hh = ((h + 11) % 12) + 1;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const btnLabel = value == null ? placeholder : labelFor(Number(value));

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={toggle}
        className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-left text-sm
                    ${disabled ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-white hover:bg-neutral-50'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {btnLabel}
      </button>

      {open && createPortal(
        <div
          className="fixed z-[9999]"
          style={{
            left: `${menuPos.left}px`,
            width: `${menuPos.width}px`,
            top: `${menuPos.top - 8}px`,
            transform: 'translateY(-100%)', // drop-up
          }}
        >
          <div role="listbox" className="max-h-72 overflow-auto rounded-lg border border-neutral-300 bg-white shadow-xl">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-neutral-500">No times</div>
            ) : (
              options.map((mins) => (
                <button
                  key={String(mins)}
                  type="button"
                  onClick={() => { onChange(mins); setOpen(false); }}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-neutral-50
                              ${Number(value) === Number(mins) ? 'bg-amber-50' : ''}`}
                >
                  {labelFor(mins)}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ------------------------------ Main modal ------------------------------- */
export default function RescheduleModal({
  open,
  onClose,
  occurrence,
  dateValue,
  setDateValue,
  timeSlots = [],
  timeMinutes,
  setTimeMinutes,
  onChangeDateFetchSlots,
  onConfirm,
  canManage = true,
  dateOptions = [],
  allowedLabel = '',
}) {
  React.useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  // normalize date options once per render
  const normalizedDates = (Array.isArray(dateOptions) ? dateOptions : [])
    .map((opt) => {
      if (opt && typeof opt === 'object' && 'value' in opt) return opt;
      if (typeof opt === 'string') {
        const iso = opt.slice(0, 10);
        let label;
        try { label = format(parseISO(iso), 'EEE, MMM d'); }
        catch { label = iso; }
        return { value: iso, label };
      }
      return null;
    })
    .filter(Boolean);

  // On open (and when options arrive), ensure a valid date is selected and slots are fetched
  React.useEffect(() => {
    if (!open) return;
    if (!normalizedDates.length) return;

    const occYmd = String(occurrence?.date || '').slice(0, 10);
    const currentValid = dateValue && normalizedDates.some(d => d.value === dateValue);
    if (currentValid) {
      // still ensure slots are present after reopen
      onChangeDateFetchSlots?.(dateValue);
      return;
    }
    const initial = normalizedDates.find(o => o.value === occYmd) || normalizedDates[0];
    if (initial?.value) {
      setDateValue?.(initial.value);
      onChangeDateFetchSlots?.(initial.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, normalizedDates.length]);

  // When slots change, auto-select first valid time (or clear)
  React.useEffect(() => {
    if (!Array.isArray(timeSlots)) return;
    if (!timeSlots.length) { setTimeMinutes?.(null); return; }
    if (!timeSlots.includes(timeMinutes)) setTimeMinutes?.(timeSlots[0]);
  }, [timeSlots, timeMinutes, setTimeMinutes]);

  if (!open) return null;

  const canSave = canManage && !!dateValue; // time optional if server picks first/any

  return (
    <div className="fixed inset-0 z-[9980]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onClose?.()}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl border-t border-neutral-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto w-full max-w-md p-4">
          <div className="mx-auto mb-2 h-1.5 w-14 rounded-full bg-neutral-300" />
          <h3 className="text-lg font-semibold mb-3">Reschedule</h3>

          {/* Summary */}
          {occurrence ? (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm text-neutral-800 mb-4">
              <div className="font-medium">
                {occurrence?.service?.name || occurrence?.service?.label || 'Scheduled Service'}
              </div>
              <div className="text-neutral-700">
                {String(occurrence.date).slice(0, 10)}
              </div>
            </div>
          ) : null}

          {/* Date */}
          <div className="space-y-1 mb-3">
            <FieldLabel>New date</FieldLabel>
            <DateSelect
              value={dateValue || ''}
              onChange={async (ymd) => {
                setDateValue?.(ymd);
                setTimeMinutes?.(null);
                await onChangeDateFetchSlots?.(ymd);
              }}
              options={normalizedDates}
              placeholder={normalizedDates.length ? 'Select an allowed day…' : 'No allowed days'}
              disabled={!canManage || !normalizedDates.length}
            />
          </div>

          {/* Time */}
          <div className="space-y-1 mb-2">
            <FieldLabel>Start time</FieldLabel>
            <TimeSelect
              value={Number.isFinite(timeMinutes) ? Number(timeMinutes) : null}
              onChange={(mins) => setTimeMinutes?.(Number(mins))}
              options={Array.isArray(timeSlots) ? timeSlots : []}
              placeholder="Select a time…"
              disabled={!canManage || !dateValue}
            />
          </div>

          {/* Help text */}
          <div className="text-xs text-neutral-500 mb-4">
            {allowedLabel
              ? `${allowedLabel} — Customer allowed days.`
              : 'Allowed days are enforced by customer preference (weekdays by default).'}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-neutral-300 hover:bg-neutral-50 w-full"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => onConfirm?.()}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md w-full
                          ${canSave ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'}`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
