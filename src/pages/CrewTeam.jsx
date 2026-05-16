// src/pages/Team.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Users, Mail, Phone, Shield } from 'lucide-react';
import { useUserProfile, useAuth } from '../context/AuthContext.jsx';

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Row({ label, value, icon: Icon, href }) {
  if (!value) return null;
  const content = (
    <>
      {Icon ? <Icon className="w-4 h-4 mr-2 opacity-70" /> : null}
      <span className="truncate">{value}</span>
    </>
  );
  return (
    <div className="flex items-center text-sm text-neutral-700">
      {href ? (
        <a className="inline-flex items-center hover:text-amber-600" href={href}>
          {content}
        </a>
      ) : (
        <div className="inline-flex items-center">{content}</div>
      )}
    </div>
  );
}

export default function CrewTeam() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};
  const meId = profile?.id;
  const meEmail = (profile?.email || '').toLowerCase();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');

  const fetchTeam = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/crew/team', {
        withCredentials: true,
      });
      setTeam(data?.team || null);
      setMembers(Array.isArray(data?.members) ? data.members : []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load team');
      setTeam(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const isMe = (m) =>
      (meId && m.id === meId) ||
      (!!meEmail && (m.email || '').toLowerCase() === meEmail);
    const mine = members.filter(isMe);
    const others = members.filter((m) => !isMe(m));
    return [...mine, ...others];
  }, [members, meId, meEmail]);

  if (loading) {
    return <div className="p-6 text-neutral-600">Loading team…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!team) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-neutral-700">
          <Users className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Team</h1>
        </div>
        <div className="mt-3 text-neutral-700">
          You’re not assigned to a team yet.
        </div>
        <div className="mt-1 text-neutral-500 text-sm">
          Ask your owner/manager to add you to a team so you can see your teammates here.
        </div>
      </Card>
    );
    }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-neutral-700" />
          <h1 className="text-xl font-semibold text-neutral-800">
            {team?.name || 'Team'}
          </h1>
        </div>
        <div className="mt-1 text-sm text-neutral-600">
          {sorted.length} {sorted.length === 1 ? 'member' : 'members'}
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sorted.map((m) => {
            const isMe =
              (meId && m.id === meId) ||
              (!!meEmail && (m.email || '').toLowerCase() === meEmail);

            return (
              <div
                key={m.id}
                className="border border-neutral-200 rounded-lg p-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-neutral-900 truncate">
                      {m.name || 'Member'}
                    </div>
                    {isMe ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        You
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-600 flex items-center gap-2">
                    {m.role ? (
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 opacity-60" />
                        <span className="uppercase tracking-wide">{m.role}</span>
                      </span>
                    ) : null}
                    {m.status ? (
                      <span className="text-neutral-500">• {m.status}</span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-col gap-1.5">
                    <Row
                      icon={Mail}
                      value={m.email}
                      href={m.email ? `mailto:${m.email}` : undefined}
                    />
                    <Row
                      icon={Phone}
                      value={m.phone_number}
                      href={m.phone_number ? `tel:${m.phone_number}` : undefined}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
