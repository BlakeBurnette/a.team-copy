// src/components/common/StatusPill.jsx
import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';

function cx(...xs) {
  return xs.filter(Boolean).join(' ');
}

/** Map common backend statuses -> UI tone */
export function toneForStatus(raw) {
  const s = String(raw || '').toLowerCase();

  // Stripe-ish
  if (s === 'succeeded' || s === 'paid') return 'success';
  if (s === 'processing' || s === 'sent' || s === 'scheduled' || s === 'pending') return 'info';
  if (s === 'requires_capture' || s === 'requires_payment_method' || s === 'disputed') return 'warn';
  if (s === 'canceled' || s === 'refunded' || s === 'failed' || s === 'void') return 'danger';

  // App statuses
  if (s === 'active') return 'success';
  if (s === 'paused' || s === 'open') return 'warn';
  if (s === 'archived' || s === 'inactive') return 'neutral';
  if (s === 'draft') return 'neutral';

  return 'neutral';
}

/**
 * StatusPill
 *
 * Props:
 * - status: string (optional) – used to infer tone (via toneForStatus) and default label (uppercased w/ spaces)
 * - tone: 'neutral' | 'success' | 'warn' | 'danger' | 'info' (optional) – overrides inferred tone
 * - children: custom label (fallback to prettified `status`)
 * - size: 'xs' | 'sm' | 'md' (default 'sm')
 * - variant: 'soft' | 'solid' | 'outline' (default 'soft')
 * - icon: boolean | ReactNode (default true) – true adds a default icon per tone; pass node to override; false for none
 * - className: extra classes
 * - title: hover title
 */
export default function StatusPill({
  status,
  tone,
  children,
  size = 'sm',
  variant = 'soft',
  icon = true,
  className = '',
  title,
}) {
  const _tone = tone || toneForStatus(status);
  const label =
    children ??
    (status
      ? String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : '');

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size] || sizes?.sm;

  const palette = {
    neutral: {
      soft: 'bg-neutral-100 text-neutral-800 border-neutral-200',
      solid: 'bg-neutral-700 text-white border-neutral-700',
      outline: 'bg-transparent text-neutral-700 border-neutral-300',
      icon: <Info className="h-3.5 w-3.5" />,
    },
    success: {
      soft: 'bg-green-50 text-green-800 border-green-200',
      solid: 'bg-green-600 text-white border-green-600',
      outline: 'bg-transparent text-green-700 border-green-300',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    warn: {
      soft: 'bg-amber-50 text-amber-900 border-amber-200',
      solid: 'bg-amber-600 text-white border-amber-600',
      outline: 'bg-transparent text-amber-800 border-amber-300',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    danger: {
      soft: 'bg-red-50 text-red-800 border-red-200',
      solid: 'bg-red-600 text-white border-red-600',
      outline: 'bg-transparent text-red-700 border-red-300',
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
    info: {
      soft: 'bg-blue-50 text-blue-800 border-blue-200',
      solid: 'bg-zinc-600 text-white border-zinc-600',
      outline: 'bg-transparent text-blue-700 border-blue-300',
      icon: <Info className="h-3.5 w-3.5" />,
    },
  };

  const theme = palette[_tone] || palette.neutral;

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        sizes,
        theme[variant] || theme.soft,
        className
      )}
      title={title || (typeof status === 'string' ? status : undefined)}
    >
      {icon === true ? theme.icon : icon || null}
      {label}
    </span>
  );
}
