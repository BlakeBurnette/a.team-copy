// src/components/admin/CreateUserForm.jsx
import React, { useState } from 'react';

export default function CreateUserForm({
  newUser,
  setNewUser,
  onSubmit,
  allowedRoles = ['user', 'admin', 'manager', 'payee', 'owner'],
  organizations = [],
  onQuickCreateOrg, // <- NEW (optional)
  creatingOrg = false, // <- NEW (optional)
  orgsLoading = false, // <- NEW (optional)
}) {
  const rolesNoOwner = allowedRoles.filter((r) => r !== 'owner');
  const [quickOrgName, setQuickOrgName] = useState('');

  const handleQuickCreate = async () => {
    const name = quickOrgName.trim();
    if (!name) return;
    if (typeof onQuickCreateOrg === 'function') {
      await onQuickCreateOrg(name);
      setQuickOrgName('');
    }
  };

  const noOrgs = !orgsLoading && organizations.length === 0;

  return (
    <form onSubmit={onSubmit} className="bg-white border rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3">Create User</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            className="border rounded w-full p-2"
            value={newUser.email}
            onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="border rounded w-full p-2"
            value={newUser.name}
            onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
            placeholder="Full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            className="border rounded w-full p-2"
            value={newUser.role}
            onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
          >
            {rolesNoOwner.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="text-xs text-neutral-500 mt-1">
            To add an organization owner, use the “Invite Owner” section below.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Organization</label>

          {/* If loading orgs */}
          {orgsLoading ? (
            <div className="text-sm text-neutral-600 py-2">Loading organizations…</div>
          ) : noOrgs ? (
            <div className="space-y-2">
              <div className="text-sm text-neutral-600">
                No organizations found. Create one quickly:
              </div>
              <div className="flex gap-2">
                <input
                  className="border rounded w-full p-2"
                  placeholder="Organization name"
                  value={quickOrgName}
                  onChange={(e) => setQuickOrgName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={!quickOrgName.trim() || creatingOrg}
                  className={`px-3 py-2 rounded text-white ${
                    creatingOrg ? 'bg-gray-400' : 'bg-zinc-600 hover:bg-blue-700'
                  }`}
                >
                  {creatingOrg ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          ) : (
            <select
              required
              className="border rounded w-full p-2"
              value={newUser.organization_id ?? ''}
              onChange={(e) =>
                setNewUser((p) => ({
                  ...p,
                  organization_id: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">— Select organization —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || `Org #${o.id}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="col-span-full">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newUser.send_invite}
              onChange={(e) => setNewUser((p) => ({ ...p, send_invite: e.target.checked }))}
            />
            <span>Send invite email</span>
          </label>
        </div>
      </div>

      <div className="mt-3">
        <button type="submit" className="px-4 py-2 rounded bg-zinc-600 text-white">
          Create
        </button>
      </div>
    </form>
  );
}
