// src/components/owner/TeamsManager.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Toast from '../Toast';
import InlineSelect from '../admin/InlineSelect';

const toNum = (v) => (v == null ? 0 : Number(v));

const RolePill = ({ role }) =>
  role === 'crew_leader' ? (
    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
      Leader
    </span>
  ) : null;

const cardCls = 'bg-white border border-neutral-200 rounded-xl shadow-sm p-4 space-y-4';
const sectionTitleCls = 'text-lg font-semibold text-neutral-900';
const subtextCls = 'text-sm text-neutral-600';
const inputCls = 'border border-neutral-300 rounded-lg px-3 text-sm w-full h-11 min-h-[44px]';
const buttonPrimaryCls =
  'inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-lg bg-neutral-900 text-white text-sm font-semibold whitespace-nowrap hover:bg-neutral-800 disabled:opacity-60';
const buttonSecondaryCls =
  'inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 whitespace-nowrap hover:bg-neutral-50 disabled:opacity-60';

const TeamsManager = () => {
  const [teams, setTeams] = useState([]);
  const [membersByTeam, setMembersByTeam] = useState(new Map());
  const [crewPool, setCrewPool] = useState([]);       // all crew (member + leader)
  const [roleById, setRoleById] = useState(new Map()); // id -> 'crew_member'|'crew_leader'
  const [unassigned, setUnassigned] = useState([]);

  const [newTeamName, setNewTeamName] = useState('');
  const [creatingMember, setCreatingMember] = useState({
    email: '',
    name: '',
    teamId: '',
    makeLeader: false,
  });

  const [busy, setBusy] = useState(false);

  // Rename modal state
  const [renameModal, setRenameModal] = useState({ show: false, teamId: null, name: '' });

  // Toast
  const [toast, setToast] = useState({ show: false, message: '' });
  const notify = (msg) => setToast({ show: true, message: msg });

  const auth = () => ({});

  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: String(t.id), label: t.name })),
    [teams]
  );

  const loadAll = async () => {
    try {
      setBusy(true);

      const [tRes, poolRes, mapRes] = await Promise.all([
        axios.get('/api/owner/teams',         { headers: auth(), withCredentials: true }),
        axios.get('/api/owner/crew-members',  { headers: auth(), withCredentials: true }),
        axios.get('/api/owner/teams/members', { headers: auth(), withCredentials: true }),
      ]);

      // Teams
      const rawTeams =
        (Array.isArray(tRes.data) && tRes.data) ||
        (tRes.status === 304 ? teams : []);
      const teamsArr = rawTeams.map((t) => ({
        ...t,
        id: toNum(t.id),
      }));
      setTeams(teamsArr);

      // Crew pool (+ roles)
      const poolArr =
        (Array.isArray(poolRes.data) && poolRes.data) ||
        (poolRes.status === 304 ? crewPool : []);
      setCrewPool(poolArr);
      setRoleById(new Map(poolArr.map((u) => [toNum(u.id), String(u.role || 'crew_member').toLowerCase()])));

      // Members by team
      const mapPayload =
        (mapRes && mapRes.data && typeof mapRes.data === 'object' ? mapRes.data : {}) ||
        (mapRes.status === 304 ? Object.fromEntries(membersByTeam) : {});
      const m = new Map();
      Object.entries(mapPayload).forEach(([teamId, list]) => {
        m.set(toNum(teamId), Array.isArray(list) ? list : []);
      });
      setMembersByTeam(m);

      // Unassigned = pool - assigned
      const assignedIds = new Set(Array.from(m.values()).flat().map((u) => toNum(u.id)));
      setUnassigned(poolArr.filter((u) => !assignedIds.has(toNum(u.id))));
    } catch (e) {
      console.error('[TeamsManager] loadAll error', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to load teams/crew');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------- Team actions ----------------------------- */

  const createTeam = async (e) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return notify('Team name required');
    try {
      setBusy(true);
      await axios.post('/api/owner/teams', { name }, { headers: auth(), withCredentials: true });
      setNewTeamName('');
      notify('Team created');
      await loadAll();
    } catch (e) {
      console.error('[TeamsManager] createTeam', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to create team');
    } finally {
      setBusy(false);
    }
  };

  const openRenameModal = (teamId, name) => {
    setRenameModal({ show: true, teamId, name });
  };

  const closeRenameModal = () => {
    setRenameModal({ show: false, teamId: null, name: '' });
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    const val = renameModal.name.trim();
    if (!val) return notify('Team name cannot be empty');
    try {
      setBusy(true);
      await axios.patch(
        `/api/owner/teams/${toNum(renameModal.teamId)}`,
        { name: val },
        { headers: auth(), withCredentials: true }
      );
      notify('Team renamed');
      closeRenameModal();
      await loadAll();
    } catch (e) {
      console.error('[TeamsManager] renameTeam', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to rename team');
    } finally {
      setBusy(false);
    }
  };

  const deleteTeam = async (teamId) => {
    if (!window.confirm('Delete this team? Members will become unassigned.')) return;
    try {
      setBusy(true);
      await axios.delete(`/api/owner/teams/${toNum(teamId)}`, {
        headers: auth(),
        withCredentials: true,
      });
      notify('Team deleted');
      await loadAll();
    } catch (e) {
      console.error('[TeamsManager] deleteTeam', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to delete team');
    } finally {
      setBusy(false);
    }
  };

  const addMember = async (teamId, userId) => {
    try {
      setBusy(true);
      await axios.post(
        `/api/owner/teams/${toNum(teamId)}/members`,
        { user_id: toNum(userId) },
        { headers: auth(), withCredentials: true }
      );
      notify('Member added to team');
      await loadAll();
    } catch (e) {
      console.error('[TeamsManager] addMember', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to add member');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (teamId, userId) => {
    try {
      setBusy(true);
      await axios.delete(`/api/owner/teams/${toNum(teamId)}/members/${toNum(userId)}`, {
        headers: auth(),
        withCredentials: true,
      });
      notify('Member removed from team');
      await loadAll();
    } catch (e) {
      console.error('[TeamsManager] removeMember', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to remove member');
    } finally {
      setBusy(false);
    }
  };

  const moveMember = async (fromTeamId, toTeamId, userId) => {
    try {
      setBusy(true);
      await axios.post(
        `/api/owner/teams/${toNum(toTeamId)}/members`,
        { user_id: toNum(userId) },
        { headers: auth(), withCredentials: true }
      );
      await axios.delete(`/api/owner/teams/${toNum(fromTeamId)}/members/${toNum(userId)}`, {
        headers: auth(),
        withCredentials: true,
      });
    } catch (e) {
      console.error('[TeamsManager] moveMember', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to move member');
    } finally {
      notify('Member moved');
      setBusy(false);
      await loadAll();
    }
  };

  /* ------------------------ Crew creation + invite ------------------------ */

  const createCrewMember = async (e) => {
    e.preventDefault();
    const email = creatingMember.email.trim();
    const name = creatingMember.name.trim() || null;
    const teamId = creatingMember.teamId ? toNum(creatingMember.teamId) : undefined;
    const role = creatingMember.makeLeader ? 'crew_leader' : 'crew_member';

    if (!email) return notify('Email is required');

    try {
      setBusy(true);

      // Create/upsert crew user; optional team assignment, role
      await axios.post(
        '/api/owner/crew-members',
        { email, name, team_id: teamId, role },
        { headers: auth(), withCredentials: true }
      );

      // Send invite via existing flow
      try {
        const invRes = await axios.post(
          '/api/owner/invitations',
          { email, role }, // let backend send /invite/accept for crew
          { headers: auth(), withCredentials: true }
        );
        if (invRes.data?.ok && invRes.data?.invited) {
          notify('Crew member created and invite sent');
        } else if (invRes.data?.ok && !invRes.data?.invited) {
          notify(invRes.data?.note || 'Crew member created. Invite not sent.');
        } else {
          notify(invRes.data?.error || 'Crew member created. Failed to send invite.');
        }
      } catch (inviteErr) {
        console.error('[TeamsManager] invite send failed:', inviteErr?.response?.data || inviteErr);
        notify(
          inviteErr?.response?.data?.error ||
            'Crew member created. Failed to send invite (mailer/login service not configured?).'
        );
      }

      setCreatingMember({ email: '', name: '', teamId: '', makeLeader: false });
      await loadAll();
    } catch (e) {
      console.error('[TeamsManager] createCrewMember', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to create crew member');
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- Roles ---------------------------------- */

  const setMemberRole = async (userId, nextRole) => {
    try {
      setBusy(true);
      await axios.patch(
        `/api/owner/crew-members/${toNum(userId)}/role`,
        { role: nextRole },
        { headers: auth(), withCredentials: true }
      );

      // Optimistic: update roleById immediately, then refresh
      setRoleById((m) => {
        const n = new Map(m);
        n.set(toNum(userId), nextRole);
        return n;
      });

      notify(nextRole === 'crew_leader' ? 'Made leader' : 'Removed leader');
      await loadAll();
    } catch (e) {
      console.error('[TeamsManager] setMemberRole', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to update role');
    } finally {
      setBusy(false);
    }
  };

  /* --------------------------------- UI --------------------------------- */

  return (
    <div className="space-y-8">
      {/* Toast */}
      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>

      {/* Rename Team Modal */}
      {renameModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeRenameModal}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Rename Team</h3>
            <form onSubmit={handleRenameSubmit}>
              <input
                type="text"
                className={`${inputCls} mb-4`}
                value={renameModal.name}
                onChange={(e) => setRenameModal((m) => ({ ...m, name: e.target.value }))}
                placeholder="Team name"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRenameModal}
                  className={buttonSecondaryCls}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={buttonPrimaryCls}
                  disabled={busy || !renameModal.name.trim()}
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create crew member */}
      <section className={cardCls}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className={sectionTitleCls}>Create Crew Member</div>
            <div className={subtextCls}>
              Creates a "Crew Member" or "Crew Leader" and sends an invite.
            </div>
          </div>
          <div className="text-xs text-neutral-500">Invites use your existing email template.</div>
        </div>
        <form onSubmit={createCrewMember} className="grid grid-cols-1 max-w-full lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-4 space-y-1">
            <label className="text-sm font-medium text-neutral-700">Email</label>
            <input
              className={inputCls}
              placeholder="crew@example.com"
              value={creatingMember.email}
              onChange={(e) => setCreatingMember((m) => ({ ...m, email: e.target.value }))}
              required
              type="email"
            />
          </div>
          <div className="space-y-1 lg:col-span-3">
            <label className="text-sm font-medium text-neutral-700">Name (optional)</label>
            <input
              className={inputCls}
              placeholder="Name"
              value={creatingMember.name}
              onChange={(e) => setCreatingMember((m) => ({ ...m, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1 lg:col-span-3 md-col-span-2">
            <label className="text-sm font-medium text-neutral-700">Team</label>
            <InlineSelect
              value={creatingMember.teamId}
              options={[{ value: '', label: 'No team' }, ...teamOptions]}
              onChange={(val) => setCreatingMember((m) => ({ ...m, teamId: val }))}
              placeholder="Assign to team…"
              buttonClassName="w-full h-11 min-h-[44px] border border-neutral-300 rounded-lg px-3 text-sm bg-white text-left"
            />
          </div>
          <div className="lg:justify-end lg:col-span-2 md:col-span-3">
            <button
              type="submit"
              className={`${buttonPrimaryCls} px-4 min-w-full`}
              disabled={busy}
            >
              {busy ? 'Working…' : 'Create & Invite'}
            </button>
          </div>
        </form>
      </section>

      {/* Create team */}
      <section className={cardCls}>
        <div className={sectionTitleCls}>Create Team</div>
        <form onSubmit={createTeam} className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1 min-w-[200px] flex-1">
            <label className="text-sm font-medium text-neutral-700">Team name</label>
            <input
              className={inputCls}
              placeholder="Ex: North Route"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
          </div>
          <div className="flex md:justify-end">
            <button
              type="submit"
              className={`${buttonPrimaryCls} w-full md:w-auto`}
              disabled={busy || !newTeamName.trim()}
            >
              {busy ? 'Working…' : 'Add Team'}
            </button>
          </div>
        </form>
      </section>

      {/* Unassigned list */}
      <section className={cardCls}>
        <div className={sectionTitleCls}>Unassigned Crew</div>
        {unassigned.length === 0 ? (
          <div className="text-neutral-600 text-sm">No unassigned crew.</div>
        ) : (
          <div className="space-y-2">
            {unassigned.map((u) => {
              const role = roleById.get(toNum(u.id)) || String(u.role || 'crew_member');
              return (
                <div key={u.id} className="flex items-center justify-between border border-neutral-200 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate text-neutral-900">
                      {u.name || '—'}
                      <RolePill role={role} />
                    </div>
                    <div className="text-sm text-neutral-600 truncate">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <InlineSelect
                      value=""
                      options={teamOptions}
                      onChange={(val) => {
                        const tid = toNum(val || 0);
                        if (tid) addMember(tid, u.id);
                      }}
                      placeholder="Assign to…"
                      buttonClassName="border border-neutral-300 rounded-lg px-2 py-1 text-sm bg-white"
                    />
                    <button
                      type="button"
                      className={buttonSecondaryCls}
                      onClick={() => setMemberRole(u.id, role === 'crew_leader' ? 'crew_member' : 'crew_leader')}
                    >
                      {role === 'crew_leader' ? 'Make member' : 'Make leader'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Teams + members */}
      <section className="space-y-4">
        {teams.map((t) => {
          const members = membersByTeam.get(toNum(t.id)) || [];
          const addable = crewPool.filter(
            (u) => !(members || []).some((m) => toNum(m.id) === toNum(u.id))
          );
          const addableOptions = addable.map((u) => ({
            value: String(u.id),
            label: u.name ? `${u.name} — ${u.email}` : u.email,
          }));

          return (
            <div key={t.id} className="bg-white border rounded-lg">
              <div className="p-4 flex items-center justify-between gap-2">
                <div className="font-semibold">{t.name}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openRenameModal(t.id, t.name)}
                    className={buttonSecondaryCls}
                    disabled={busy}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTeam(t.id)}
                    className={`${buttonSecondaryCls} text-red-600 border-red-300`}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="border-t p-4 space-y-2">
                {members.length === 0 ? (
                  <div className="text-neutral-600">No members in this team.</div>
                ) : (
                  members.map((u) => {
                    const role =
                      roleById.get(toNum(u.id)) ||
                      String(u.role || 'crew_member').toLowerCase();

                    const isLeader = role === 'crew_leader';

                    return (
                      <div key={u.id} className="flex items-center justify-between border rounded px-3 py-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {u.name || '—'}
                            <RolePill role={role} />
                          </div>
                          <div className="text-sm text-neutral-600 truncate">{u.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Toggle leader */}
                          <button
                            type="button"
                            onClick={() =>
                              setMemberRole(u.id, isLeader ? 'crew_member' : 'crew_leader')
                            }
                            className={`${buttonSecondaryCls} ${
                              isLeader
                                ? 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100'
                                : ''
                            }`}
                            disabled={busy}
                          >
                            {isLeader ? 'Remove leader' : 'Make leader'}
                          </button>

                          {/* Move */}
                          <InlineSelect
                            value=""
                            options={teamOptions.filter((opt) => toNum(opt.value) !== toNum(t.id))}
                            onChange={(val) => {
                              const tid = toNum(val || 0);
                              if (tid) moveMember(t.id, tid, u.id);
                            }}
                            placeholder="Move to…"
                            buttonClassName="border border-neutral-300 rounded-lg px-3 text-sm bg-white h-11 min-h-[44px]"
                          />

                          {/* Remove from team */}
                          <button
                            type="button"
                            onClick={() => removeMember(t.id, u.id)}
                            className={buttonSecondaryCls}
                            disabled={busy}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <InlineSelect
                    value=""
                    options={addableOptions}
                    onChange={(val) => {
                      const uid = toNum(val || 0);
                      if (uid) addMember(t.id, uid);
                    }}
                    placeholder="Add crew member…"
                    buttonClassName="border rounded px-2 py-1 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {teams.length === 0 && (
          <div className="bg-white border rounded-lg p-4 text-neutral-600">
            No teams yet. Create one above.
          </div>
        )}
      </section>
    </div>
  );
};

export default TeamsManager;
