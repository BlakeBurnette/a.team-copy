// src/components/admin/security/DashboardOverview.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Shield, Activity, Clock, Loader2, RefreshCw } from 'lucide-react';
import { getDashboardMetrics } from '../../../api/securityDashboard';

const MetricCard = ({ title, value, icon: Icon, color = 'neutral', subtitle }) => {
  const colorClasses = {
    neutral: 'bg-neutral-50 border-neutral-200 text-neutral-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium opacity-80">{title}</div>
          <div className="text-3xl font-bold mt-1">{value ?? '-'}</div>
          {subtitle && <div className="text-xs mt-1 opacity-70">{subtitle}</div>}
        </div>
        <Icon className="w-6 h-6 opacity-60" />
      </div>
    </div>
  );
};

// Inline hourly trend chart
const HourlyTrendInline = ({ data = [] }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-neutral-500 text-sm">
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.total || 0), 1);

  return (
    <div className="h-32 flex items-end gap-1">
      {data.map((item, idx) => {
        const height = ((item.total || 0) / maxCount) * 100;
        const hour = new Date(item.hour).getHours();
        const isHighSeverity = (item.critical || 0) + (item.high || 0) > 0;

        return (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center gap-1"
            title={`${hour}:00 - ${item.total || 0} events`}
          >
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t transition-all ${
                  isHighSeverity ? 'bg-red-400' : 'bg-blue-400'
                }`}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
            {idx % 6 === 0 && (
              <div className="text-xs text-neutral-400">{hour}:00</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Inline top events chart
const COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
];

const TopEventsInline = ({ data = [] }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-neutral-500 text-sm">
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count || 0), 1);

  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((item, idx) => {
        const percentage = ((item.count || 0) / maxCount) * 100;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-700 truncate">{item.event_type || 'Unknown'}</span>
              <span className="text-neutral-500 ml-2">{item.count || 0}</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${COLORS[idx % COLORS.length]}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-neutral-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={load}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Extract from backend response structure
  const summary = metrics?.summary || {};
  const alerts = metrics?.alerts || {};

  const totalEvents = summary.total_events || 0;
  const criticalEvents = summary.critical_events || 0;
  const highEvents = summary.high_events || 0;
  const pendingAlerts = alerts.triggered || 0;
  const eventsLast24h = totalEvents;
  const topEventType = metrics?.top_events?.[0]?.event_type || 'N/A';

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Overview</h2>
          {lastRefresh && (
            <div className="text-xs text-neutral-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Events (24h)"
          value={eventsLast24h}
          icon={Activity}
          color="blue"
          subtitle="Security events logged"
        />
        <MetricCard
          title="Critical (72h)"
          value={criticalEvents}
          icon={AlertTriangle}
          color={criticalEvents > 0 ? 'red' : 'neutral'}
          subtitle="Require immediate action"
        />
        <MetricCard
          title="High Severity (72h)"
          value={highEvents}
          icon={Shield}
          color={highEvents > 0 ? 'amber' : 'neutral'}
          subtitle="Review recommended"
        />
        <MetricCard
          title="Pending Alerts (72h)"
          value={pendingAlerts}
          icon={Clock}
          color={pendingAlerts > 0 ? 'amber' : 'emerald'}
          subtitle="Awaiting resolution"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Events (Last 24 Hours)</h3>
          <HourlyTrendInline data={metrics?.hourly_trend || []} />
        </div>
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4">Top Event Types (72h)</h3>
          <TopEventsInline data={metrics?.top_events || []} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="bg-white border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-neutral-500">Total Events</div>
            <div className="font-semibold">{totalEvents.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-neutral-500">Most Common</div>
            <div className="font-semibold">{topEventType}</div>
          </div>
          <div>
            <div className="text-neutral-500">Unique IPs</div>
            <div className="font-semibold">{summary.unique_ips || 0}</div>
          </div>
          <div>
            <div className="text-neutral-500">Status</div>
            <div className={`font-semibold ${criticalEvents > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {criticalEvents > 0 ? 'Action Required' : 'All Clear'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
