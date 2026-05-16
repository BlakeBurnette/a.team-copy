import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import ARDashboard from '../ARDashboard';

const fmt = (cents) =>
  typeof cents === 'number'
    ? `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '$0.00';

export default function ReceivablesTab() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get('/api/accounts-receivable', { withCredentials: true, validateStatus: () => true })
      .then((res) => {
        if (!alive) return;
        if (res.status >= 300) { setLoading(false); return; }

        const items = res.data?.items || res.data || [];
        const totalCents = items.reduce((sum, i) => sum + (i.amount_cents || 0), 0);
        const urgent = items.filter((i) => {
          const days = i.days_outstanding || i.days_out || 0;
          return days > 7;
        });
        const disputes = items.filter((i) => {
          const t = (i.failure_type || i.reason || '').toLowerCase();
          return t.includes('dispute') || t.includes('chargeback');
        });

        setInsights({ total: items.length, totalCents, urgent: urgent.length, disputes: disputes.length });
        setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, []);

  const items = [];
  if (insights && !loading) {
    if (insights.total === 0) {
      items.push({
        icon: CheckCircle2,
        color: 'text-green-600 bg-green-50 border-green-200',
        text: 'No outstanding receivables. All payments are current.',
      });
    } else {
      items.push({
        icon: DollarSign,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        text: `${fmt(insights.totalCents)} outstanding across ${insights.total} account${insights.total !== 1 ? 's' : ''}.`,
      });
      if (insights.urgent > 0) {
        items.push({
          icon: Clock,
          color: 'text-red-600 bg-red-50 border-red-200',
          text: `${insights.urgent} account${insights.urgent !== 1 ? 's' : ''} overdue by more than 7 days — prioritize collection.`,
        });
      }
      if (insights.disputes > 0) {
        items.push({
          icon: AlertTriangle,
          color: 'text-red-600 bg-red-50 border-red-200',
          text: `${insights.disputes} dispute${insights.disputes !== 1 ? 's' : ''} or chargeback${insights.disputes !== 1 ? 's' : ''} require immediate response.`,
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${item.color}`}>
              <item.icon className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      )}

      <ARDashboard embedded />
    </div>
  );
}
