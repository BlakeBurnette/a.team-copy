import React, { useMemo } from 'react';

const UsersTable = ({
  users = [],
  organizations = [],
  pendingChanges = {},
  queueChange,
  allowedRoles = [],
  allowedStatuses = [],
  notify,
  wouldViolateOwnerRule
}) => {
  const orgOptions = useMemo(
    () => organizations.map((o) => ({ value: String(o.id), label: o.name })),
    [organizations]
  );

  const onRoleChange = (user, nextRole) => {
    const nextOrgId =
      (pendingChanges?.[user.email]?.organization_id ?? user.organization_id) ?? null;

    if (nextRole === 'owner' && wouldViolateOwnerRule?.(user.email, nextOrgId)) {
      notify?.('Only one owner is allowed for an organization. Another owner already exists for this org.');
      return;
    }
    queueChange?.(user.email, 'role', nextRole);
  };

  const onStatusChange = (user, nextStatus) => {
    const role = (pendingChanges?.[user.email]?.role ?? user.role) ?? 'user';
    if (role === 'owner' && nextStatus === 'inactive') {
      notify?.('Organization owners cannot be set to inactive.');
      return;
    }
    queueChange?.(user.email, 'status', nextStatus);
  };

  const onOrgChange = (user, nextOrgIdRaw) => {
    const nextOrgId = nextOrgIdRaw === '' ? null : Number(nextOrgIdRaw);
    const nextRole = (pendingChanges?.[user.email]?.role ?? user.role) ?? 'user';
    if (nextRole === 'owner' && wouldViolateOwnerRule?.(user.email, nextOrgId)) {
      notify?.('Only one owner is allowed for an organization. Another owner already exists for this org.');
      return;
    }
    queueChange?.(user.email, 'organization_id', nextOrgId);
  };

  /* ---------------------- Desktop table (md and up) ---------------------- */
  const DesktopTable = () => (
    <div className="hidden md:block overflow-x-auto bg-white rounded-md border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="p-2 text-left border-b">Email</th>
            <th className="p-2 text-left border-b">Name</th>
            <th className="p-2 text-left border-b">Role</th>
            <th className="p-2 text-left border-b">Status</th>
            <th className="p-2 text-left border-b">Organization</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const pc = pendingChanges[u.email] || {};
            const role = pc.role ?? u.role ?? 'user';
            const status = pc.status ?? u.status ?? 'active';
            const orgId = pc.organization_id ?? u.organization_id ?? null;

            return (
              <tr key={u.email} className="border-b last:border-b-0">
                <td className="p-2 font-medium">{u.email}</td>
                <td className="p-2">{u.name || ''}</td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={role}
                    onChange={(e) => onRoleChange(u, e.target.value)}
                  >
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={status}
                    onChange={(e) => onStatusChange(u, e.target.value)}
                  >
                    {allowedStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={orgId != null ? String(orgId) : ''}
                    onChange={(e) => onOrgChange(u, e.target.value)}
                  >
                    <option value="">— None —</option>
                    {orgOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
          {!users.length && (
            <tr>
              <td className="p-3 text-gray-500" colSpan={5}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  /* ----------------------- Mobile list (below md) ------------------------ */
  const MobileList = () => (
    <div className="md:hidden space-y-3">
      {users.length === 0 && (
        <div className="bg-white rounded-md border p-3 text-gray-500">No users found.</div>
      )}

      {users.map((u) => {
        const pc = pendingChanges[u.email] || {};
        const role = pc.role ?? u.role ?? 'user';
        const status = pc.status ?? u.status ?? 'active';
        const orgId = pc.organization_id ?? u.organization_id ?? null;

        return (
          <div key={u.email} className="bg-white rounded-md border p-3 space-y-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{u.email}</div>
              <div className="text-sm text-gray-600 truncate">{u.name || '—'}</div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <select
                  className="mt-1 border rounded px-2 py-2 w-full"
                  value={role}
                  onChange={(e) => onRoleChange(u, e.target.value)}
                >
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Status</label>
                <select
                  className="mt-1 border rounded px-2 py-2 w-full"
                  value={status}
                  onChange={(e) => onStatusChange(u, e.target.value)}
                >
                  {allowedStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Organization</label>
                <select
                  className="mt-1 border rounded px-2 py-2 w-full"
                  value={orgId != null ? String(orgId) : ''}
                  onChange={(e) => onOrgChange(u, e.target.value)}
                >
                  <option value="">— None —</option>
                  {orgOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <DesktopTable />
      <MobileList />
    </div>
  );
};

export default UsersTable;
