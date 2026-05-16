import React, { useMemo, useState } from 'react';
import axios from 'axios';

const Badge = ({ tone = 'gray', children }) => {
  const tones = {
    gray: 'bg-gray-50 border border-gray-200 text-gray-700',
    green: 'bg-green-50 border border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border border-red-200 text-red-700',
    blue: 'bg-blue-50 border border-blue-200 text-blue-700',
  };
  return <span className={`px-2 py-0.5 text-xs rounded ${tones[tone] || tones.gray}`}>{children}</span>;
};

function centsToDollars(cents) {
  const n = Number.isFinite(cents) ? cents : 0;
  return (n / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

/**
 * Props:
 * - organizations: Array<Org> (from /api/admin/organizations)
 * - orgSummary: Array<{ organization_id:number, active_users?:number, active_user_count?:number, amount_cents?:number, amount_preview_cents?:number }>
 * - authHeader: () => ({ Authorization: 'Bearer …'})
 * - notify: (msg: string) => void
 * - onChanged: () => void   // called after a toggle succeeds (to refresh parent lists)
 */
export default function OrganizationsActivationList({
  organizations = [],
  orgSummary = [],
  authHeader,
  notify = () => {},
  onChanged = () => {},
}) {
  const [busy, setBusy] = useState(null);
  const [showInactive, setShowInactive] = useState(true);
  const [q, setQ] = useState('');

  // Index summary rows by org id; accept multiple possible key names
  const summaryById = useMemo(() => {
    const map = new Map();
    for (const row of orgSummary || []) {
      const id = row.organization_id ?? row.org_id ?? row.id;
      if (id == null) continue;
      map.set(id, {
        activeUsers: row.active_users ?? row.active_user_count ?? row.members_active ?? 0,
        amountCents: row.amount_preview_cents ?? row.amount_cents ?? 0,
      });
    }
    return map;
  }, [orgSummary]);

  // Filter/search
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (organizations || [])
      .filter((o) => (showInactive ? true : (o.status ?? 'active') === 'active'))
      .filter((o) => {
        if (!needle) return true;
        const hay = [
          o.name, o.email, o.phone_number, o.city, o.state, o.zip, o.status, String(o.id)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
  }, [organizations, showInactive, q]);

  // Total monthly estimate (over the filtered set)
  const monthlyTotalCents = useMemo(() => {
    return filtered.reduce((sum, o) => {
      const s = summaryById.get(o.id);
      return sum + (s?.amountCents ?? 0);
    }, 0);
  }, [filtered, summaryById]);

  const toggleStatus = async (org) => {
    const next = ((org.status || '').toLowerCase() === 'active') ? 'inactive' : 'active';
    try {
      setBusy(org.id);
      await axios.post(
        '/api/admin/update-organization',
        { id: org.id, status: next },
        { headers: authHeader?.() }
      );
      notify(`Organization “${org.name || org.id}” set to ${next}.`);
      onChanged?.();
    } catch (err) {
      console.error('toggleStatus failed', err?.response?.data || err);
      notify(err?.response?.data?.error || 'Failed to update organization status');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="text-lg font-semibold">Organizations (activate / deactivate)</h3>
          <div className="text-sm text-gray-600">
            Monthly estimate (filtered): <strong>{centsToDollars(monthlyTotalCents)}</strong>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={() => setShowInactive((v) => !v)}
            />
            Show inactive
          </label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search orgs by name, email, id…"
            className="border px-3 py-2 rounded w-full md:w-80"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border rounded bg-white p-4 text-gray-500">No organizations match.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => {
            const s = summaryById.get(o.id) || { activeUsers: 0, amountCents: 0 };
            const isActive = String(o.status || '').toLowerCase() === 'active';
            return (
              <div key={o.id} className="rounded-lg border p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-base">{o.name || `Org ${o.id}`}</div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      ID #{o.id}{o.city ? ` • ${o.city}, ${o.state || ''}` : ''}
                      {o.email ? ` • ${o.email}` : ''}
                    </div>
                  </div>
                  <Badge tone={isActive ? 'green' : 'red'}>
                    {isActive ? 'active' : 'inactive'}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                  <div><span className="text-gray-500">Active users:</span> {s.activeUsers}</div>
                  <div><span className="text-gray-500">Monthly estimate:</span> {centsToDollars(s.amountCents)}</div>
                  <div><span className="text-gray-500">Phone:</span> {o.phone_number || '—'}</div>
                  <div><span className="text-gray-500">Owner user:</span> {o.owner_user_id ?? '—'}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleStatus(o)}
                    disabled={busy === o.id}
                    className={`px-3 py-2 rounded text-white ${busy === o.id ? 'bg-gray-500' : isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {busy === o.id ? 'Updating…' : (isActive ? 'Deactivate' : 'Activate')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
