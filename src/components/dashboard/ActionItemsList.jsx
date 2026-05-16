// src/components/dashboard/ActionItemsList.jsx
import React from 'react';
import { AlertCircle, ChevronRight, Clock } from 'lucide-react';

/**
 * Displays a list of action items that need attention
 * @param {string} title - Section title
 * @param {Array} items - Array of action items
 * @param {function} onItemClick - Handler when an item is clicked
 * @param {function} [renderItem] - Optional custom render function for items
 * @param {string} [emptyMessage] - Message when no items
 * @param {'default'|'warning'|'danger'} [variant] - Visual variant
 */
export default function ActionItemsList({
  title,
  items = [],
  onItemClick,
  renderItem,
  emptyMessage = 'No items',
  variant = 'default',
  maxItems = 5,
  onViewAll,
  className = '',
}) {
  const variants = {
    default: {
      container: 'bg-white border-neutral-200',
      header: 'text-neutral-900',
      dot: 'bg-neutral-400',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200',
      header: 'text-amber-900',
      dot: 'bg-amber-500',
    },
    danger: {
      container: 'bg-red-50 border-red-200',
      header: 'text-red-900',
      dot: 'bg-red-500',
    },
  };

  const v = variants[variant];
  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-xl border ${v.container} ${className}`}>
      <div className="px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${v.dot}`} />
          <h3 className={`font-semibold ${v.header}`}>{title}</h3>
          <span className="text-sm text-neutral-500">({items.length})</span>
        </div>
      </div>

      <div className="divide-y divide-inherit">
        {displayItems.map((item, idx) => (
          <div
            key={item.id || idx}
            className="px-4 py-3 hover:bg-black/5 transition-colors cursor-pointer"
            onClick={() => onItemClick?.(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onItemClick?.(item)}
          >
            {renderItem ? (
              renderItem(item)
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 truncate">
                    {item.title || item.label || item.name}
                  </p>
                  {item.description && (
                    <p className="text-sm text-neutral-600 truncate">{item.description}</p>
                  )}
                  {item.timestamp && (
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </div>
            )}
          </div>
        ))}
      </div>

      {(hasMore || onViewAll) && (
        <div className="px-4 py-2 border-t border-inherit">
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            View all {items.length > maxItems ? `(${items.length - maxItems} more)` : ''} →
          </button>
        </div>
      )}
    </div>
  );
}
