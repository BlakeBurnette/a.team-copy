// src/components/dashboard/TeamStatusCard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Clock, CheckCircle, MapPin } from 'lucide-react';

/**
 * Team status card for crew leader dashboard
 * Shows which team members are clocked in/out
 */
export default function TeamStatusCard({ className = '' }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    let alive = true;

    const fetchTeamStatus = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/api/crew/team/status', {
          withCredentials: true,
          validateStatus: () => true,
        });

        if (!alive) return;
        setMembers(Array.isArray(data?.members) ? data.members : []);
      } catch {
        if (alive) setMembers([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchTeamStatus();
    // Refresh every 2 minutes
    const interval = setInterval(fetchTeamStatus, 120000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const clockedIn = members.filter((m) => m.is_clocked_in);
  const clockedOut = members.filter((m) => !m.is_clocked_in);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 rounded w-1/3" />
          <div className="h-6 bg-neutral-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b bg-neutral-50">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-neutral-600" />
          <h3 className="font-semibold text-neutral-900">Team Status</h3>
          <span className="text-sm text-neutral-500">
            ({clockedIn.length}/{members.length} on clock)
          </span>
        </div>
      </div>

      <div className="divide-y">
        {/* Clocked In */}
        {clockedIn.map((member) => (
          <div key={member.id} className="px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 truncate">
                {member.name || member.email}
              </p>
              {member.clocked_in_at && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Since {new Date(member.clocked_in_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              On Clock
            </span>
          </div>
        ))}

        {/* Clocked Out */}
        {clockedOut.map((member) => (
          <div key={member.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
            <div className="w-2 h-2 rounded-full bg-neutral-300" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-700 truncate">
                {member.name || member.email}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
              Off Clock
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
