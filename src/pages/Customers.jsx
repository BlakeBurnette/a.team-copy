// src/pages/Customers.jsx
import React, { useEffect, useMemo, useState, useDeferredValue, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useUserProfile, useAuth } from '../context/AuthContext.jsx';
import { Users, UserPlus, Upload } from 'lucide-react';
import ImportCustomersModal from '../components/ImportCustomersModal';

/* ----------------------------- Presentational UI ---------------------------- */

const Section = memo(function Section({ title, extra, children }) {
  return (
    <div className="border rounded bg-white overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="font-semibold">{title}</div>
        <div className="flex items-center gap-3 w-full md:w-auto">{extra}</div>
      </div>
      <div className="p-3 grid gap-3">{children}</div>
    </div>
  );
});

const Badge = memo(function Badge({ tone = 'gray', children }) {
  const tones = {
    gray: 'bg-gray-50 border border-gray-200 text-gray-700',
    green: 'bg-green-50 border border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border border-blue-200 text-blue-700',
    red: 'bg-red-50 border border-red-200 text-red-700',
    purple: 'bg-purple-50 border border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border border-orange-200 text-orange-700',
  };
  return <span className={`px-2 py-0.5 text-xs rounded ${tones[tone] || tones.gray}`}>{children}</span>;
});

const Card = memo(function Card({ children }) {
  return <div className="rounded-lg border p-4 bg-white shadow-sm">{children}</div>;
});

const Address = memo(function Address({ c }) {
  const parts = [c.street, c.city, c.state, c.zip].filter(Boolean);
  return <>{parts.length ? parts.join(', ') : '—'}</>;
});

// Format frequency with interval for display
function formatFrequency(freq, interval) {
  if (!freq) return '';

  const f = String(freq).toLowerCase();
  const int = Number(interval);

  // Handle interval-based frequencies
  if (f === 'every_x_weeks' && int > 0) {
    return `every ${int} week${int === 1 ? '' : 's'}`;
  }
  if (f === 'every_x_months' && int > 0) {
    return `every ${int} month${int === 1 ? '' : 's'}`;
  }

  // Clean up underscores and return readable format
  const readable = {
    'once': 'one-time',
    'weekly': 'weekly',
    'bi-weekly': 'bi-weekly',
    'biweekly': 'bi-weekly',
    'monthly': 'monthly',
    'every_6_months': 'every 6 months',
    'quarterly': 'quarterly',
    'annually': 'annually',
    'yearly': 'yearly',
  };

  return readable[f] || f.replace(/_/g, ' ');
}

const Pill = memo(function Pill({ children }) {
  return <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50">{children}</span>;
});

function currency(cents) {
  const n = Math.max(0, Number(cents || 0));
  return `$${(n / 100).toFixed(2)}`;
}

/* --------------------------- Helpers used in cards -------------------------- */

function toStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'green';
  if (s === 'paused') return 'yellow';
  if (s === 'archived') return 'gray';
  if (s === 'lead') return 'blue';
  return 'gray';
}

/* --------------------------------- Page --------------------------------- */

