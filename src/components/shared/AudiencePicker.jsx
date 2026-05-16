// AudiencePicker — LOCAL COPY of @the_payhive/ui AudiencePicker.
//
// Canonical source: /packages/ui/src/AudiencePicker.tsx
// Sync source: the other consumer (hive-listings/src/components/shared/AudiencePicker.tsx)
// Remove this copy once @the_payhive/ui@1.1.0 is published + added as dep.
//
// JSX (not TSX) because payhive/ FE is the JavaScript repo.

import React from 'react';
import { Briefcase, Wrench, Home } from 'lucide-react';

/** Hive-identity stores 'customer' for what we surface as 'homeowner'. */
export function audienceToRole(a) {
  return a === 'homeowner' ? 'customer' : a;
}
export function roleToAudience(r) {
  if (r === 'vendor') return 'vendor';
  if (r === 'customer' || r === 'homeowner') return 'homeowner';
  return 'agent';
}

const OPTIONS = [
  {
    value: 'agent',
    title: "I'm an Agent",
    Icon: Briefcase,
    blurb: 'Run your listings with Sir Walter handling follow-ups and vendor coordination.',
  },
  {
    value: 'vendor',
    title: "I'm a Vendor",
    Icon: Wrench,
    blurb: 'Get jobs routed to you by agents using Listing Hive. No chasing, no invoicing.',
  },
  {
    value: 'homeowner',
    title: "I'm a Homeowner",
    Icon: Home,
    blurb: 'Track your property, work with your agent, keep a record of every service.',
  },
];

const GOLD = '#FFA11E';
const NAVY = '#2E2E2E';
const CREAM = '#FFF8EE';

export function AudiencePicker({ value, onChange, variant = 'pill', disabled, label }) {
  if (variant === 'card') {
    return (
      <div>
        {label && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              color: '#64748b',
              marginBottom: 12,
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {OPTIONS.map((opt) => {
            const selected = opt.value === value;
            const Icon = opt.Icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !disabled && onChange(opt.value)}
                disabled={disabled}
                style={{
                  textAlign: 'left',
                  padding: 20,
                  borderRadius: 12,
                  background: selected ? CREAM : '#fff',
                  border: selected ? `2px solid ${GOLD}` : '1px solid #e5e7eb',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  transition: 'all 120ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  font: 'inherit',
                  color: NAVY,
                }}
              >
                <div style={{ color: selected ? GOLD : '#94a3b8' }}>
                  <Icon size={24} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{opt.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>{opt.blurb}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        background: '#f1f5f9',
        borderRadius: 999,
        padding: 4,
        gap: 4,
      }}
    >
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        const Icon = opt.Icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              background: selected ? '#fff' : 'transparent',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              fontSize: 14,
              fontWeight: 600,
              color: selected ? NAVY : '#64748b',
              boxShadow: selected ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              transition: 'all 120ms ease',
              font: 'inherit',
            }}
          >
            <span style={{ color: selected ? GOLD : '#94a3b8' }}>
              <Icon size={16} />
            </span>
            {opt.title}
          </button>
        );
      })}
    </div>
  );
}
