import React, { useState } from 'react';
import { Send, CreditCard, CalendarCheck, Leaf, MessageSquare } from 'lucide-react';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function deriveSummary(workspace) {
  const { customer, attention_items = [], upcoming_services = [], lifecycle = {}, balance_cents = 0 } = workspace || {};
  const name = customer?.name || 'This customer';

  const overdueCount = attention_items.filter(
    (i) => i.type === 'overdue_invoice' || i.type === 'missing_payment_method'
  ).length;

  if (overdueCount > 0) {
    const labels = attention_items.map((i) => i.type.replace(/_/g, ' ')).slice(0, 3).join(' and ');
    return `${overdueCount} item${overdueCount > 1 ? 's' : ''} need your attention — ${labels}.`;
  }

  if (balance_cents > 0) {
    return `${name} has ${formatCents(balance_cents)} outstanding. I've drafted a payment reminder below.`;
  }

  const nextService = upcoming_services[0];
  if (nextService) {
    const daysOut = Math.ceil((new Date(nextService.date) - new Date()) / (1000 * 60 * 60 * 24));
    const status = nextService.status === 'confirmed' ? 'all confirmed' : 'pending confirmation';
    if (daysOut <= 7 && daysOut > 0) {
      return `Next service is in ${daysOut} day${daysOut > 1 ? 's' : ''} — ${status}.`;
    }
  }

  if (lifecycle.stage === 'active' && lifecycle.total_services) {
    return `${name} is in good shape. ${lifecycle.total_services} services, ${formatCents(lifecycle.ltv_cents || 0)} lifetime value.`;
  }

  return `${name} — no urgent items right now.`;
}

function deriveSuggestedActions(workspace) {
  const { balance_cents = 0, upcoming_services = [], recent_activity = [] } = workspace || {};
  const actions = [];

  if (balance_cents > 0) {
    actions.push({ label: 'Send payment reminder', icon: CreditCard, id: 'payment_reminder' });
  }

  const pendingService = upcoming_services.find((s) => s.status === 'pending' || s.status === 'unconfirmed');
  if (pendingService) {
    actions.push({ label: 'Confirm upcoming service', icon: CalendarCheck, id: 'confirm_service' });
  }

  actions.push({ label: 'Schedule seasonal service', icon: Leaf, id: 'seasonal_service' });

  const lastService = recent_activity.find((e) => e.event_type === 'service_completed');
  if (lastService) {
    const daysSince = Math.ceil((new Date() - new Date(lastService.created_at)) / (1000 * 60 * 60 * 24));
    if (daysSince <= 7) {
      actions.push({ label: 'Send follow-up', icon: MessageSquare, id: 'follow_up' });
    }
  }

  return actions;
}

export default function SirWalterCustomerIntro({ customerName, workspace }) {
  const [query, setQuery] = useState('');
  const [thinking, setThinking] = useState(false);
  const [askExpanded, setAskExpanded] = useState(false);

  const summary = deriveSummary(workspace);
  const actions = deriveSuggestedActions(workspace);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setThinking(true);
    // TODO: wire to POST /api/customers/{id}/ask-walter
    setTimeout(() => setThinking(false), 1500);
  };

  return (
    <div className="space-y-3">
      {/* Sir Walter's Take */}
      <div className="bg-white border border-neutral-200 rounded-lg border-l-4 border-l-amber-400 px-4 py-3 flex items-center gap-3">
        <span className="text-lg">🐝</span>
        <p className="text-sm text-neutral-700 flex-1">
          <span className="font-semibold text-neutral-900">Sir Walter:</span>{' '}
          {summary}
        </p>
      </div>

      {/* Suggested Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 transition-colors"
              >
                <Icon size={14} />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Ask Walter (collapsed by default) */}
      <div>
        {!askExpanded ? (
          <button
            type="button"
            onClick={() => setAskExpanded(true)}
            className="text-xs text-neutral-500 hover:text-amber-600 transition-colors flex items-center gap-1.5"
          >
            <Send size={12} />
            Ask Sir Walter...
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => { if (!query.trim()) setAskExpanded(false); }}
              autoFocus
              placeholder={`Ask about ${customerName || 'this customer'}...`}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              type="submit"
              disabled={thinking || !query.trim()}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {thinking ? '...' : 'Ask'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
