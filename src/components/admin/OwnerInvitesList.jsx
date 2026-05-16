// src/components/admin/OwnerInvitesList.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function OwnerInvitesList({ authHeader }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      setErr('');
      const res = await axios.get('/api/admin/owner-invitations/recent', { headers: authHeader() });
      setRows(res.data?.invites || []);
    } catch (e) {
      console.error('load owner invites failed', e);
      setErr('Failed to load owner invites');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="bg-white rounded-lg shadow border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Recent Owner Invitations</h3>
        <button onClick={load} className="px-3 py-1 border rounded">Refresh</button>
      </div>
      {err && <div className="text-red-600 mb-2">{err}</div>}
      <div className="overflow-auto">
        <table className="min-w-[700px] w-full border border-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-2 border-b">Created</th>
              <th className="text-left p-2 border-b">Organization</th>
              <th className="text-left p-2 border-b">Email</th>
              <th className="text-left p-2 border-b">Status</th>
              <th className="text-left p-2 border-b">Expires</th>
              <th className="text-left p-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const link = `${window.location.origin}/admin/owner-onboard/${r.code}`;
              return (
                <tr key={r.code} className="border-b">
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{r.organization_name}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2 capitalize">{r.status}</td>
                  <td className="p-2">{r.expires_at ? new Date(r.expires_at).toLocaleString() : '—'}</td>
                  <td className="p-2"><a className="text-zinc-600 underline" href={link} target="_blank" rel="noreferrer">Open</a></td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td className="p-3 text-neutral-500" colSpan={6}>No owner invites yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
