// src/pages/RoleAwareDashboard.jsx
import React from 'react';
import { useUserProfile } from '../context/AuthContext';
import UserDashboard from './UserDashboard';
import DashboardHome from './DashboardHome';
import CrewDashboard from './CrewDashboard';

export default function RoleAwareDashboard() {
  const { role, isOwner, profile, user, roles: roleList } = useUserProfile?.() || {};

  // Normalize role from various sources
  const effectiveRole = (
    role ||
    profile?.role ||
    user?.role ||
    (Array.isArray(roleList) ? roleList[0] : '')
  )?.toLowerCase() || '';

  // Loading fallback
  if (!effectiveRole && isOwner == null) {
    return (
      <div className="p-6 text-neutral-600">
        Loading dashboard...
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  if (effectiveRole === 'user') {
    return <UserDashboard />;
  }

  if (effectiveRole === 'crew_member' || effectiveRole === 'crew_leader') {
    return <CrewDashboard />;
  }

  // Owner, Manager, Admin get the main dashboard
  return <DashboardHome />;
}
