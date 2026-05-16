import React from 'react';
import { useUserProfile } from '../context/AuthContext';
import TimecardsHistory from './timecards/TimecardsHistory';

export default function MyTimecards() {
  const { profile } = useUserProfile() || {};
  const userId = profile?.id;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-neutral-900 mb-3">My Timecards</h1>
      <p className="text-sm text-neutral-600 mb-4">
        View your timecard runs, totals, and exports. You will not see team totals or other users here.
      </p>
      <TimecardsHistory scope="self" userId={userId} />
    </div>
  );
}
