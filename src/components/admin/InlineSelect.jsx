import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const normalizeOptions = (options) =>
  options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

function useOutsideClose({ open, refs, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inside = refs.some((r) => r.current && r.current.contains(e.target));
      if (!inside) onClose?.();
    };
    window.addEventListener('pointerdown', handler, true);
    return () => window.removeEventListener('pointerdown', handler, true);
  }, [open, refs, onClose]);
}

const InlineSelect = ({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  className = '',
  buttonClassName = 'w-full border rounded px-2 py-2 text-sm bg-white text-left',
  closeOnSelect = true, // default: auto-close on selection
}) => {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const opts = useMemo(() => normalizeOptions(options), [options]);
  const selected = useMemo(
    () => opts.find((o) => String(o.value) === String(value)) || null,
    [opts, value]
  );

  const measure = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const left = Math.min(Math.max(8, r.left), vw - 8 - r.width);
    setPos({ top: r.bottom + 4, left, width: r.width });
  };

  useEffect(() => {
    if (!open) return;
    measure();
    const remeasure = () => measure();
    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('resize', remeasure);
    return () => {
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('resize', remeasure);
    };
  }, [open]);

  useOutsideClose({ open, refs: [btnRef, menuRef], onClose: () => setOpen(false) });

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        ref={btnRef}
        className={buttonClassName}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center justify-between w-full">
          <span className={selected ? '' : 'text-gray-500'}>
            {selected ? selected.label : placeholder}
          </span>
          <span aria-hidden className="ml-2">▾</span>
        </span>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border rounded shadow-lg"
        >
          <div className="max-h-56 overflow-auto py-1">
            {opts.map((o) => {
              const isSel = String(o.value) === String(value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    isSel ? 'bg-gray-50 font-medium' : ''
                  }`}
                  onClick={() => {
                    onChange?.(o.value);
                    if (closeOnSelect) setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default InlineSelect;

