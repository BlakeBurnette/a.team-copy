// src/components/dashboard/StatCard.jsx
import React from 'react';

/**
 * Reusable stat card for dashboards
 * @param {string} label - The stat label
 * @param {string|number} value - The main value to display
 * @param {string} [sublabel] - Optional sublabel text
 * @param {React.ReactNode} [icon] - Optional icon component
 * @param {string} [trend] - Optional trend indicator (e.g., "+12%")
 * @param {'up'|'down'|'neutral'} [trendDirection] - Trend direction for coloring
 * @param {'default'|'success'|'warning'|'danger'|'info'} [variant] - Card variant
 * @param {function} [onClick] - Optional click handler
 */
export default function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  variant = 'default',
  onClick,
  className = '',
}) {
  const variants = {
    default: 'bg-white border-neutral-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const iconBg = {
    default: 'bg-neutral-100 text-neutral-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
  };

  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-neutral-500',
  };

  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={`
        rounded-xl border p-4 transition-all
        ${variants[variant]}
        ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-neutral-900 truncate">
            {value}
          </p>
          {sublabel && (
            <p className="text-sm text-neutral-600 mt-0.5">{sublabel}</p>
          )}
          {trend && (
            <p className={`text-sm font-medium mt-1 ${trendColors[trendDirection]}`}>
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconBg[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
