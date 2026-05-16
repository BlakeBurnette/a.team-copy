import React from 'react';
import { useUserProfile } from '../../context/AuthContext';
import Schedule from './Schedule.jsx'; // ← explicit .jsx to avoid wrong resolution

export default function ScheduleIndex() {
  const { hasRole, profile } = useUserProfile() || {};
  const isCrew =
    typeof hasRole === 'function' &&
    (hasRole('crew_member') || hasRole('crew_leader'));

  // Owner/Admin/Manager => grouped view across all teams
  if (!isCrew) {
    return <Schedule mode="owner" groupByTeam />;
  }

  // Crew => scoped to their team only
  const teamId = profile?.team_id ?? profile?.teamId ?? null;
  return <Schedule mode="crew" teamId={teamId} />;
}
