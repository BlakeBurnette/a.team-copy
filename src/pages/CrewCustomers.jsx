// src/pages/CrewCustomers.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useUserProfile, useAuth } from '../context/AuthContext.jsx';

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${tones[tone] || tones.slate}`}
    >
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

export default function CrewCustomers() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const normalize = (r) => {
    const addr = r?.address || {};
    const street = r?.street ?? addr.street ?? '';
    const city = r?.city ?? addr.city ?? '';
    const state = r?.state ?? addr.state ?? '';
    const zip = r?.zip ?? addr.zip ?? '';
    const serviceName = r?.service_name ?? r?.service ?? r?.plan_name ?? '';
    const priceCents = Number.isFinite(r?.price_cents)
      ? r.price_cents
      : Number.isFinite(Number(r?.price))
      ? Number(r.price) * 100
      : null;
    const price = Number.isFinite(priceCents) ? `$${(priceCents / 100).toFixed(2)}` : null;

    return {
      id: r?.id ?? r?.customer_id ?? Math.random(),
      created_at: r?.created_at ?? null,
      name: r?.name ?? r?.full_name ?? '',
      email: r?.email ?? r?.user_email ?? '',
      phone: r?.phone_number ?? r?.user_phone ?? '',
      street,
      city,
      state,
      zip,
      status: (r?.status ?? 'active').toLowerCase(),
      service_name: serviceName,
      price,
      has_invoice: Boolean(r?.has_invoice),
    };
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/crew/customers', {
        withCredentials: true,
      });
      const rows = Array.isArray(data?.customers) ? data.customers : Array.isArray(data) ? data : [];
      const norm = rows.map(normalize).filter((c) => c.status === 'active');
      setCustomers(norm);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const str = (v) => (v == null ? '' : String(v)).toLowerCase();
  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = str(search);
    return customers.filter((c) =>
      [c.name, c.email, c.phone, c.street, c.city, c.state, c.zip, c.service_name]
        .map(str)
        .join(' ')
        .includes(q)
    );
  }, [customers, search]);

  const startEdit = (c) => {
    setEditingId(c.id);
    setDraft({
      email: c.email || '',
      phone_number: c.phone || '',
      street: c.street || '',
      city: c.city || '',
      state: c.state || '',
      zip: c.zip || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = async (custId) => {
    try {
      await axios.put(`/api/crew/customers/${custId}`, draft, {
        withCredentials: true,
      });
      await fetchCustomers();
      setEditingId(null);
      setDraft({});
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to save');
    }
  };

  if (loading) return <div className="p-6 text-neutral-600">Loading customers…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-neutral-600">Active customers assigned to your team. Update contact info as needed.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="crew-customer-search">
            Search customers
          </label>
          <input
            id="crew-customer-search"
            type="search"
            placeholder="Search by name, email, phone, address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-80"
          />
          <button onClick={fetchCustomers} className="px-3 py-2 border rounded hover:bg-gray-50" aria-label="Refresh">
            Refresh
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse bg-white rounded border">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="border p-2">Name</th>
              <th className="border p-2">Address</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Phone</th>
              <th className="border p-2">Service</th>
              <th className="border p-2">Invoice</th>
              <th className="border p-2 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const isEditing = editingId === c.id;
              return (
                <tr key={c.id}>
                  <td className="border p-2 font-medium">{c.name || '—'}</td>
                  <td className="border p-2">
                    {[c.street, c.city, c.state, c.zip].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="border p-2">
                    {isEditing ? (
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={draft.email}
                        onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                      />
                    ) : (
                      c.email || '—'
                    )}
                  </td>
                  <td className="border p-2">
                    {isEditing ? (
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={draft.phone_number}
                        onChange={(e) => setDraft((d) => ({ ...d, phone_number: e.target.value }))}
                      />
                    ) : (
                      c.phone || '—'
                    )}
                  </td>
                  <td className="border p-2">
                    {c.service_name ? (
                      <Pill tone="amber">
                        {c.service_name}
                        {c.price ? ` • ${c.price}` : ''}
                      </Pill>
                    ) : c.price ? (
                      <Pill tone="amber">{c.price}</Pill>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="border p-2">
                    {c.has_invoice ? <Pill tone="green">Invoice</Pill> : <Pill tone="gray">No invoice</Pill>}
                  </td>
                  <td className="border p-2">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(c.id)} className="px-3 py-2 rounded text-white bg-zinc-600">
                          Save
                        </button>
                        <button onClick={cancelEdit} className="px-3 py-2 rounded border">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => startEdit(c)} className="px-3 py-2 rounded border hover:bg-gray-50">
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            startEdit(c);
                            setDraft((d) => ({
                              ...d,
                              street: c.street || '',
                              city: c.city || '',
                              state: c.state || '',
                              zip: c.zip || '',
                            }));
                          }}
                          className="px-3 py-2 rounded border hover:bg-gray-50"
                          title="Edit address"
                        >
                          Address
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="border p-4 text-gray-500" colSpan={7}>
                  No customers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white border rounded-lg shadow-sm p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-base">{c.name || '—'}</div>
              {c.has_invoice ? <Pill tone="green">Invoice</Pill> : <Pill tone="gray">No invoice</Pill>}
            </div>
            <Row icon={MapPin}>{[c.street, c.city, c.state, c.zip].filter(Boolean).join(', ')}</Row>
            <Row icon={Mail} href={c.email ? `mailto:${c.email}` : undefined}>
              {c.email}
            </Row>
            <Row icon={Phone} href={c.phone ? `tel:${c.phone}` : undefined}>
              {c.phone}
            </Row>

            {(c.service_name || c.price) && (
              <div className="pt-1">
                <Pill tone="amber">
                  {c.service_name || 'Service'}
                  {c.price ? ` • ${c.price}` : ''}
                </Pill>
              </div>
            )}

            {editingId === c.id ? (
              <div className="pt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="border rounded px-2 py-1"
                    placeholder="Email"
                    value={draft.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  />
                  <input
                    className="border rounded px-2 py-1"
                    placeholder="Phone"
                    value={draft.phone_number}
                    onChange={(e) => setDraft((d) => ({ ...d, phone_number: e.target.value }))}
                  />
                  <input
                    className="border rounded px-2 py-1 col-span-2"
                    placeholder="Street"
                    value={draft.street}
                    onChange={(e) => setDraft((d) => ({ ...d, street: e.target.value }))}
                  />
                  <input
                    className="border rounded px-2 py-1"
                    placeholder="City"
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  />
                  <input
                    className="border rounded px-2 py-1"
                    placeholder="State"
                    value={draft.state}
                    onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                  />
                  <input
                    className="border rounded px-2 py-1"
                    placeholder="ZIP"
                    value={draft.zip}
                    onChange={(e) => setDraft((d) => ({ ...d, zip: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(c.id)} className="px-3 py-2 rounded text-white bg-zinc-600">
                    Save
                  </button>
                  <button onClick={cancelEdit} className="px-3 py-2 rounded border">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <button onClick={() => startEdit(c)} className="px-3 py-2 rounded border">
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-gray-500">No customers match your search.</div>}
      </div>
    </div>
  );
}
