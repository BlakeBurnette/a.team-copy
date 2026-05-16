import React, { useState, Suspense } from 'react';
import ResponsiveTabs from '../components/ResponsiveTabs';

const AcctDashboard = React.lazy(() => import('./accounting/AcctDashboard'));
const AcctTransactions = React.lazy(() => import('./accounting/AcctTransactions'));
const AcctExceptions = React.lazy(() => import('./accounting/AcctExceptions'));
const AcctPatterns = React.lazy(() => import('./accounting/AcctPatterns'));
const AcctIntegrations = React.lazy(() => import('./accounting/AcctIntegrations'));
const AcctAlerts = React.lazy(() => import('./accounting/AcctAlerts'));
const AcctAuditBlocks = React.lazy(() => import('./accounting/AcctAuditBlocks'));
const AcctDCF = React.lazy(() => import('./accounting/AcctDCF'));
const AcctSettings = React.lazy(() => import('./accounting/AcctSettings'));

function TabLoader() {
  return <div className="py-12 text-center text-neutral-500">Loading...</div>;
}

export default function AccountingWorkspace() {
  const [tab, setTab] = useState('overview');

  const sections = [
    {
      key: 'overview',
      label: 'Overview',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctDashboard embedded />
        </Suspense>
      ),
    },
    {
      key: 'transactions',
      label: 'Transactions',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctTransactions embedded />
        </Suspense>
      ),
    },
    {
      key: 'exceptions',
      label: 'Exceptions',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctExceptions embedded />
        </Suspense>
      ),
    },
    {
      key: 'patterns',
      label: 'Patterns',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctPatterns embedded />
        </Suspense>
      ),
    },
    {
      key: 'integrations',
      label: 'Integrations',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctIntegrations embedded />
        </Suspense>
      ),
    },
    {
      key: 'alerts',
      label: 'Alerts',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctAlerts embedded />
        </Suspense>
      ),
    },
    {
      key: 'audit',
      label: 'Audit Trail',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctAuditBlocks embedded />
        </Suspense>
      ),
    },
    {
      key: 'dcf',
      label: 'DCF Valuations',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctDCF embedded />
        </Suspense>
      ),
    },
    {
      key: 'settings',
      label: 'Settings',
      render: () => (
        <Suspense fallback={<TabLoader />}>
          <AcctSettings embedded />
        </Suspense>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Accounting</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Transactions, exceptions, audit trail, and financial intelligence.
        </p>
      </div>

      <ResponsiveTabs sections={sections} value={tab} onChange={setTab} />
    </div>
  );
}