export default function Customers() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const profileCtx = useUserProfile() || {};
  const profile = profileCtx?.profile || profileCtx?.user || null;
  const loadingProfile = profileCtx?.loadingProfile || false;

  const canManage = profile?.role === 'owner' || profile?.role === 'manager';

  // Loading & errors
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buckets
  const [customersActive, setCustomersActive] = useState([]);
  const [leads, setLeads] = useState([]);
  const [archived, setArchived] = useState([]);
  const [org, setOrg] = useState(null);

  // Search & filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [leadsSearch, setLeadsSearch] = useState('');
  const [archivedSearch, setArchivedSearch] = useState('');

  const customerSearchQ = useDeferredValue(customerSearch);
  const leadsSearchQ = useDeferredValue(leadsSearch);
  const archivedSearchQ = useDeferredValue(archivedSearch);

  const [freqFilter, setFreqFilter] = useState(''); // '', 'weekly', 'bi-weekly', 'monthly', etc.
  const [tagFilter, setTagFilter] = useState('');   // comma or single tag
  const [onlyAutopay, setOnlyAutopay] = useState(false);
  const [withBalanceDue, setWithBalanceDue] = useState(false);
  const [remindersOnly, setRemindersOnly] = useState(false);

  // Local UI
  const [busyId, setBusyId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // --- selection state for leads
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const toggleLeadSelected = (id, on) => {
    setSelectedLeadIds((prev) => {
      const set = new Set(prev);
      if (on) set.add(id); else set.delete(id);
      return Array.from(set);
    });
  };
  const clearLeadSelection = () => setSelectedLeadIds([]);
  const allLeadIds = useMemo(() => leads.map(l => l.id), [leads]);
  const allLeadsSelected = selectedLeadIds.length > 0 && selectedLeadIds.length === allLeadIds.length;
  const anyLeadSelected = selectedLeadIds.length > 0;
  const toggleSelectAllLeads = () => {
    setSelectedLeadIds((prev) => (prev.length === allLeadIds.length ? [] : allLeadIds));
  };

  const str = (v) => (v == null ? '' : String(v)).toLowerCase();
  const matches = (hay, q) => (!q ? true : hay.includes(str(q)));
  const hasTag = (tags, needle) => {
    if (!needle) return true;
    const arr = String(needle)
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (!arr.length) return true;
    const set = new Set((Array.isArray(tags) ? tags : []).map((t) => String(t).toLowerCase()));
    return arr.every((t) => set.has(t));
  };

  /* --------------------------------- Normalize rows --------------------------------- */
  const normalizeCustomerRow = (r) => {
    if (!r || typeof r !== 'object') return null;
    const addressObj = r.address || {};
    const street = r.street ?? addressObj.street ?? '';
    const city = r.city ?? addressObj.city ?? '';
    const state = r.state ?? addressObj.state ?? '';
    const zip = r.zip ?? addressObj.zip ?? '';

    const services = Array.isArray(r.services) ? r.services : (r.service_list || []);
    const lastVisits = Array.isArray(r.last_visits) ? r.last_visits : (r.visits_recent || []);
    const tags = Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? r.tags.split(',').map(s => s.trim()).filter(Boolean) : []);

    return {
      id: r.id ?? r.customer_id ?? Math.random(),
      created_at: r.created_at ?? r.createdAt ?? r.created ?? null,

      // Identity
      name: r.name ?? r.full_name ?? '',
      email: r.email ?? '',
      phone_number: r.phone_number ?? r.phone ?? r.phoneNumber ?? '',
      street, city, state, zip,

      // Status
      status: (r.status ?? 'active').toLowerCase(),

      // Service/Frequency
      frequency: (r.frequency || r.service_frequency || '').toLowerCase(),
      service_interval: r.service_interval || r.interval || null,
      next_visit_at: r.next_visit_at ?? r.next_service_at ?? r.nextVisitAt ?? null,
      services,

      // History & notes
      last_visits: lastVisits,
      notes: r.notes || [],
      tags,

      // Promotions & reminders
      reminder_opt_in: !!(r.reminder_opt_in ?? r.auto_remind),
      referral_count: Number(r.referral_count || 0),

      // Billing snapshot
      cltv_cents: Number(r.cltv_cents || r.cltv || 0),
      outstanding_balance_cents: Number(r.outstanding_balance_cents || r.balance_due_cents || 0),
      has_autopay: !!(r.has_autopay ?? r.autopay ?? false),
    };
  };

  /* --------------------------------- Data fetch --------------------------------- */
  const fetchData = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const [custRes, orgRes] = await Promise.all([
        axios.get('/api/owner/customers', {
          withCredentials: true,
        }).catch(() => ({ data: [] })), // Treat errors as empty - handles new orgs with no customers
        axios
          .get('/api/owner/my-organization', {
            withCredentials: true,
          })
          .catch(() => ({ data: null })),
      ]);

      const payload = custRes.data ?? [];
      const rawRows = Array.isArray(payload) ? payload : (payload.customers || payload.rows || payload.data || []);
      const rows = Array.isArray(rawRows)
        ? rawRows.map(normalizeCustomerRow).filter(Boolean)
        : [];

      const groupLeads = rows.filter((r) => (r.status || '') === 'lead');
      const groupCustomers = rows.filter((r) => ['active','paused'].includes((r.status || '')));
      const groupArchived = rows.filter((r) => (r.status || '') === 'archived');

      setLeads(groupLeads);
      setCustomersActive(groupCustomers);
      setArchived(groupArchived);
      setOrg(orgRes?.data || null);
      clearLeadSelection();
    } catch (e) {
      // Even on error, set empty state rather than error message
      // This handles new organizations that may not have the tables yet
      console.warn('[Customers] fetch error:', e);
      setLeads([]);
      setCustomersActive([]);
      setArchived([]);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingProfile) fetchData();
  }, [loadingProfile]); // eslint-disable-line

  /* --------------------------------- Actions --------------------------------- */
  const tryRequest = async (attempts) => {
    let lastErr;
    for (const a of attempts) {
      try {
        if (a.method === 'PUT') {
          await axios.put(a.url, a.body ?? {}, a.config);
        } else if (a.method === 'DELETE') {
          await axios.delete(a.url, a.config);
        } else {
          await axios.post(a.url, a.body ?? {}, a.config);
        }
        return true;
      } catch (e) {
        lastErr = e;
        const code = e?.response?.status;
        if (code && ![404, 400, 405, 403].includes(code)) throw e;
      }
    }
    if (lastErr) throw lastErr;
    return false;
  };

  const authCfg = async () => {    return { withCredentials: true };
  };

  const addNote = async (custId, text) => {
    if (!canManage || !text?.trim()) return;
    try {
      setBusyId(custId);
      const cfg = await authCfg();
      await tryRequest([
        { method: 'POST', url: `/api/owner/customers/${custId}/notes`, body: { text }, config: cfg },
        { method: 'POST', url: `/api/customers/${custId}/notes`, body: { text }, config: cfg },
        { method: 'POST', url: `/api/notes`, body: { customer_id: custId, text }, config: cfg },
      ]);
      await fetchData();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to add note');
    } finally {
      setBusyId(null);
    }
  };

  const sendPromo = async (custId) => {
    if (!canManage) return;
    const promo = window.prompt('Promo to send (e.g., Aeration 15% off this month):');
    if (!promo) return;
    try {
      setBusyId(custId);
      const cfg = await authCfg();
      await tryRequest([
        { method: 'POST', url: `/api/owner/customers/${custId}/promotions/send`, body: { message: promo }, config: cfg },
        { method: 'POST', url: `/api/owner/promotions/send`, body: { customer_id: custId, message: promo }, config: cfg },
        { method: 'POST', url: `/api/promotions/send`, body: { customer_id: custId, message: promo }, config: cfg },
      ]);
      alert('Promo queued.');
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to send promo');
    } finally {
      setBusyId(null);
    }
  };

  const toggleReminder = async (custId, enable) => {
    if (!canManage) return;
    try {
      setBusyId(custId);
      const cfg = await authCfg();
      await tryRequest([
        { method: 'POST', url: `/api/owner/customers/${custId}/reminders`, body: { enabled: enable }, config: cfg },
        { method: 'PUT', url: `/api/customers/${custId}/reminder-opt-in`, body: { enabled: enable }, config: cfg },
        { method: 'POST', url: `/api/reminders/opt-in`, body: { customer_id: custId, enabled: enable }, config: cfg },
      ]);
      await fetchData();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to update reminder setting');
    } finally {
      setBusyId(null);
    }
  };

  const markArchived = async (custId) => {
    if (!canManage) return;
    try {
      setBusyId(custId);
      const cfg = await authCfg();
      await tryRequest([
        { method: 'POST', url: `/api/owner/customers/${custId}/status`, body: { status: 'archived' }, config: cfg },
        { method: 'PUT', url: `/api/owner/customers/${custId}`, body: { status: 'archived' }, config: cfg },
      ]);
      await fetchData();
    } catch (e) {
      const msg =
        e?.response?.status === 403
          ? 'Owner/Manager role required to archive'
          : e?.response?.data?.error || 'Failed to archive customer';
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  const unarchive = async (custId) => {
    if (!canManage) return;
    try {
      setBusyId(custId);
      const cfg = await authCfg();
      await tryRequest([
        { method: 'POST', url: `/api/owner/customers/${custId}/status`, body: { status: 'active' }, config: cfg },
        { method: 'PUT', url: `/api/owner/customers/${custId}`, body: { status: 'active' }, config: cfg },
      ]);
      await fetchData();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to unarchive');
    } finally {
      setBusyId(null);
    }
  };

  const promoteToActive = async (custId) => {
    if (!canManage) return;
    try {
      setBusyId(custId);
      const cfg = await authCfg();
      await tryRequest([
        { method: 'POST', url: `/api/owner/customers/${custId}/status`, body: { status: 'active' }, config: cfg },
        { method: 'PUT',  url: `/api/owner/customers/${custId}`,        body: { status: 'active' }, config: cfg },
      ]);
      await fetchData();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const bulkPromoteLeadsToActive = async () => {
    if (!canManage || !anyLeadSelected) return;
    try {
      setBusyId('bulk');
      const cfg = await authCfg();

      // Try bulk endpoint first; fall back to per-id
      try {
        await axios.post('/api/owner/customers/bulk-status', {
          ids: selectedLeadIds,
          status: 'active',
        }, cfg);
      } catch (bulkErr) {
        for (const id of selectedLeadIds) {
          await tryRequest([
            { method: 'POST', url: `/api/owner/customers/${id}/status`, body: { status: 'active' }, config: cfg },
            { method: 'PUT',  url: `/api/owner/customers/${id}`,        body: { status: 'active' }, config: cfg },
          ]);
        }
      }

      clearLeadSelection();
      await fetchData();
      alert('Selected leads converted to active.');
    } catch (e) {
      console.error('bulk promote error', e);
      alert(e?.response?.data?.error || 'Failed to convert selected leads');
    } finally {
      setBusyId(null);
    }
  };

  /* --------------------------------- Filters --------------------------------- */
  const baseSearch = (c) =>
    [
      c.name,
      c.email,
      c.phone_number,
      c.street,
      c.city,
      c.state,
      c.zip,
      c.status,
      c.frequency,
      ...(c.tags || []),
      ...(c.services || []),
    ]
      .map((v) => (v == null ? '' : String(v).toLowerCase()))
      .join(' ');

  const customerMatches = (c, q) =>
    matches(baseSearch(c), q) &&
    (!freqFilter || (c.frequency || '') === freqFilter.toLowerCase()) &&
    hasTag(c.tags, tagFilter) &&
    (!onlyAutopay || !!c.has_autopay) &&
    (!withBalanceDue || Number(c.outstanding_balance_cents || 0) > 0) &&
    (!remindersOnly || !!c.reminder_opt_in);

  const filteredCustomers = useMemo(
    () => customersActive.filter((c) => customerMatches(c, customerSearchQ)),
    [customersActive, customerSearchQ, freqFilter, tagFilter, onlyAutopay, withBalanceDue, remindersOnly]
  );

  const filteredLeads = useMemo(
    () => leads.filter((c) => matches(baseSearch(c), leadsSearchQ)),
    [leads, leadsSearchQ]
  );

  const filteredArchived = useMemo(
    () => archived.filter((c) => matches(baseSearch(c), archivedSearchQ)),
    [archived, archivedSearchQ]
  );

  /* --------------------- KPI aggregates --------------------- */
  const kpi = useMemo(() => {
    const cltv = filteredCustomers.reduce((sum, c) => sum + (c.cltv_cents || 0), 0);
    const refs = filteredCustomers.reduce((sum, c) => sum + (c.referral_count || 0), 0);
    return { cltv, refs };
  }, [filteredCustomers]);

  /* --------------------------------- UI helpers --------------------------------- */
  if (loadingProfile || dataLoading) return <div className="p-6">Loading…</div>;

  const orgName = org?.name || (org?.id ? `Org ${org.id}` : 'This organization');

  // Check if completely empty (no customers at all)
  const totalCustomers = customersActive.length + leads.length + archived.length;
  const isEmpty = totalCustomers === 0;

  /* --------------------- Customer card (accordion details) --------------------- */

  const CustomerCard = memo(function CustomerCard({
    c,
    selectedLeadIds = [],
    toggleLeadSelected = () => {},
  }) {
    const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [c.street, c.city, c.state, c.zip].filter(Boolean).join(', ')
    )}`;
    const telHref = c.phone_number ? `tel:${c.phone_number}` : null;
    const mailHref = c.email ? `mailto:${c.email}` : null;

    const [noteDraft, setNoteDraft] = useState('');

    return (
      <Card>
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-base break-words flex items-center gap-2">
              {c.name || '—'}
              {c.status === 'lead' && (
                <label className="inline-flex items-center gap-2 text-xs border px-2 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.includes(c.id)}
                    onChange={(e) => toggleLeadSelected(c.id, e.target.checked)}
                  />
                  Select
                </label>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-600"><Address c={c} /></div>
    
            <div className="mt-2 flex flex-wrap gap-2">
              {c.frequency ? <Pill>{formatFrequency(c.frequency, c.service_interval)}</Pill> : null}
              {c.services?.slice(0, 4).map((s, i) => <Pill key={i}>{s}</Pill>)}
              {c.tags?.slice(0, 4).map((t, i) => <Pill key={`t-${i}`}>{t}</Pill>)}
              {c.has_autopay ? <Badge tone="blue">autopay</Badge> : null}
              <Badge tone={toStatusTone(c.status)}>{c.status}</Badge>
            </div>
          </div>
    
          {/* Toned-down actions */}
          <div className="flex items-center gap-2">
            {telHref && (
              <a href={telHref} className="px-2.5 py-1.5 text-sm border rounded hover:bg-gray-50" title="Call">Call</a>
            )}
            {mailHref && (
              <a href={mailHref} className="px-2.5 py-1.5 text-sm border rounded hover:bg-gray-50" title="Email">Email</a>
            )}
            <a href={mapHref} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 text-sm border rounded hover:bg-gray-50" title="Map">
              Map
            </a>
          </div>
        </div>
    
        {/* KPI row */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div><span className="text-gray-500">CLTV:</span> {currency(c.cltv_cents)}</div>
          <div><span className="text-gray-500">Next visit:</span> {c.next_visit_at ? new Date(c.next_visit_at).toLocaleDateString() : '—'}</div>
          <div className="truncate"><span className="text-gray-500">Email:</span> {c.email || '—'}</div>
          <div><span className="text-gray-500">Phone:</span> {c.phone_number || '—'}</div>
        </div>
    
        {/* Actions */}
        {canManage && (
          <div className="mt-3 flex flex-wrap gap-2">
            {c.status === 'lead' && (
              <button
                onClick={() => promoteToActive(c.id)}
                disabled={busyId === c.id}
                className={`px-3 py-2 rounded text-white ${busyId === c.id ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-800'}`}
                title="Mark this lead as an active customer"
              >
                {busyId === c.id ? 'Promoting…' : 'Convert to Active'}
              </button>
            )}
    
            {/* MOBILE-ONLY helper text above Send Promo */}
            <p className="md:hidden text-xs text-gray-500 self-end w-full -mt-1">
              Use “Send Promo” to push seasonal specials or add-ons.
            </p>
    
            <button
              onClick={() => sendPromo(c.id)}
              disabled={busyId === c.id}
              className={`px-3 py-2 rounded text-white ${busyId === c.id ? 'bg-gray-500' : 'bg-zinc-700 hover:bg-zinc-800'}`}
            >
              {busyId === c.id ? 'Sending…' : 'Send Promo'}
            </button>
    
            <label className="flex items-center gap-2 text-sm border px-3 py-2 rounded">
              <input
                type="checkbox"
                checked={!!c.reminder_opt_in}
                onChange={(e) => toggleReminder(c.id, e.target.checked)}
                disabled={busyId === c.id}
              />
              Service reminders
            </label>
    
            {c.status !== 'archived' ? (
              <button
                onClick={() => markArchived(c.id)}
                disabled={busyId === c.id}
                className={`px-3 py-2 rounded border ${busyId === c.id ? 'opacity-60' : 'hover:bg-gray-50'}`}
              >
                {busyId === c.id ? 'Archiving…' : 'Archive'}
              </button>
            ) : null}
          </div>
        )}
    
        {/* Details */}
        <details className="mt-3 border rounded">
          <summary className="px-3 py-2 cursor-pointer select-none">Details</summary>
          <div className="p-3 grid gap-4">
            {/* Frequency & history */}
            <div>
              <div className="font-medium">Service Frequency &amp; History</div>
              <div className="mt-1 text-sm text-gray-600">
                Frequency: {c.frequency ? formatFrequency(c.frequency, c.service_interval) : '—'}
              </div>
              <div className="mt-2 text-sm">
                <div className="text-gray-500 mb-1">Last 3 visits:</div>
                {Array.isArray(c.last_visits) && c.last_visits.length ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {c.last_visits.slice(0, 3).map((v, i) => (
                      <li key={i}>
                        {v.date ? new Date(v.date).toLocaleDateString() : '—'}
                        {v.notes ? ` — ${v.notes}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500">No recent visits recorded.</div>
                )}
              </div>
            </div>
    
            {/* Notes */}
            <div>
              <div className="font-medium">Internal Notes</div>
              <div className="mt-2">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                  placeholder="Add a note visible to staff only…"
                  className="w-full border rounded p-2"
                />
                <div className="mt-2">
                  <button
                    onClick={() => addNote(c.id, noteDraft)}
                    disabled={busyId === c.id || !noteDraft.trim()}
                    className={`px-3 py-2 rounded text-white ${busyId === c.id ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-800'}`}
                  >
                    {busyId === c.id ? 'Saving…' : 'Add Note'}
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm">
                <div className="text-gray-500 mb-1">Recent notes</div>
                {Array.isArray(c.notes) && c.notes.length ? (
                  <ul className="space-y-1">
                    {c.notes.slice(0, 5).map((n, i) => (
                      <li key={n.id || i} className="border rounded p-2">
                        <div className="text-gray-700">{n.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {n.author_name ? `${n.author_name} • ` : ''}
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500">No notes yet.</div>
                )}
              </div>
            </div>
    
            {/* Promotions — desktop only (mobile hint is above the button) */}
            <div className="hidden md:block">
              <div className="font-medium">Promotions</div>
              <div className="mt-2 text-sm text-gray-600">
                Use “Send Promo” above to push seasonal specials or add-ons.
              </div>
            </div>
          </div>
        </details>
      </Card>
    );
  });

  /* ---------------------------------- Render ---------------------------------- */

  // Empty state for new organizations with no customers
  if (isEmpty) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Customers</h1>
            <p className="text-gray-600">
              {canManage
                ? `Manage customers in ${orgName}.`
                : `View customers in ${orgName}.`}
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-8 md:p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">No customers yet</h2>
          <p className="text-neutral-600 mb-6 max-w-md mx-auto">
            Get started by adding your first customer. You can invite them via email, SMS, or share a QR code.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/app/onboard-customer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add New Customer
            </Link>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-neutral-300 hover:border-neutral-400 text-neutral-700 font-medium rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              Import from CSV
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-4">Import customers from a spreadsheet or other system</p>
        </div>

        {/* Import Modal */}
        <ImportCustomersModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-gray-600">
            {canManage
              ? `Manage customers in ${orgName}.`
              : `View customers in ${orgName}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/onboard-customer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </Link>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-300 hover:bg-gray-50 rounded transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 border rounded hover:bg-gray-50"
            aria-label="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-500">Active/Paused Customers</div>
          <div className="text-2xl font-semibold">{customersActive.length}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-500">Leads</div>
          <div className="text-2xl font-semibold">{leads.length}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-500">Archived</div>
          <div className="text-2xl font-semibold">{archived.length}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-500">Total CLTV (visible active list)</div>
          <div className="text-2xl font-semibold">{currency(kpi.cltv)}</div>
        </div>
      </div>

      {/* Filters for Active/Paused */}
      <Section
        title="Filters (Active/Paused)"
        extra={
          <>
            <input
              type="search"
              placeholder="Search name, contact, address, tags, services…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="border px-3 py-2 rounded w-full md:w-96"
            />
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={freqFilter}
            onChange={(e) => setFreqFilter(e.target.value)}
            className="border rounded px-3 py-2"
            aria-label="Frequency filter"
          >
            <option value="">All frequencies</option>
            <option value="weekly">Weekly</option>
            <option value="bi-weekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="seasonal">Seasonal</option>
          </select>
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="border rounded px-3 py-2 w-64"
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyAutopay} onChange={(e) => setOnlyAutopay(e.target.checked)} />
            Autopay only
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={withBalanceDue} onChange={(e) => setWithBalanceDue(e.target.checked)} />
            With balance due
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={remindersOnly} onChange={(e) => setRemindersOnly(e.target.checked)} />
            Reminder opt-in
          </label>
        </div>
      </Section>

      {/* Active/Paused */}
      <Section title="Active & Paused">
        {filteredCustomers.length ? (
          <div className="grid gap-3">
            {filteredCustomers.map((c) => (
              <CustomerCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <div className="p-4 text-gray-500">No customers match your search/filters.</div>
        )}
      </Section>

      {/* Leads (manager/owner only) */}
      {canManage && (
        <Section
          title="Leads"
          extra={
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Search leads…"
                value={leadsSearch}
                onChange={(e) => setLeadsSearch(e.target.value)}
                className="border px-3 py-2 rounded w-full md:w-64"
              />
              <label className="inline-flex items-center gap-2 text-sm border px-3 py-2 rounded">
                <input
                  type="checkbox"
                  checked={allLeadsSelected}
                  onChange={toggleSelectAllLeads}
                />
                Select all
              </label>
              <button
                onClick={bulkPromoteLeadsToActive}
                disabled={!anyLeadSelected || busyId === 'bulk'}
                className={`px-3 py-2 rounded text-white ${(!anyLeadSelected || busyId === 'bulk') ? 'bg-gray-400' : 'bg-gray-700 hover:bg-gray-800'}`}
                title="Convert selected leads to active"
              >
                {busyId === 'bulk' ? 'Converting…' : 'Convert Selected to Active'}
              </button>
            </div>
          }
        >
          {filteredLeads.length ? (
            <div className="grid gap-3">
              {filteredLeads.map((c) => (
                <CustomerCard
                  key={c.id}
                  c={c}
                  selectedLeadIds={selectedLeadIds}
                  toggleLeadSelected={toggleLeadSelected}
                />
              ))}
            </div>
          ) : (
            <div className="p-4 text-gray-500">No leads match your search.</div>
          )}
        </Section>
      )}

      {/* Archived */}
      <Section
        title="Archived"
        extra={
          <input
            type="search"
            placeholder="Search archived…"
            value={archivedSearch}
            onChange={(e) => setArchivedSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-80"
          />
        }
      >
        {filteredArchived.length ? (
          <div className="grid gap-3">
            {filteredArchived.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-base">{c.name || '—'}</div>
                    <div className="mt-1 text-sm text-gray-600"><Address c={c} /></div>
                    <div className="mt-1 text-sm">
                      <span className="text-gray-500">CLTV:</span> {currency(c.cltv_cents)}
                    </div>
                  </div>
                  <Badge>archived</Badge>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div><span className="text-gray-500">Email:</span> {c.email || '—'}</div>
                  <div><span className="text-gray-500">Phone:</span> {c.phone_number || '—'}</div>
                  <div><span className="text-gray-500">Frequency:</span> {c.frequency || '—'}</div>
                </div>
                {canManage && (
                  <div className="mt-3">
                    <button
                      onClick={() => unarchive(c.id)}
                      disabled={busyId === c.id}
                      className={`px-3 py-2 rounded border ${busyId === c.id ? 'opacity-60' : 'hover:bg-gray-50'}`}
                    >
                      {busyId === c.id ? 'Unarchiving…' : 'Unarchive'}
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-4 text-gray-500">No archived customers match your search.</div>
        )}
      </Section>

      {/* Import Modal */}
      <ImportCustomersModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={fetchData}
      />
    </div>
  );
}
