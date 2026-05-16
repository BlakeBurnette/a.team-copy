import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Clock,
} from 'lucide-react';
import axios from 'axios';
import SeasonalInsights from './SeasonalInsights';

const fmt = (cents) =>
  typeof cents === 'number'
    ? `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    : '$0';

const KpiCard = ({ icon: Icon, label, value, sub, color = 'text-neutral-900', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`p-4 rounded-lg bg-white border border-neutral-200 text-left w-full ${onClick ? 'hover:border-amber-300 hover:shadow-sm cursor-pointer' : ''}`}
  >
    <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase font-semibold tracking-wide">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    {sub && <div className="text-xs text-neutral-500 mt-0.5">{sub}</div>}
  </button>
);

const AttentionItem = ({ icon: Icon, text, action, onClick, severity = 'warn' }) => {
  const styles = {
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };
  const iconStyles = {
    warn: 'text-amber-600',
    danger: 'text-red-600',
    info: 'text-blue-600',
  };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${styles[severity]}`}>
      <Icon className={`h-5 w-5 shrink-0 ${iconStyles[severity]}`} />
      <span className="flex-1 text-sm">{text}</span>
      {action && (
        <button
          type="button"
          onClick={onClick}
          className="text-xs font-medium opacity-80 hover:opacity-100 inline-flex items-center gap-1 shrink-0"
        >
          {action} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default function OverviewTab({ onSwitchTab }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customerStats, setCustomerStats] = useState(null);
  const [opsStats, setOpsStats] = useState(null);
  const [customerKpis, setCustomerKpis] = useState(null);
  const [approvalCount, setApprovalCount] = useState(0);
  const [earnings, setEarnings] = useState([]);
  const [arData, setArData] = useState(null);
  const [recentPayments, setRecentPayments] = useState(null);

  useEffect(() => {
    let alive = true;
    const opts = { withCredentials: true, validateStatus: () => true };

    Promise.allSettled([
      axios.get('/api/owner/customers/stats', opts),
      axios.get('/api/owner/ops/stats', opts),
      axios.get('/api/owner/customers/kpis', opts),
      axios.get('/api/approvals', { ...opts, params: { status: 'pending' } }),
      axios.get('/api/owner/stripe/earnings', { ...opts, params: { months: 3 } }),
      axios.get('/api/accounts-receivable', opts),
      axios.get('/api/owner/stripe/payments', { ...opts, params: { per_page: 20 } }),
    ]).then(([cs, ops, kpis, approvals, earn, ar, payments]) => {
      if (!alive) return;
      if (cs.status === 'fulfilled' && cs.value.status < 300) setCustomerStats(cs.value.data);
      if (ops.status === 'fulfilled' && ops.value.status < 300) {
        const d = ops.value.data;
        setOpsStats(d?.stats || d);
      }
      if (kpis.status === 'fulfilled' && kpis.value.status < 300) setCustomerKpis(kpis.value.data);
      if (approvals.status === 'fulfilled' && approvals.value.status < 300) {
        const d = approvals.value.data;
        const list = Array.isArray(d?.approvals) ? d.approvals : Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
        setApprovalCount(list.length);
      }
      if (earn.status === 'fulfilled' && earn.value.status < 300) {
        const d = earn.value.data;
        setEarnings(Array.isArray(d) ? d : d?.buckets || d?.earnings || []);
      }
      if (ar.status === 'fulfilled' && ar.value.status < 300) {
        const raw = ar.value.data?.items || ar.value.data;
        const items = Array.isArray(raw) ? raw : [];
        const totalCents = items.reduce((s, i) => s + (i.amount_cents || 0), 0);
        const urgent = items.filter((i) => (i.days_outstanding || i.days_out || 0) > 7).length;
        setArData({ count: items.length, totalCents, urgent });
      }
      if (payments.status === 'fulfilled' && payments.value.status < 300) {
        const list = payments.value.data?.payments || payments.value.data?.data || [];
        const failed = list.filter((p) => ['failed', 'requires_payment_method'].includes((p.status || '').toLowerCase())).length;
        const refunded = list.filter((p) => ['refunded', 'partially_refunded'].includes((p.status || '').toLowerCase())).length;
        const succeeded = list.filter((p) => (p.status || '').toLowerCase() === 'succeeded');
        const recentGross = succeeded.reduce((s, p) => s + (p.amount || 0), 0);
        setRecentPayments({ failed, refunded, succeeded: succeeded.length, recentGross });
      }
      setLoading(false);
    });

    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-neutral-500">Loading business overview...</div>;
  }

  const totalCustomers = customerStats?.total_count ?? opsStats?.total_customers ?? 0;
  const activeCustomers = customerStats?.active_count ?? 0;
  const totalServices = opsStats?.total_services ?? 0;
  const totalRevenue = opsStats?.total_revenue_cents ?? 0;
  const cltv = customerKpis?.cltv_cents ?? 0;
  const arOutstanding = arData?.totalCents ?? 0;

  const revenuePerService = totalServices > 0
    ? fmt(Math.round(totalRevenue / totalServices))
    : '--';

  const revenuePerCustomer = activeCustomers > 0
    ? fmt(Math.round(totalRevenue / activeCustomers))
    : '--';

  // Earnings trend
  let earningsTrend = null;
  if (earnings.length >= 2) {
    const current = earnings[0]?.gross_minor || earnings[0]?.gross_cents || 0;
    const prev = earnings[1]?.gross_minor || earnings[1]?.gross_cents || 0;
    if (prev > 0) {
      const pct = Math.round(((current - prev) / prev) * 100);
      earningsTrend = { pct, direction: pct >= 0 ? 'up' : 'down', current };
    }
  }

  // Build attention items from all data sources
  const attentionItems = [];

  // Payment failures — most urgent
  if (recentPayments && recentPayments.failed > 0) {
    attentionItems.push({
      icon: CreditCard,
      severity: 'danger',
      text: `${recentPayments.failed} recent payment${recentPayments.failed !== 1 ? 's' : ''} failed — retry or contact customers`,
      action: 'Payments',
      onClick: () => onSwitchTab('payments'),
    });
  }

  // Outstanding receivables
  if (arData && arData.count > 0) {
    const urgentNote = arData.urgent > 0 ? `, ${arData.urgent} overdue 7+ days` : '';
    attentionItems.push({
      icon: DollarSign,
      severity: arData.urgent > 0 ? 'danger' : 'warn',
      text: `${fmt(arData.totalCents)} outstanding across ${arData.count} account${arData.count !== 1 ? 's' : ''}${urgentNote}`,
      action: 'Receivables',
      onClick: () => onSwitchTab('receivables'),
    });
  }

  // Pending approvals
  if (approvalCount > 0) {
    attentionItems.push({
      icon: AlertTriangle,
      severity: 'warn',
      text: `${approvalCount} approval${approvalCount !== 1 ? 's' : ''} pending customer authorization`,
      action: 'Review',
      onClick: () => onSwitchTab('approvals'),
    });
  }

  // Leads to convert
  if (customerStats && customerStats.lead_count > 0) {
    attentionItems.push({
      icon: Users,
      severity: 'info',
      text: `${customerStats.lead_count} lead${customerStats.lead_count !== 1 ? 's' : ''} waiting to be converted`,
      action: 'View',
      onClick: () => navigate('/app/customers'),
    });
  }

  // Paused customers
  if (customerStats && customerStats.paused_count > 0) {
    attentionItems.push({
      icon: Clock,
      severity: 'warn',
      text: `${customerStats.paused_count} customer${customerStats.paused_count !== 1 ? 's' : ''} currently paused`,
      action: 'View',
      onClick: () => navigate('/app/customers'),
    });
  }

  // Refunds
  if (recentPayments && recentPayments.refunded > 0) {
    attentionItems.push({
      icon: TrendingDown,
      severity: 'warn',
      text: `${recentPayments.refunded} refund${recentPayments.refunded !== 1 ? 's' : ''} processed recently — monitor for patterns`,
      action: 'Payments',
      onClick: () => onSwitchTab('payments'),
    });
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={DollarSign}
          label="Revenue"
          value={fmt(totalRevenue)}
          sub={earningsTrend
            ? `${earningsTrend.direction === 'up' ? '+' : ''}${earningsTrend.pct}% vs prior`
            : undefined}
          color={totalRevenue > 0 ? 'text-green-700' : 'text-neutral-900'}
          onClick={() => onSwitchTab('payments')}
        />
        <KpiCard
          icon={CreditCard}
          label="Outstanding"
          value={fmt(arOutstanding)}
          sub={arData?.count ? `${arData.count} account${arData.count !== 1 ? 's' : ''}` : 'none'}
          color={arOutstanding > 0 ? 'text-red-600' : 'text-green-700'}
          onClick={() => onSwitchTab('receivables')}
        />
        <KpiCard
          icon={Users}
          label="Customers"
          value={activeCustomers}
          sub={`${totalCustomers} total`}
          onClick={() => navigate('/app/customers')}
        />
        <KpiCard
          icon={ClipboardList}
          label="Services"
          value={totalServices}
          sub={`${revenuePerService} avg`}
          onClick={() => onSwitchTab('services')}
        />
        <KpiCard
          icon={TrendingUp}
          label="Rev / Customer"
          value={revenuePerCustomer}
          sub={cltv > 0 ? `${fmt(cltv)} lifetime` : undefined}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Approvals"
          value={approvalCount}
          sub={approvalCount > 0 ? 'pending' : 'all clear'}
          color={approvalCount > 0 ? 'text-amber-600' : 'text-green-700'}
          onClick={approvalCount > 0 ? () => onSwitchTab('approvals') : undefined}
        />
      </div>

      {/* Attention items */}
      {attentionItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">Needs Attention</h3>
          {attentionItems.map((item, i) => (
            <AttentionItem key={i} {...item} />
          ))}
        </div>
      )}

      {/* Seasonal Insights */}
      <SeasonalInsights activeCustomers={activeCustomers} onSwitchTab={onSwitchTab} />

      {/* Earnings trend */}
      {earnings.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-700">Earnings</h3>
            <button
              type="button"
              onClick={() => onSwitchTab('payments')}
              className="text-xs text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1"
            >
              Full reports <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {earnings.map((b, i) => {
              const gross = b.gross_minor || b.gross_cents || 0;
              const count = b.count || 0;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">{b.period || `Period ${i + 1}`}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-neutral-500">{count} txn{count !== 1 ? 's' : ''}</span>
                    <span className="font-semibold text-neutral-900">{fmt(gross)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalCustomers === 0 && totalServices === 0 && totalRevenue === 0 && attentionItems.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <div className="text-lg font-medium text-neutral-900">Getting started</div>
          <div className="text-sm text-neutral-600 mt-1">
            Add customers and services to see your business metrics here.
          </div>
        </div>
      )}
    </div>
  );
}
