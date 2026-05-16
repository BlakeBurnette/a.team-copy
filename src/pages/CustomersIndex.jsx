import React from 'react';
import ResponsiveTabs from '../components/ResponsiveTabs';
import Toast from '../components/Toast';

import CustomersOverview from './Customers';
import CustomersTeamsTab from './CustomersTeamsTab';
import PipelineTab from './customer/PipelineTab';

export default function CustomersIndex() {
  const [tab, setTab] = React.useState('Overview');

  const [toast, setToast] = React.useState({ show: false, msg: '' });
  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2200);
  };

  const items = React.useMemo(
    () => [
      { key: 'Overview', label: 'Overview', render: () => <CustomersOverview /> },
      { key: 'Teams',    label: 'Teams',    render: () => <CustomersTeamsTab showToast={showToast} /> },
      { key: 'Pipeline', label: 'Pipeline', render: () => <PipelineTab /> },
    ],
    [] // showToast stable enough
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <Toast show={toast.show} onClose={() => setToast({ show: false, msg: '' })}>
        {toast.msg}
      </Toast>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <h2 className="text-2xl font-bold">Customers</h2>
      </div>

      <div className="mt-4">
        <ResponsiveTabs sections={items} value={tab} onChange={setTab} />
      </div>
    </div>
  );
}
