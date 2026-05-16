// src/pages/admin/SecurityDashboard.jsx
import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';
import ResponsiveTabs from '../../components/ResponsiveTabs';
import DashboardOverview from '../../components/admin/security/DashboardOverview';
import AlertManagement from '../../components/admin/security/AlertManagement';
import SecurityEventsList from '../../components/admin/security/SecurityEventsList';
import AlertRulesConfig from '../../components/admin/security/AlertRulesConfig';

const SECTIONS = [
  { key: 'overview', label: 'Overview', render: () => <DashboardOverview /> },
  { key: 'alerts', label: 'Alerts', render: () => <AlertManagement /> },
  { key: 'events', label: 'Events', render: () => <SecurityEventsList /> },
  { key: 'rules', label: 'Rules', render: () => <AlertRulesConfig /> },
];

export default function SecurityDashboard({ embedded }) {
  const { user, roles = [] } = useAuth() || {};
  const [activeSection, setActiveSection] = useState('overview');

  // Backup admin check (ProtectedRoute should handle this)
  const isAdmin = roles.includes('admin') || user?.role === 'admin';
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      {!embedded && (
        <div>
          <div className="text-xs uppercase text-neutral-500">Admin</div>
          <div className="flex items-center gap-3 mt-1">
            <Shield className="w-8 h-8 text-neutral-700" />
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Security Dashboard</h1>
              <p className="text-sm text-neutral-600">
                Monitor security events, manage alerts, and configure rules
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Tabs / Accordion */}
      <ResponsiveTabs
        sections={SECTIONS}
        value={activeSection}
        onChange={setActiveSection}
      />
    </div>
  );
}
