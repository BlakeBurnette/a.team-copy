// src/pages/CustomersTeamsTab.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth, useUserProfile } from '../context/AuthContext.jsx';
import { Users, Mail, Phone, MapPin, Plus } from 'lucide-react';

const str = (v) => (v == null ? '' : String(v)).toLowerCase();

function Pill({ children }) {
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
      {children}
    </span>
  );
}

function Row({ icon: Icon, children, href }) {
  if (!children) return null;
  const content = (
    <div className="inline-flex items-center gap-2">
      {Icon ? <Icon className="w-4 h-4 opacity-70" /> : null}
      <span className="truncate">{children}</span>
    </div>
  );
  return href ? (
    <a href={href} className="text-sm text-neutral-700 hover:text-amber-600">
      {content}
    </a>
  ) : (
    <div className="text-sm text-neutral-700">{content}</div>
  );
}

export default function CustomersTeamsTab({ showToast }) {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};

  const canAssign = roles.includes('owner') || roles.includes('manager') || ['owner', 'manager'].includes((profile?.role || '').toLowerCase());
  const canEdit   = roles.includes('owner') || roles.includes('manager') || ['owner', 'manager'].includes((profile?.role || '').toLowerCase());

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [teams, setTeams] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [assignTeamId, setAssignTeamId] = useState(null);
  const [assignSearch, setAssignSearch] = useState('');

  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});

  const authCfg = async () => {
    return { withCredentials: true };
  };

  const tryRequest = async (attempts) => {
    for (const a of attempts) {
      try {
        const cfg = await authCfg();
        const res = await axios({ method: a.method || 'POST', url: a.url, data: a.data, params: a.params, ...cfg });
        return res?.data ?? true;
      } catch (e) {
        const code = e?.response?.status;
        if (!code || ![400, 403, 404, 405].includes(code)) throw e;
      }
    }
    return false;
  };

  const normalizeTeam = (t) => ({
    id: Number(t.id ?? t.team_id ?? t.teamId),
    name: t.name ?? t.team_name ?? `Team ${t.id ?? t.team_id ?? ''}`,
  });

  const normalizeCustomer = (r) => {
    const addr = r?.address || {};
    const street = r?.street ?? addr.street ?? '';
    const city = r?.city ?? addr.city ?? '';
    const state = r?.state ?? addr.state ?? '';
    const zip = r?.zip ?? addr.zip ?? '';
    return {
      id: Number(r?.id ?? r?.customer_id ?? Math.random()),
      name: r?.name ?? r?.full_name ?? '',
      email: r?.email ?? r?.user_email ?? '',
      phone_number: r?.phone_number ?? r?.user_phone ?? '',
      street, city, state, zip,
      status: (r?.status ?? '').toLowerCase(),                // 'lead' | 'active' | 'paused' | 'archived'
      team_id: r?.team_id ?? r?.assigned_team_id ?? null,
      // Optional leader flags if your API returns them; harmless if absent
      is_leader: !!(r?.is_leader || r?.team_leader || (r?.role && String(r.role).toLowerCase() === 'leader')),
    };
  };

  const loadEverything = async () => {
    setLoading(true);
    setError('');
    try {
      const cfg = await authCfg();

      // Teams (best effort)
      let apiTeams = [];
      try {
        const { data: teamsData } = await axios.get('/api/owner/teams', cfg);
        apiTeams = Array.isArray(teamsData) ? teamsData.map(normalizeTeam) : [];
      } catch { /* ignore */ }

      // Customers
      const { data: customersData } = await axios.get('/api/owner/customers', cfg);
      const custRows = Array.isArray(customersData) ? customersData.map(normalizeCustomer).filter(Boolean) : [];

      // Include any team ids from customers if backend doesn’t return teams
      const idsFromCustomers = Array.from(
        new Set(
          custRows
            .map((c) => c.team_id)
            .filter((v) => v !== '' && v != null && !Number.isNaN(Number(v)))
            .map((v) => Number(v))
        )
      );
      const existingIds = new Set(apiTeams.map((t) => Number(t.id)));
      const synthesized = idsFromCustomers
        .filter((id) => !existingIds.has(id))
        .map((id) => ({ id, name: `Team ${id}` }));
      const finalTeams = [...apiTeams, ...synthesized].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      if (!assignTeamId && finalTeams[0]?.id) setAssignTeamId(Number(finalTeams[0].id));

      setTeams(finalTeams);
      setCustomers(custRows);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load teams/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEverything(); }, []); // eslint-disable-line

  const eligibleStatuses = new Set(['lead', 'active', 'paused']); // exclude archived
  const eligibleCustomers = useMemo(
    () => customers.filter((c) => eligibleStatuses.has(c.status || '')),
    [customers]
  );

  const isUnassigned = (c) => {
    const tid = c.team_id;
    if (tid === '' || tid == null) return true;
    const n = Number(tid);
    return Number.isNaN(n);
  };

  const unassigned = useMemo(
    () =>
      eligibleCustomers
        .filter(isUnassigned)
        .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '')),
    [eligibleCustomers]
  );

  const assignableFiltered = useMemo(() => {
    const q = str(assignSearch);
    if (!q) return unassigned;
    return unassigned.filter((c) =>
      [c.name, c.email, c.phone_number, c.street, c.city, c.state, c.zip].map(str).join(' ').includes(q)
    );
  }, [unassigned, assignSearch]);

  const teamIdToMembers = useMemo(() => {
    const map = new Map();
    for (const t of teams) map.set(Number(t.id), []);
    for (const c of eligibleCustomers) {
      const tidNum = Number(c.team_id);
      if (!Number.isNaN(tidNum) && map.has(tidNum)) map.get(tidNum).push(c);
    }
    for (const [, arr] of map) arr.sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''));
    return map;
  }, [teams, eligibleCustomers]);

  const addToTeam = async (customerId, teamId) => {
    if (!canAssign || !teamId) return;
    setBusy(true);
    try {
      const ok = await tryRequest([
        { method: 'POST', url: `/api/owner/customers/${customerId}/assign-team`, data: { team_id: Number(teamId) } },
        { method: 'POST', url: `/api/owner/teams/${teamId}/customers`, data: { customer_id: customerId } },
        { method: 'POST', url: `/api/owner/team-customers`, data: { team_id: Number(teamId), customer_id: customerId } },
        { method: 'PUT',  url: `/api/owner/customers/${customerId}`, data: { team_id: Number(teamId), assigned_team_id: Number(teamId) } },
      ]);
      if (!ok) throw new Error('No assign endpoint succeeded');
      showToast?.('Customer assigned to team');
      await loadEverything();
      setAssignSearch('');
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to assign');
    } finally {
      setBusy(false);
    }
  };

  const removeFromTeam = async (customerId, teamId) => {
    if (!canAssign || !teamId) return;
    if (!window.confirm('Remove this customer from the team?')) return;
    setBusy(true);
    try {
      const ok = await tryRequest([
        { method: 'DELETE', url: `/api/owner/teams/${teamId}/customers/${customerId}` },
        { method: 'DELETE', url: `/api/owner/customers/${customerId}/assign-team`, params: { team_id: Number(teamId) } },
        { method: 'POST',   url: `/api/owner/team-customers/delete`, data: { team_id: Number(teamId), customer_id: customerId } },
        { method: 'PUT',    url: `/api/owner/customers/${customerId}`, data: { team_id: null, assigned_team_id: null } },
      ]);
      if (!ok) throw new Error('No remove endpoint succeeded');
      showToast?.('Removed from team');
      await loadEverything();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to remove');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setDraft({
      email: c.email || '',
      phone_number: c.phone_number || '',
      street: c.street || '',
      city: c.city || '',
      state: c.state || '',
      zip: c.zip || '',
    });
  };

  const saveEdit = async (customerId) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const ok = await tryRequest([{ method: 'PUT', url: `/api/owner/customers/${customerId}`, data: draft }]);
      if (!ok) throw new Error('Save failed');
      showToast?.('Saved');
      setEditId(null);
      setDraft({});
      await loadEverything();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  // Team header actions
  const renameTeam = async (team) => {
    if (!canEdit) return;
    const name = window.prompt('Rename team', team.name || `Team ${team.id}`);
    if (!name || name.trim() === '' || name === team.name) return;
    setBusy(true);
    try {
      const ok = await tryRequest([
        { method: 'PUT', url: `/api/owner/teams/${team.id}`, data: { name } },
        { method: 'POST', url: `/api/owner/teams/${team.id}/rename`, data: { name } },
      ]);
      if (!ok) throw new Error('Rename failed');
      showToast?.('Team renamed');
      await loadEverything();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to rename team');
    } finally {
      setBusy(false);
    }
  };

  const deleteTeam = async (team) => {
    if (!canEdit) return;
    if (!window.confirm(`Delete ${team.name || `Team ${team.id}`}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const ok = await tryRequest([
        { method: 'DELETE', url: `/api/owner/teams/${team.id}` },
        { method: 'POST', url: `/api/owner/teams/${team.id}/delete` },
      ]);
      if (!ok) throw new Error('Delete failed');
      showToast?.('Team deleted');
      await loadEverything();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to delete team');
    } finally {
      setBusy(false);
    }
  };

  // Leader actions (attempt multiple possible endpoints)
  const makeLeader = async (teamId, customerId) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const ok = await tryRequest([
        { method: 'POST', url: `/api/owner/teams/${teamId}/leader`, data: { customer_id: customerId } },
        { method: 'PUT', url: `/api/owner/teams/${teamId}/leader`, data: { customer_id: customerId } },
        { method: 'POST', url: `/api/owner/teams/leader`, data: { team_id: Number(teamId), customer_id: customerId } },
        { method: 'PUT', url: `/api/owner/customers/${customerId}`, data: { team_id: Number(teamId), is_leader: true } },
      ]);
      if (!ok) throw new Error('No leader endpoint succeeded');
      showToast?.('Leader set');
      await loadEverything();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to set leader');
    } finally {
      setBusy(false);
    }
  };

  const removeLeader = async (teamId, customerId) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const ok = await tryRequest([
        { method: 'DELETE', url: `/api/owner/teams/${teamId}/leader/${customerId}` },
        { method: 'POST', url: `/api/owner/teams/${teamId}/leader/delete`, data: { customer_id: customerId } },
        { method: 'PUT', url: `/api/owner/customers/${customerId}`, data: { team_id: Number(teamId), is_leader: false } },
      ]);
      if (!ok) throw new Error('No remove-leader endpoint succeeded');
      showToast?.('Leader removed');
      await loadEverything();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Failed to remove leader');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-4 text-neutral-600">Loading…</div>;
  if (error)   return <div className="p-4 text-red-600">{error}</div>;

  const teamsById = new Map(teams.map((t) => [Number(t.id), t]));
  const allMembersByTeam = new Map(teamIdToMembers);

  return (
    <div className="space-y-8">

      {/* Team cards */}
      {teams.map((t) => {
        const members = allMembersByTeam.get(Number(t.id)) || [];
        return (
          <div key={t.id} className="border rounded bg-white overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">{t.name || `Team ${t.id}`}</div>
              <div className="flex gap-2">
                {canEdit && (
                  <>
                    <button
                      onClick={() => renameTeam(t)}
                      className="px-3 py-1.5 rounded border hover:bg-gray-50"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => deleteTeam(t)}
                      className="px-3 py-1.5 rounded border text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {members.length === 0 ? (
              <div className="p-4 text-gray-500">No users assigned.</div>
            ) : (
              <div className="divide-y">
                {members.map((c) => {
                  const isEditing = editId === c.id;
                  const isLeader = !!c.is_leader;

                  return (
                    <div key={`${t.id}-${c.id}`} className="p-3">
                      {/* Row content */}
                      {!isEditing ? (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {c.name || '—'}
                              {isLeader && <Pill>Leader</Pill>}
                            </div>
                            <div className="text-sm text-gray-600">{c.email || '—'}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canEdit && (
                              <>
                                <select
                                  className="border rounded px-2 py-2"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    addToTeam(c.id, Number(val));
                                  }}
                                  value=""
                                >
                                  <option value="">Move to…</option>
                                  {teams
                                    .filter((tt) => Number(tt.id) !== Number(t.id))
                                    .map((tt) => (
                                      <option key={`mv-${t.id}-${c.id}-${tt.id}`} value={tt.id}>
                                        {tt.name || `Team ${tt.id}`}
                                      </option>
                                    ))}
                                </select>

                                <button
                                  className="px-3 py-2 rounded border hover:bg-gray-50"
                                  disabled={busy}
                                  onClick={() => removeFromTeam(c.id, t.id)}
                                >
                                  Remove
                                </button>

                                {/* Optional: inline Edit contact/address */}
                                <button
                                  className="px-3 py-2 rounded border hover:bg-gray-50"
                                  onClick={() => startEdit(c)}
                                >
                                  Edit
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input className="border rounded px-2 py-1" placeholder="Email"
                                   value={draft.email || ''} onChange={(e)=>setDraft(d=>({...d, email:e.target.value}))}/>
                            <input className="border rounded px-2 py-1" placeholder="Phone"
                                   value={draft.phone_number || ''} onChange={(e)=>setDraft(d=>({...d, phone_number:e.target.value}))}/>
                            <input className="border rounded px-2 py-1 col-span-2" placeholder="Street"
                                   value={draft.street || ''} onChange={(e)=>setDraft(d=>({...d, street:e.target.value}))}/>
                            <input className="border rounded px-2 py-1" placeholder="City"
                                   value={draft.city || ''} onChange={(e)=>setDraft(d=>({...d, city:e.target.value}))}/>
                            <input className="border rounded px-2 py-1" placeholder="State"
                                   value={draft.state || ''} onChange={(e)=>setDraft(d=>({...d, state:e.target.value}))}/>
                            <input className="border rounded px-2 py-1" placeholder="ZIP"
                                   value={draft.zip || ''} onChange={(e)=>setDraft(d=>({...d, zip:e.target.value}))}/>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-3 py-2 rounded text-white bg-zinc-600 disabled:opacity-50" disabled={busy} onClick={()=>saveEdit(c.id)}>Save</button>
                            <button className="px-3 py-2 rounded border" onClick={()=>{setEditId(null); setDraft({});}}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned Crew */}
      <div className="border rounded bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Unassigned Crew</div>
        </div>
        {unassigned.length === 0 ? (
          <div className="p-4 text-gray-500">No unassigned crew.</div>
        ) : (
          <div className="divide-y">
            {unassigned.map((c) => (
              <div key={`un-${c.id}`} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{c.name || '—'}</div>
                  <div className="text-sm text-gray-600">{c.email || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded text-sm px-2 py-1"
                    value=""
                    onChange={(e) => {
                      const tid = e.target.value;
                      if (!tid) return;
                      addToTeam(c.id, Number(tid));
                    }}
                  >
                    <option value="">Move to…</option>
                    {teams.map((t) => (
                      <option key={`un-move-${t.id}`} value={t.id}>{t.name || `Team ${t.id}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
