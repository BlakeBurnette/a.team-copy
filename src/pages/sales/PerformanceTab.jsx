import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  Users,
  FileText,
  Trophy,
  XCircle,
  Clock,
  Zap,
  CalendarCheck,
  Loader2,
} from 'lucide-react';
import { getLeads, getActivities } from '../../api/crm';
import { listOwnerQuotes } from '../../api/quotes';

const USE_MOCK = true;

const MOCK_METRICS = {
  funnel: {
    total_leads: 47,
    contacted: 38,
    site_visits: 22,
    quoted: 28,
    won: 18,
    lost: 6,
    open: 23,
  },
  by_channel: [
    { channel: 'phone', leads: 15, won: 8, conversion: 53, avg_days_to_close: 4.2 },
    { channel: 'listing_hive', leads: 12, won: 5, conversion: 42, avg_days_to_close: 5.8 },
    { channel: 'referral', leads: 8, won: 4, conversion: 50, avg_days_to_close: 3.1 },
    { channel: 'website', leads: 9, won: 1, conversion: 11, avg_days_to_close: 12.5 },
    { channel: 'b2c', leads: 3, won: 0, conversion: 0, avg_days_to_close: null },
  ],
  time_metrics: {
    avg_first_contact_hours: 4.2,
    avg_days_to_quote: 2.8,
    avg_days_to_close: 5.4,
    fastest_close_days: 1,
    slowest_close_days: 18,
  },
  this_month: {
    new_leads: 12,
    quotes_sent: 8,
    deals_won: 4,
    revenue_won_cents: 285000,
    deals_lost: 2,
    revenue_lost_cents: 42000,
  },
};

