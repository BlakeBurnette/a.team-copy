import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import Payments from '../Payments';

const fmt = (cents) =>
  typeof cents === 'number'
    ? `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '$0.00';

export default function PaymentsTab() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const opts = { withCredentials: true, validateStatus: () => true };

    axios.get('/api/owner/stripe/payments', { ...opts, params: { per_page: 50 } })
      .then((res) => {
        if (!alive) return;
        if (res.status >= 300) { setLoading(false); return; }

        const payments = res.data?.payments || res.data?.data || [];
        const derived = { failed: 0, refunded: 0, succeeded: 0, totalGross: 0, totalFees: 0 };
        payments.forEach((p) => {
          const status = (p.status || '').toLowerCase();
          if (status === 'failed' || status === 'requires_payment_method') derived.failed++;
          if (status === 'refunded' || status === 'partially_refunded') derived.refunded++;
          if (status === 'succeeded') {
            derived.succeeded++;
            derived.totalGross += p.amount || 0;
            derived.totalFees += p.fee || p.application_fee_amount || 0;
          }
        });

        setInsights(derived);
        setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, []);

  const items = [];
  if (insights && !loading) {
    if (insights.failed > 0) {
      items.push({
        icon: AlertTriangle,
        color: 'text-red-600 bg-red-50 border-red-200',
        text: `${insights.failed} recent payment${insights.failed !== 1 ? 's' : ''} failed — review and retry or contact customers.`,
      });
    }
    if (insights.refunded > 0) {
      items.push({
        icon: TrendingDown,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        text: `${insights.refunded} refund${insights.refunded !== 1 ? 's' : ''} processed recently. Monitor for patterns.`,
      });
    }
    if (insights.succeeded > 0 && insights.failed === 0) {
      items.push({
        icon: CheckCircle2,
        color: 'text-green-600 bg-green-50 border-green-200',
        text: `${insights.succeeded} successful payments, ${fmt(insights.totalGross)} collected. No issues detected.`,
      });
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

      <Payments embedded />
    </div>
  );
}
