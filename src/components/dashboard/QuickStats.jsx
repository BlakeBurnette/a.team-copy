// src/components/dashboard/QuickStats.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Calendar, CheckCircle, Clock, DollarSign, AlertCircle } from 'lucide-react';
import StatCard from './StatCard';

/**
 * Quick stats row for owner/manager dashboard
 * Shows key metrics at a glance
 */
export default function QuickStats({
  onCustomersClick,
  onScheduleClick,
  onApprovalsClick,
  onARClick,
  className = '',
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCustomers: null,
    scheduledThisWeek: null,
    pendingApprovals: null,
    outstandingAR: null,
  });

  useEffect(() => {
    let alive = true;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch all stats in parallel
        const [customersRes, scheduleRes, approvalsRes, arRes] = await Promise.all([
          axios.get('/api/owner/customers/stats', {
            withCredentials: true,
            validateStatus: () => true,
          }).catch(() => ({ data: null })),
          axios.get('/api/schedule/stats', {
            withCredentials: true,
            validateStatus: () => true,
          }).catch(() => ({ data: null })),
          axios.get('/api/approvals/dashboard', {
            withCredentials: true,
            validateStatus: () => true,
          }).catch(() => ({ data: null })),
          axios.get('/api/accounts-receivable/summary', {
            withCredentials: true,
            validateStatus: () => true,
          }).catch(() => ({ data: null })),
        ]);

        if (!alive) return;

        setStats({
          activeCustomers: customersRes?.data?.active_count ?? customersRes?.data?.count ?? null,
          scheduledThisWeek: scheduleRes?.data?.this_week ?? scheduleRes?.data?.count ?? null,
          pendingApprovals: Array.isArray(approvalsRes?.data?.approvals)
            ? approvalsRes.data.approvals.length
            : null,
          outstandingAR: arRes?.data?.count ?? null,
        });
      } catch {
        // Ignore errors
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchStats();
    return () => { alive = false; };
  }, []);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      <StatCard
        label="Active Customers"
        value={loading ? '...' : (stats.activeCustomers ?? '—')}
        icon={Users}
        variant="default"
        onClick={onCustomersClick}
      />
      <StatCard
        label="This Week"
        value={loading ? '...' : (stats.scheduledThisWeek ?? '—')}
        sublabel="services scheduled"
        icon={Calendar}
        variant="default"
        onClick={onScheduleClick}
      />
      <StatCard
        label="Pending Approvals"
        value={loading ? '...' : (stats.pendingApprovals ?? 0)}
        icon={Clock}
        variant={stats.pendingApprovals > 0 ? 'warning' : 'default'}
        onClick={onApprovalsClick}
      />
      <StatCard
        label="Outstanding A/R"
        value={loading ? '...' : (stats.outstandingAR ?? 0)}
        icon={AlertCircle}
        variant={stats.outstandingAR > 0 ? 'danger' : 'success'}
        onClick={onARClick}
      />
    </div>
  );
}
