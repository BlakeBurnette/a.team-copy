// src/components/dashboard/FlaggedItemsCard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Flag, AlertCircle, Clock, DollarSign, ChevronRight } from 'lucide-react';

function formatMoney(cents) {
  if (cents == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

/**
 * Flagged items card for admin dashboard
 * Shows A/R items that have been flagged by owners for admin review
 */
export default function FlaggedItemsCard({ onViewAll, onItemClick, className = '' }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;

    const fetchFlaggedItems = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/api/accounts-receivable', {
          withCredentials: true,
          validateStatus: () => true,
        });

        if (!alive) return;

        // Filter to only flagged items
        const outstanding = Array.isArray(data?.outstanding) ? data.outstanding : [];
        const flagged = outstanding.filter((item) => item.flagged === true);
        setItems(flagged);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchFlaggedItems();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 rounded w-1/3" />
          <div className="h-6 bg-neutral-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Don't show if no flagged items
  }

  return (
    <div className={`bg-purple-50 rounded-xl border border-purple-200 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-purple-200 bg-purple-100">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-purple-600" />
          <h3 className="font-semibold text-purple-900">Flagged for Review</h3>
          <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-600 text-white">
            {items.length}
          </span>
        </div>
      </div>

      <div className="divide-y divide-purple-200">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="px-4 py-3 hover:bg-purple-100/50 transition-colors cursor-pointer"
            onClick={() => onItemClick?.(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onItemClick?.(item)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-purple-900 truncate">
                  {item.customer_name || 'Unknown Customer'}
                </p>
                <p className="text-sm text-purple-700 mt-0.5">
                  {formatMoney(item.amount_cents)} • {item.days_outstanding} days outstanding
                </p>
                {item.flag_reason && (
                  <p className="text-xs text-purple-600 mt-1 italic truncate">
                    "{item.flag_reason}"
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.flag_priority === 'urgent'
                    ? 'bg-red-100 text-red-700'
                    : item.flag_priority === 'high'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {item.flag_priority || 'normal'}
                </span>
                <span className="text-xs text-purple-500">
                  {formatRelativeTime(item.flagged_at)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(items.length > 5 || onViewAll) && (
        <div className="px-4 py-2 border-t border-purple-200 bg-purple-100">
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-medium text-purple-700 hover:text-purple-900 flex items-center gap-1"
          >
            View all flagged items
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
