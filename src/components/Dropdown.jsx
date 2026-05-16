// src/components/Dropdown.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

function cx(...xs) {
  return xs.filter(Boolean).join(' ');
}

/**
 * Controlled Dropdown
 * - options: [{ value: string|number, label: string, disabled?: boolean }]
 * - value: string|number|''|null
 * - onChange: (value) => void
 * - multiple: when true, value is an array and onChange receives an array
 * - renderButton / renderOption: optional render props for custom UI
 */
const Dropdown = ({
  label,
  options = [],
  value = '',
  onChange,
  renderButton,
  renderOption,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  fullWidth = true,
  multiple = false,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const selectedValues = useMemo(
    () => (multiple && Array.isArray(value) ? value : []),
    [multiple, value]
  );

  const selected = useMemo(() => {
    if (multiple) {
      return options.filter((o) =>
        selectedValues.some((v) => String(v) === String(o.value))
      );
    }
    return options.find((o) => String(o.value) === String(value)) || null;
  }, [multiple, options, selectedValues, value]);

  // Close on outside click / Esc
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (btnRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Simple keyboard navigation
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const idx = Math.max(
      0,
      options.findIndex((o) =>
        multiple
          ? selectedValues.some((v) => String(v) === String(o.value))
          : String(o.value) === String(value)
      )
    );
    if (open) setActiveIndex(idx);
  }, [multiple, open, options, selectedValues, value]);

  const openOrNavigate = (e) => {
    if (disabled) return;
    if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      let i = activeIndex;
      for (let k = 0; k < options.length; k++) {
        i = (i + 1) % options.length;
        if (!options[i]?.disabled) break;
      }
      setActiveIndex(i);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      let i = activeIndex;
      for (let k = 0; k < options.length; k++) {
        i = (i - 1 + options.length) % options.length;
        if (!options[i]?.disabled) break;
      }
      setActiveIndex(i);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) {
        if (multiple) {
          const hasVal = selectedValues.some((v) => String(v) === String(opt.value));
          const next = hasVal
            ? selectedValues.filter((v) => String(v) !== String(opt.value))
            : [...selectedValues, opt.value];
          onChange?.(next);
        } else {
          onChange?.(opt.value);
          setOpen(false);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const wCls = fullWidth ? 'w-full' : 'w-64';
  const selectedCount = multiple ? selectedValues.length : (selected ? 1 : 0);

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    if (multiple) {
      const hasVal = selectedValues.some((v) => String(v) === String(opt.value));
      const next = hasVal
        ? selectedValues.filter((v) => String(v) !== String(opt.value))
        : [...selectedValues, opt.value];
      onChange?.(next);
      return;
    }
    onChange?.(opt.value);
    setOpen(false);
  };

  const baseButtonProps = {
    ref: btnRef,
    type: 'button',
    disabled,
    onClick: () => !disabled && setOpen((v) => !v),
    onKeyDown: openOrNavigate,
    'aria-haspopup': 'listbox',
    'aria-expanded': open,
    className: cx(
      'border rounded-lg px-3 py-2 text-left w-full flex items-center justify-between transition-colors',
      'border-stone-200 bg-white',
      'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500',
      disabled && 'opacity-50 pointer-events-none',
      buttonClassName
    ),
  };

  return (
    <div className={cx('relative inline-block', wCls, className)}>
      {label && (
        <label className="block text-sm text-stone-700 mb-1">{label}</label>
      )}

      {renderButton ? (
        renderButton(baseButtonProps, {
          open,
          selected,
          selectedValues,
          toggle: () => !disabled && setOpen((v) => !v),
        })
      ) : (
        <button {...baseButtonProps}>
          <span className={cx(!selectedCount && 'text-stone-400')}>
            {multiple
              ? selectedCount
                ? `${selectedCount} selected`
                : placeholder
              : selected
              ? selected.label
              : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-stone-500" />
        </button>
      )}

      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKey}
          className={cx(
            'absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border bg-white shadow-lg',
            'border-stone-200',
            menuClassName
          )}
        >
          {options.map((opt, i) => {
            const isSelected = multiple
              ? selectedValues.some((v) => String(v) === String(opt.value))
              : String(opt.value) === String(value);
            const isActive = i === activeIndex;
            const { key: optKey, ...optionProps } = {
              role: 'option',
              'aria-selected': isSelected,
              onMouseEnter: () => setActiveIndex(i),
              onClick: () => {
                if (opt.disabled) return;
                handleSelect(opt);
                if (!multiple) setOpen(false);
              },
              className: cx(
                'px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors',
                opt.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : isSelected
                  ? 'bg-zinc-600 text-white font-semibold'
                  : isActive
                  ? 'bg-stone-100 text-stone-900'
                  : 'hover:bg-stone-50 text-stone-700'
              ),
            };

            if (renderOption) {
              return (
                <div key={String(optKey ?? opt.value)} {...optionProps}>
                  {renderOption(opt, {
                    isSelected,
                    isActive,
                    close: () => setOpen(false),
                    toggle: () => handleSelect(opt),
                    optionProps,
                  })}
                </div>
              );
            }

            return (
              <div key={String(optKey ?? opt.value)} {...optionProps}>
                <span className="flex-1">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
