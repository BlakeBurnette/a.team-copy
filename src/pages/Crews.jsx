// src/pages/Crews.jsx
import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserProfile } from '../context/AuthContext';
import ResponsiveTabs from '../components/ResponsiveTabs';
import TeamsManager from '../components/owner/TeamsManager';
import OwnerCrewShifts from './timecards/OwnerCrewShifts';
import OwnerDaySummary from './timecards/OwnerDaySummary';
import TimecardsHistory from './timecards/TimecardsHistory';

export default function Crews() {
  const { profile, loadingProfile } = useUserProfile();
  if (loadingProfile) return <div className="p-4 md:p-6 text-gray-600">Loading...</div>;
  if (!profile) return null;

  const role = (profile.role || '').toLowerCase();
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  if (!isOwner && !isAdmin && !isManager) {
    return <Navigate to="/unauthorized" replace />;
  }

  const sections = useMemo(() => {
    const list = [
      { key: 'Shifts', label: 'Shifts', render: () => <OwnerCrewShifts /> },
      { key: 'Day Summary', label: 'Day Summary', render: () => <OwnerDaySummary /> },
      { key: 'History', label: 'History', render: () => <TimecardsHistory scope="owner" /> },
    ];
    if (isOwner || isAdmin) {
      list.push({
        key: 'Teams',
        label: 'Teams',
        render: () =>
          isOwner || isAdmin ? (
            <TeamsManager />
          ) : (
            <div className="text-sm text-neutral-600">Only owners/admins can manage teams.</div>
          ),
      });
    }
    return list;
  }, [isOwner, isAdmin]);
  const [tab, setTab] = useState(sections[0]?.key || '');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Crews</h1>
        <p className="text-sm text-neutral-600">Owner/Admin can view all crew timecards, shift events, and team summaries.</p>
      </div>
      <ResponsiveTabs sections={sections} value={tab} onChange={setTab} />
    </div>
  );
}
