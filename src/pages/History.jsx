import React from 'react';
import HistoryList from '../components/history/HistoryList';
import { useMemo } from 'react';
import { useUserProfile } from '../context/AuthContext';

export default function History() {
  const { profile } = useUserProfile() || {};
  const headers = useMemo(() => ({}), []);
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">History</h1>
      </div>
      <HistoryList scope="org" headers={headers} />
    </div>
  );
}
