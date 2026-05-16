import React, { useState } from 'react';
import ResponsiveTabs from '../components/ResponsiveTabs';
import LeadsTab from './sales/LeadsTab';
import QuotesTab from './sales/QuotesTab';
import FollowUpsTab from './sales/FollowUpsTab';
import AssignmentsTab from './sales/AssignmentsTab';
import PerformanceTab from './sales/PerformanceTab';

export default function SalesWorkspace() {
  const [tab, setTab] = useState('leads');

  const sections = [
    {
      key: 'leads',
      label: 'Leads',
      render: () => <LeadsTab />,
    },
    {
      key: 'quotes',
      label: 'Quotes',
      render: () => <QuotesTab />,
    },
    {
      key: 'follow-ups',
      label: 'Follow-ups',
      render: () => <FollowUpsTab />,
    },
    {
      key: 'assignments',
      label: 'Assignments',
      render: () => <AssignmentsTab />,
    },
    {
      key: 'performance',
      label: 'Performance',
      render: () => <PerformanceTab />,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Sales Tools</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Leads, quotes, follow-ups, and team coordination.
        </p>
      </div>

      <ResponsiveTabs sections={sections} value={tab} onChange={setTab} />
    </div>
  );
}
