import React from 'react';

function Chevron({ open }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * items: [{ key, title, render: () => <Component/> }]
 * defaultOpenKey: string (panel to open initially)
 * mountOnOpen: if true, only mounts a panel after it’s opened once
 */
export default function Accordion({ items, defaultOpenKey, mountOnOpen = true }) {
  const [openedOnce, setOpenedOnce] = React.useState(() =>
    defaultOpenKey ? new Set([defaultOpenKey]) : new Set()
  );

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <details
          key={it.key}
          className="rounded-lg border"
          defaultOpen={it.key === defaultOpenKey}
          onToggle={(e) => {
            if (e.currentTarget.open) {
              setOpenedOnce((prev) => new Set(prev).add(it.key));
            }
          }}
        >
          <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer">
            <span className="font-semibold">{it.title}</span>
            <Chevron open={undefined /* handled via details[open] CSS rotation */} />
          </summary>

          {/* Panel body */}
          <div className="px-3 pb-3">
            {!mountOnOpen || openedOnce.has(it.key) ? it.render() : null}
          </div>
        </details>
      ))}
    </div>
  );
}