const fmt = (cents) =>
  typeof cents === 'number'
    ? `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    : '$0';

const CHANNEL_BADGES = {
  website: { label: 'Website', bg: 'bg-blue-100', text: 'text-blue-700' },
  phone: { label: 'Phone', bg: 'bg-green-100', text: 'text-green-700' },
  listing_hive: { label: 'Listing Hive', bg: 'bg-amber-100', text: 'text-amber-700' },
  referral: { label: 'Referral', bg: 'bg-purple-100', text: 'text-purple-700' },
  b2c: { label: 'B2C', bg: 'bg-teal-100', text: 'text-teal-700' },
};

const KpiCard = ({ icon: Icon, label, value, sub, color = 'text-neutral-900' }) => (
  <div className="p-4 rounded-lg bg-white border border-neutral-200 text-left w-full">
    <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase font-semibold tracking-wide">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    {sub && <div className="text-xs text-neutral-500 mt-0.5">{sub}</div>}
  </div>
);

const TimeCard = ({ icon: Icon, label, value, unit, threshold }) => {
  let color = 'text-green-600';
  if (threshold === 'slow') color = 'text-red-600';
  else if (threshold === 'moderate') color = 'text-amber-600';

  return (
    <div className="p-4 rounded-lg bg-white border border-neutral-200 text-left w-full">
      <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase font-semibold tracking-wide">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>
        {value}
        <span className="text-sm font-medium ml-1">{unit}</span>
      </div>
    </div>
  );
};

function getTimeThreshold(type, value) {
  if (type === 'first_contact') {
    if (value <= 2) return 'fast';
    if (value <= 6) return 'moderate';
    return 'slow';
  }
  if (type === 'quote') {
    if (value <= 1.5) return 'fast';
    if (value <= 3) return 'moderate';
    return 'slow';
  }
  // close
  if (value <= 4) return 'fast';
  if (value <= 7) return 'moderate';
  return 'slow';
}

function computeMetrics(leads, quotes, activities) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // --- Funnel ---
  const total_leads = leads.length;
  const contacted = leads.filter((l) =>
    ['contacted', 'qualified', 'site_visit', 'proposal', 'quoted', 'won', 'lost'].includes(l.status)
  ).length;
  const site_visits = leads.filter((l) =>
    ['site_visit', 'qualified', 'proposal', 'quoted', 'won'].includes(l.status)
  ).length;
  const quoted = leads.filter((l) =>
    ['quoted', 'proposal', 'won'].includes(l.status)
  ).length;
  const won = leads.filter((l) => l.status === 'won').length;
  const lost = leads.filter((l) => l.status === 'lost').length;
  const open = total_leads - won - lost;

  const funnel = { total_leads, contacted, site_visits, quoted, won, lost, open };

  // --- By Channel ---
  const channelMap = {};
  leads.forEach((lead) => {
    const ch = lead.source_detail || lead.source_id || 'unknown';
    if (!channelMap[ch]) channelMap[ch] = { leads: 0, won: 0, close_days: [] };
    channelMap[ch].leads += 1;
    if (lead.status === 'won') {
      channelMap[ch].won += 1;
      if (lead.won_at && lead.created_at) {
        const days = (new Date(lead.won_at) - new Date(lead.created_at)) / (1000 * 60 * 60 * 24);
        channelMap[ch].close_days.push(days);
      }
    }
  });

  const by_channel = Object.entries(channelMap).map(([channel, data]) => ({
    channel,
    leads: data.leads,
    won: data.won,
    conversion: data.leads > 0 ? Math.round((data.won / data.leads) * 100) : 0,
    avg_days_to_close:
      data.close_days.length > 0
        ? Math.round((data.close_days.reduce((a, b) => a + b, 0) / data.close_days.length) * 10) / 10
        : null,
  }));

  // --- Time Metrics ---
  // Build a map of lead_id -> first activity time
  const leadFirstActivity = {};
  activities.forEach((act) => {
    const lid = act.lead_id;
    if (!lid) return;
    const t = new Date(act.occurred_at || act.created_at);
    if (!leadFirstActivity[lid] || t < leadFirstActivity[lid]) {
      leadFirstActivity[lid] = t;
    }
  });

  // Build map of lead_id -> first quote time
  const leadFirstQuote = {};
  quotes.forEach((q) => {
    const lid = q.lead_id;
    if (!lid) return;
    const t = new Date(q.created_at);
    if (!leadFirstQuote[lid] || t < leadFirstQuote[lid]) {
      leadFirstQuote[lid] = t;
    }
  });

  const firstContactHours = [];
  const daysToQuote = [];
  const daysToClose = [];

  leads.forEach((lead) => {
    const createdAt = new Date(lead.created_at);

    if (leadFirstActivity[lead.id]) {
      const hours = (leadFirstActivity[lead.id] - createdAt) / (1000 * 60 * 60);
      if (hours >= 0) firstContactHours.push(hours);
    }

    if (leadFirstQuote[lead.id]) {
      const days = (leadFirstQuote[lead.id] - createdAt) / (1000 * 60 * 60 * 24);
      if (days >= 0) daysToQuote.push(days);
    }

    if (lead.status === 'won' && lead.won_at) {
      const days = (new Date(lead.won_at) - createdAt) / (1000 * 60 * 60 * 24);
      if (days >= 0) daysToClose.push(days);
    }
  });

  const avg = (arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const time_metrics = {
    avg_first_contact_hours: Math.round(avg(firstContactHours) * 10) / 10 || 0,
    avg_days_to_quote: Math.round(avg(daysToQuote) * 10) / 10 || 0,
    avg_days_to_close: Math.round(avg(daysToClose) * 10) / 10 || 0,
    fastest_close_days: daysToClose.length > 0 ? Math.round(Math.min(...daysToClose) * 10) / 10 : 0,
    slowest_close_days: daysToClose.length > 0 ? Math.round(Math.max(...daysToClose) * 10) / 10 : 0,
  };

  // --- This Month ---
  const monthLeads = leads.filter((l) => new Date(l.created_at) >= monthStart);
  const monthQuotes = quotes.filter((q) => new Date(q.created_at) >= monthStart);
  const monthWon = monthLeads.filter((l) => l.status === 'won');
  const monthLost = monthLeads.filter((l) => l.status === 'lost');

  const this_month = {
    new_leads: monthLeads.length,
    quotes_sent: monthQuotes.length,
    deals_won: monthWon.length,
    revenue_won_cents: monthWon.reduce((sum, l) => sum + (l.value_cents || 0), 0),
    deals_lost: monthLost.length,
    revenue_lost_cents: monthLost.reduce((sum, l) => sum + (l.value_cents || 0), 0),
  };

  return { funnel, by_channel, time_metrics, this_month };
}

function generateAnalysis(metrics) {
  const { funnel, by_channel, time_metrics } = metrics;

  const sorted = [...by_channel].filter((c) => c.leads > 0).sort((a, b) => b.conversion - a.conversion);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (!best || funnel.total_leads === 0) {
    return {
      paragraph1: 'Not enough data to generate a performance analysis yet. Continue logging leads and activities to build insights.',
      paragraph2: '',
      recommendation: 'Focus on entering lead sources consistently so channel performance can be tracked.',
    };
  }

  const dropOff = funnel.contacted > 0
    ? Math.round(((funnel.contacted - funnel.quoted) / funnel.contacted) * 100)
    : 0;

  const paragraph1 = `${best.channel.replace('_', ' ')} leads are your strongest channel at ${best.conversion}% conversion${
    best.avg_days_to_close != null ? ` with ${best.avg_days_to_close} days to close` : ''
  }${worst && worst.channel !== best.channel
    ? `, while ${worst.channel.replace('_', ' ')} converts at only ${worst.conversion}%${worst.avg_days_to_close != null ? ` with ${worst.avg_days_to_close} days to close` : ''}`
    : ''
  }. You have ${funnel.total_leads} total leads with ${funnel.won} won and ${funnel.lost} lost.`;

  const paragraph2 = `Your average first contact time is ${time_metrics.avg_first_contact_hours} hours${
    time_metrics.avg_first_contact_hours > 4 ? ' — leads contacted within 1 hour convert at significantly higher rates industry-wide' : ''
  }. With ${funnel.open} leads still open and ${funnel.quoted} quoted out of ${funnel.contacted} contacted, there is a ${dropOff}% drop-off between contact and quote that needs attention.`;

  const recommendation = `Prioritize ${best.channel.replace('_', ' ')} leads for same-day response.${
    worst && worst.conversion < 15 && worst.leads >= 3
      ? ` ${worst.channel.replace('_', ' ')} has only ${worst.conversion}% conversion from ${worst.leads} leads — consider pausing spend there until you close your open pipeline.`
      : ''
  }${time_metrics.avg_first_contact_hours > 6 ? ' Reduce your first-contact time — aim for under 2 hours.' : ''}`;

  return { paragraph1, paragraph2, recommendation };
}

export default function PerformanceTab() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [leadsRes, quotesRes, activitiesRes] = await Promise.allSettled([
          getLeads({}),
          listOwnerQuotes({ status: '' }),
          getActivities({ sort: '-occurred_at', per_page: 100 }),
        ]);

        if (cancelled) return;

        const leads = leadsRes.status === 'fulfilled' ? (leadsRes.value?.data?.data || leadsRes.value?.data || []) : [];
        const quotes = quotesRes.status === 'fulfilled' ? (quotesRes.value?.quotes || quotesRes.value?.data || quotesRes.value || []) : [];
        const activities = activitiesRes.status === 'fulfilled' ? (activitiesRes.value?.data?.data || activitiesRes.value?.data || []) : [];

        // If all three failed, fall back to mock
        if (leadsRes.status === 'rejected' && quotesRes.status === 'rejected' && activitiesRes.status === 'rejected') {
          throw new Error('All API calls failed');
        }

        const computed = computeMetrics(
          Array.isArray(leads) ? leads : [],
          Array.isArray(quotes) ? quotes : [],
          Array.isArray(activities) ? activities : []
        );
        setMetrics(computed);
        setError(false);
      } catch (err) {
        console.error('PerformanceTab: failed to fetch data, using mock', err);
        if (!cancelled) {
          setMetrics(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (USE_MOCK) {
      setMetrics(null);
      setLoading(false);
    } else {
      fetchData();
    }

    return () => { cancelled = true; };
  }, []);

  const resolvedMetrics = useMemo(() => {
    if (metrics) return metrics;
    return MOCK_METRICS;
  }, [metrics]);

  const analysis = useMemo(() => generateAnalysis(resolvedMetrics), [resolvedMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-neutral-500 text-sm">Loading performance data...</span>
      </div>
    );
  }

  const { funnel, by_channel, time_metrics, this_month } = resolvedMetrics;

  const sortedChannels = [...by_channel].sort((a, b) => b.conversion - a.conversion);

  const funnelSteps = [
    { label: 'Total Leads', count: funnel.total_leads, color: 'bg-neutral-400' },
    { label: 'Contacted', count: funnel.contacted, color: 'bg-blue-400' },
    { label: 'Quoted', count: funnel.quoted, color: 'bg-amber-400' },
    { label: 'Won', count: funnel.won, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Sir Walter Analysis */}
      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
            Sir Walter Analysis
          </h3>
        </div>
        <div className="text-sm text-amber-950 leading-relaxed space-y-2">
          <p>{analysis.paragraph1}</p>
          {analysis.paragraph2 && <p>{analysis.paragraph2}</p>}
          {analysis.recommendation && (
            <p className="font-semibold">Recommendation: {analysis.recommendation}</p>
          )}
        </div>
      </div>

      {/* This Month KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          This Month
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Users} label="New Leads" value={this_month.new_leads} />
          <KpiCard icon={FileText} label="Quotes Sent" value={this_month.quotes_sent} />
          <KpiCard
            icon={Trophy}
            label="Deals Won"
            value={this_month.deals_won}
            sub={fmt(this_month.revenue_won_cents)}
            color="text-green-600"
          />
          <KpiCard
            icon={XCircle}
            label="Deals Lost"
            value={this_month.deals_lost}
            sub={fmt(this_month.revenue_lost_cents)}
            color="text-red-600"
          />
        </div>
      </div>

      {/* Conversion Funnel */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          Conversion Funnel
        </h3>
        <div className="rounded-lg bg-white border border-neutral-200 p-5">
          <div className="space-y-3">
            {funnelSteps.map((step, i) => {
              const pct = Math.round((step.count / funnel.total_leads) * 100);
              const widthPct = Math.max((step.count / funnel.total_leads) * 100, 8);
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-neutral-700">{step.label}</span>
                    <span className="text-neutral-500">
                      {step.count}{' '}
                      {i > 0 && (
                        <span className="text-neutral-400">({pct}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-6 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${step.color} rounded-full transition-all`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Won / Lost / Open breakdown */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-neutral-600">Won: {funnel.won}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="text-neutral-600">Lost: {funnel.lost}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="h-3 w-3 rounded-full bg-neutral-300" />
              <span className="text-neutral-600">Open: {funnel.open}</span>
            </div>
          </div>
        </div>
      </div>

      {/* By Channel */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          Performance by Channel
        </h3>
        <div className="rounded-lg bg-white border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold text-right">Leads</th>
                <th className="px-4 py-3 font-semibold text-right">Won</th>
                <th className="px-4 py-3 font-semibold text-right">Conversion</th>
                <th className="px-4 py-3 font-semibold text-right">Avg Days to Close</th>
              </tr>
            </thead>
            <tbody>
              {sortedChannels.map((ch) => {
                const badge = CHANNEL_BADGES[ch.channel] || {
                  label: ch.channel,
                  bg: 'bg-neutral-100',
                  text: 'text-neutral-700',
                };
                return (
                  <tr
                    key={ch.channel}
                    className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">{ch.leads}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{ch.won}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          ch.conversion >= 40
                            ? 'text-green-600'
                            : ch.conversion >= 20
                            ? 'text-amber-600'
                            : 'text-red-500'
                        }`}
                      >
                        {ch.conversion}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">
                      {ch.avg_days_to_close !== null ? `${ch.avg_days_to_close}d` : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          Time Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TimeCard
            icon={Zap}
            label="Avg Hours to First Contact"
            value={time_metrics.avg_first_contact_hours}
            unit="hrs"
            threshold={getTimeThreshold('first_contact', time_metrics.avg_first_contact_hours)}
          />
          <TimeCard
            icon={CalendarCheck}
            label="Avg Days to Quote"
            value={time_metrics.avg_days_to_quote}
            unit="days"
            threshold={getTimeThreshold('quote', time_metrics.avg_days_to_quote)}
          />
          <TimeCard
            icon={Clock}
            label="Avg Days to Close"
            value={time_metrics.avg_days_to_close}
            unit="days"
            threshold={getTimeThreshold('close', time_metrics.avg_days_to_close)}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400">
          <span>Fastest close: {time_metrics.fastest_close_days}d</span>
          <span>Slowest close: {time_metrics.slowest_close_days}d</span>
        </div>
      </div>
    </div>
  );
}
