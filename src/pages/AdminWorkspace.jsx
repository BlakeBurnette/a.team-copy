import React, { useState, Suspense } from 'react';
import ResponsiveTabs from '../components/ResponsiveTabs';
import { useUserProfile } from '../context/AuthContext';

const AdminPanel = React.lazy(() => import('./AdminPanel'));
const SecurityDashboard = React.lazy(() => import('./admin/SecurityDashboard'));
const Applications = React.lazy(() => import('./admin/Applications'));
const AdminOrgFeatures = React.lazy(() => import('./AdminOrgFeatures'));
const ApprovalFlags = React.lazy(() => import('./admin/ApprovalFlags'));
const CrmUsers = React.lazy(() => import('./crm/CrmUsers'));
const CrmSettings = React.lazy(() => import('./crm/CrmSettings'));
const CrmAdmin = React.lazy(() => import('./crm/CrmAdmin'));
const CrmNightlyLeads = React.lazy(() => import('./crm/NightlyLeads'));
const GustoIntegration = React.lazy(() => import('./admin/GustoIntegration'));

function TabLoader() {
  return <div className="py-12 text-center text-neutral-500">Loading...</div>;
}

function tab(key, label, Component) {
  return {
    key,
    label,
    render: () => (
      <Suspense fallback={<TabLoader />}>
        <Component embedded />
      </Suspense>
    ),
  };
}

export default function AdminWorkspace() {
  const { profile, user, roles: roleList } = useUserProfile();
  const role = (profile?.role || user?.role || (Array.isArray(roleList) ? roleList[0] : '') || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isOwner = role === 'owner';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'panel' : 'integrations');

  const sections = [
    ...(isAdmin ? [
      tab('panel', 'Admin Panel', AdminPanel),
      tab('security', 'Security', SecurityDashboard),
      tab('applications', 'Applications', Applications),
      tab('org-features', 'Org Features', AdminOrgFeatures),
      tab('approval-flags', 'Approval Flags', ApprovalFlags),
      tab('crm-users', 'CRM Users', CrmUsers),
      tab('crm-admin', 'CRM Admin', CrmAdmin),
      tab('nightly-leads', 'Nightly Leads', CrmNightlyLeads),
    ] : []),
    ...((isOwner || isAdmin) ? [
      tab('integrations', 'Integrations', GustoIntegration),
      tab('crm-settings', 'CRM Settings', CrmSettings),
    ] : []),
  ];

  if (sections.length === 0) return null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Admin</h1>
        <p className="text-sm text-neutral-500 mt-1">
          System administration, security, and platform configuration.
        </p>
      </div>

      <ResponsiveTabs sections={sections} value={activeTab} onChange={setActiveTab} />
    </div>
  );
}
