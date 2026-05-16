import React from 'react';
import ResponsiveTabs from '../../components/ResponsiveTabs';
import Toast from '../../components/Toast';

import AccountTab from './AccountTab';
import ServicesTab from './ServicesTab';
import ScheduleTab from './ScheduleTab';
import OrganizationTab from './OrganizationTab';

export default function Account() {
  const [tab, setTab] = React.useState('Account');

  const [toast, setToast] = React.useState({ show: false, msg: '' });
  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2500);
  };

  const items = React.useMemo(() => ([
    { key: 'Account', label: 'Account', render: () => <AccountTab showToast={showToast} /> },
    { key: 'Services', label: 'Services', render: () => <ServicesTab showToast={showToast} /> },
    { key: 'Schedule', label: 'Schedule', render: () => <ScheduleTab showToast={showToast} /> },
    { key: 'Organization', label: 'Organization', render: () => <OrganizationTab showToast={showToast} /> },
  ]), []); // showToast is stable enough; if you want, add it to deps.

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Toast show={toast.show} onClose={() => setToast({ show: false, msg: '' })}>
        {toast.msg}
      </Toast>

      <h2 className="text-2xl font-bold mb-4">Account</h2>

      <div className="mt-2">
        <ResponsiveTabs sections={items} value={tab} onChange={setTab} />
      </div>
    </div>
  );
}
