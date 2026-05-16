import React, { useState } from 'react';
import ResponsiveTabs from '../components/ResponsiveTabs';
import OverviewTab from './business/OverviewTab';
import ApprovalsTab from './business/ApprovalsTab';
import ServicesTab from './business/ServicesTab';
import PaymentsTab from './business/PaymentsTab';
import ReceivablesTab from './business/ReceivablesTab';
import QuickBooksTab from './business/ReportsTab';

export default function BusinessWorkspace() {
  const [tab, setTab] = useState('overview');

  const sections = [
    {
      key: 'overview',
      label: 'Overview',
      render: () => <OverviewTab onSwitchTab={setTab} />,
    },
    {
      key: 'approvals',
      label: 'Approvals',
      render: () => <ApprovalsTab />,
    },
    {
      key: 'services',
      label: 'Services',
      render: () => <ServicesTab />,
    },
    {
      key: 'payments',
      label: 'Payments',
      render: () => <PaymentsTab />,
    },
    {
      key: 'receivables',
      label: 'Receivables',
      render: () => <ReceivablesTab />,
    },
    {
      key: 'quickbooks',
      label: 'QuickBooks',
      render: () => <QuickBooksTab />,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Business</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Performance, payments, and operations.
        </p>
      </div>

      <ResponsiveTabs sections={sections} value={tab} onChange={setTab} />
    </div>
  );
}
