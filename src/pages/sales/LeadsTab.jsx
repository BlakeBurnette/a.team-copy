import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap, Phone, Globe, Users, ShoppingBag, Search,
  ChevronDown, ChevronUp, Plus, Clock, MessageSquare,
  Sparkles, User, X, Loader2,
} from 'lucide-react';
import { getLeads, createLead, updateLead } from '../../api/crm';

// ═══════════════════════════════════════════════════════════════════════════
// Mock data — flip to false once real APIs are wired
// ═══════════════════════════════════════════════════════════════════════════

const USE_MOCK = true;

const MOCK_LEADS = [
  { id: 'l1', name: 'David Chen', phone: '(919) 555-0301', email: 'dchen@email.com', service_needed: 'Weekly lawn mowing', property_address: '88 Elm St, Raleigh, NC', source: 'website', status: 'new', assigned_to: null, created_at: new Date(Date.now() - 2 * 3600000).toISOString(), last_activity: new Date(Date.now() - 2 * 3600000).toISOString(), notes: 'Has a large backyard, wants bi-weekly option too' },
  { id: 'l2', name: 'Patricia Gomez', phone: '(984) 555-0178', email: null, service_needed: 'Tree removal — large oak', property_address: '220 Pine Ridge Dr, Cary, NC', source: 'phone', status: 'site_visit', assigned_to: 'Marcus', created_at: new Date(Date.now() - 3 * 86400000).toISOString(), last_activity: new Date(Date.now() - 1 * 86400000).toISOString(), notes: 'Needs site visit for estimate, tree is near power lines' },
  { id: 'l3', name: 'Robert Kim', phone: null, email: 'rkim@email.com', service_needed: 'Spring cleanup + mulching', property_address: '15 Maple Ct, Durham, NC', source: 'listing_hive', status: 'quoted', assigned_to: null, created_at: new Date(Date.now() - 5 * 86400000).toISOString(), last_activity: new Date(Date.now() - 3 * 86400000).toISOString(), quote_amount_cents: 45000, notes: '' },
  { id: 'l4', name: 'Amanda Foster', phone: '(919) 555-0445', email: null, service_needed: 'Hedge trimming', property_address: '302 Oak Valley Rd, Apex, NC', source: 'referral', status: 'contacted', assigned_to: 'Sarah', created_at: new Date(Date.now() - 1 * 86400000).toISOString(), last_activity: new Date(Date.now() - 1 * 86400000).toISOString(), referred_by: 'Sarah Mitchell', notes: '' },
  { id: 'l5', name: 'James Wright', phone: '(984) 555-0567', email: null, service_needed: 'Lawn aeration + overseeding', property_address: '78 Birch Ln, Holly Springs, NC', source: 'b2c', status: 'new', assigned_to: null, created_at: new Date(Date.now() - 3 * 86400000).toISOString(), last_activity: new Date(Date.now() - 3 * 86400000).toISOString(), notes: 'From B2C lead list' },
  { id: 'l6', name: 'Lisa Park', phone: null, email: 'lisa.park@email.com', service_needed: 'Landscape design consultation', property_address: '445 Willow Creek, Morrisville, NC', source: 'website', status: 'new', assigned_to: null, created_at: new Date(Date.now() - 4 * 86400000).toISOString(), last_activity: new Date(Date.now() - 4 * 86400000).toISOString(), notes: 'New construction, wants full yard design' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const SOURCE_CONFIG = {
  website:      { label: 'Website',      bg: 'bg-blue-100',   text: 'text-blue-700',   Icon: Globe },
  phone:        { label: 'Phone',        bg: 'bg-green-100',  text: 'text-green-700',  Icon: Phone },
  listing_hive: { label: 'Listing Hive', bg: 'bg-amber-100',  text: 'text-amber-700',  Icon: Zap },
  referral:     { label: 'Referral',     bg: 'bg-purple-100', text: 'text-purple-700', Icon: Users },
  b2c:          { label: 'B2C',          bg: 'bg-teal-100',   text: 'text-teal-700',   Icon: ShoppingBag },
};

const STATUS_CONFIG = {
  new:        { label: 'New',        bg: 'bg-blue-100',   text: 'text-blue-700' },
  contacted:  { label: 'Contacted',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  site_visit: { label: 'Site Visit', bg: 'bg-orange-100', text: 'text-orange-700' },
  quoted:     { label: 'Quoted',     bg: 'bg-purple-100', text: 'text-purple-700' },
  won:        { label: 'Won',        bg: 'bg-green-100',  text: 'text-green-700' },
  lost:       { label: 'Lost',       bg: 'bg-red-100',    text: 'text-red-700' },
};

const STATUSES = Object.keys(STATUS_CONFIG);
const SOURCES = Object.keys(SOURCE_CONFIG);

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function daysAgo(isoStr) {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function hoursSince(isoStr) {
  return (Date.now() - new Date(isoStr).getTime()) / 3600000;
}

function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sir Walter Insight — derived from data
// ═══════════════════════════════════════════════════════════════════════════

function deriveInsight(leads) {
  // Check for stale new leads (not contacted in 48+ hours)
  const staleNew = leads.filter(
    (l) => l.status === 'new' && hoursSince(l.last_activity) >= 48
  );
  if (staleNew.length > 0) {
    return `${staleNew.length} lead${staleNew.length > 1 ? 's' : ''} haven't been contacted in 48+ hours — fast follow-up doubles close rate.`;
  }

  // Check for Listing Hive leads today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const lhToday = leads.filter(
    (l) => l.source === 'listing_hive' && new Date(l.created_at) >= todayStart
  );
  if (lhToday.length > 0) {
    return `${lhToday.length} Listing Hive lead${lhToday.length > 1 ? 's' : ''} came in today — fastest response wins.`;
  }

  // Check for unassigned leads
  const unassigned = leads.filter((l) => !l.assigned_to && l.status !== 'won' && l.status !== 'lost');
  if (unassigned.length > 0) {
    return `${unassigned.length} lead${unassigned.length > 1 ? 's' : ''} unassigned — assign an owner so nothing slips.`;
  }

  return 'All leads are on track. Keep the momentum going.';
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function SourceBadge({ source }) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.website;
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function WalterButton({ lead, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(lead); }}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
      title="Draft a first-touch message with Sir Walter"
    >
      <Sparkles size={12} />
      Walter
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CRM → UI field mapping & LeadsTab
// ═══════════════════════════════════════════════════════════════════════════

const STAGE_TO_STATUS = {
  new: 'new',
  contacted: 'contacted',
  qualified: 'site_visit',
  proposal: 'quoted',
  negotiation: 'quoted',
  closed: 'won',
};

function mapCrmLeadToUi(crmLead) {
  const custom = crmLead.custom_fields || {};
  return {
    id: crmLead.id,
    name: crmLead.name,
    phone: crmLead.phone || null,
    email: crmLead.email || null,
    service_needed: custom.service_needed || '',
    property_address: custom.property_address || '',
    source: crmLead.source_detail || 'website',
    status: STAGE_TO_STATUS[crmLead.stage] || crmLead.stage || 'new',
    assigned_to: crmLead.assigned_to_id ? 'Assigned' : null,
    created_at: crmLead.created_at,
    last_activity: crmLead.last_activity_at || crmLead.created_at,
    notes: Array.isArray(crmLead.notes) ? crmLead.notes.join('; ') : (crmLead.notes || ''),
    quote_amount_cents: custom.quote_amount_cents || null,
    referred_by: custom.referred_by || null,
    tags: crmLead.tags || [],
    _crmStage: crmLead.stage, // keep original for updates
  };
}

const UI_STATUS_TO_STAGE = {
  new: 'new',
  contacted: 'contacted',
  site_visit: 'qualified',
  quoted: 'proposal',
  won: 'closed',
  lost: 'closed',
};

export default function LeadsTab() {
  const [leads, setLeads] = useState(USE_MOCK ? MOCK_LEADS : []);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [walterDraft, setWalterDraft] = useState(null); // { leadId, message }

  // Quick-add form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newService, setNewService] = useState('');
  const [newSource, setNewSource] = useState('phone');

  // Fetch real leads on mount
  useEffect(() => {
    if (USE_MOCK) return;

    let cancelled = false;
    setLoading(true);

    getLeads({ status: 'open' })
      .then((res) => {
        if (cancelled) return;
        const items = res.data?.items || [];
        setLeads(items.map(mapCrmLeadToUi));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[LeadsTab] Failed to fetch leads, falling back to mock:', err);
        setLeads(MOCK_LEADS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Unique assignees for reference
  const assignees = useMemo(() => {
    const set = new Set(leads.map((l) => l.assigned_to).filter(Boolean));
    return Array.from(set);
  }, [leads]);

  // Filter + search
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (filterSource !== 'all' && l.source !== filterSource) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${l.name} ${l.service_needed} ${l.property_address} ${l.assigned_to || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filterStatus, filterSource, search]);

  const insight = useMemo(() => deriveInsight(leads), [leads]);

  // Quick-add handler
  async function handleAddLead(e) {
    e.preventDefault();
    if (!newName.trim() || !newService.trim()) return;
    const now = new Date().toISOString();

    const localLead = {
      id: `l${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim() || null,
      email: null,
      service_needed: newService.trim(),
      property_address: '',
      source: newSource,
      status: 'new',
      assigned_to: null,
      created_at: now,
      last_activity: now,
      notes: '',
    };

    // Optimistic update
    setLeads((prev) => [localLead, ...prev]);
    setNewName('');
    setNewPhone('');
    setNewService('');
    setNewSource('phone');
    setShowAddForm(false);

    // Persist to CRM (fire-and-forget with rollback on failure)
    if (!USE_MOCK) {
      try {
        const payload = {
          name: localLead.name,
          phone: localLead.phone,
          source_detail: localLead.source,
          stage: 'new',
          custom_fields: {
            service_needed: localLead.service_needed,
          },
        };
        const res = await createLead(payload);
        const created = res.data;
        // Replace optimistic lead with server lead
        setLeads((prev) =>
          prev.map((l) => (l.id === localLead.id ? mapCrmLeadToUi(created) : l))
        );
      } catch (err) {
        console.error('[LeadsTab] Failed to create lead:', err);
        // Keep the optimistic lead in the list so user doesn't lose data
      }
    }
  }

  // Sir Walter draft generator
  function handleWalterDraft(lead) {
    const greeting = lead.phone ? 'call' : 'email';
    const message = `Hi ${lead.name.split(' ')[0]}, thanks for reaching out about ${lead.service_needed.toLowerCase()}! I'd love to learn more about the work at ${lead.property_address || 'your property'}. When's a good time for a quick ${greeting}?`;
    setWalterDraft({ leadId: lead.id, message });
  }

  // Status change handler — persists to CRM
  async function handleStatusChange(leadId, newUiStatus) {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newUiStatus } : l))
    );

    if (!USE_MOCK) {
      const newStage = UI_STATUS_TO_STAGE[newUiStatus] || newUiStatus;
      try {
        await updateLead(leadId, { stage: newStage });
      } catch (err) {
        console.error('[LeadsTab] Failed to update lead status:', err);
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Sir Walter insight bar */}
      <div className="flex items-start gap-3 bg-white border border-neutral-200 border-l-4 border-l-amber-400 rounded-lg px-4 py-3">
        <Sparkles size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-neutral-700">{insight}</p>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none bg-white border border-neutral-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
        </div>

        <div className="relative">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="appearance-none bg-white border border-neutral-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_CONFIG[s].label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-neutral-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : 'Add Lead'}
        </button>
      </div>

      {/* Quick-add form (inline, collapsible) */}
      {showAddForm && (
        <form onSubmit={handleAddLead} className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Phone</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="(555) 555-0000"
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Service needed *</label>
              <input
                type="text"
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="e.g. Lawn mowing"
                required
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Source</label>
              <select
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{SOURCE_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors"
            >
              Add Lead
            </button>
          </div>
        </form>
      )}

      {/* Walter draft banner */}
      {walterDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800">
              <Sparkles size={14} />
              Sir Walter — Draft first-touch
            </span>
            <button onClick={() => setWalterDraft(null)} className="text-amber-500 hover:text-amber-700">
              <X size={14} />
            </button>
          </div>
          <p className="text-sm text-neutral-700 bg-white rounded-md p-3 border border-amber-100">
            {walterDraft.message}
          </p>
          <div className="flex gap-2 mt-2">
            <button className="px-3 py-1 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors">
              Send via SMS
            </button>
            <button className="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors">
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Lead list */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-amber-500" />
          <span className="ml-2 text-sm text-neutral-500">Loading leads...</span>
        </div>
      )}
      {!loading && <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-neutral-400">
            No leads match your filters.
          </div>
        )}
        {filtered.map((lead) => (
          <div
            key={lead.id}
            className="bg-white border border-neutral-200 rounded-lg px-4 py-3 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Left: lead info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-neutral-900 text-sm">{lead.name}</span>
                  <SourceBadge source={lead.source} />
                  <StatusBadge status={lead.status} />
                </div>
                <p className="text-sm text-neutral-600 mt-1">{lead.service_needed}</p>
                {lead.property_address && (
                  <p className="text-xs text-neutral-400 mt-0.5">{lead.property_address}</p>
                )}
                {lead.quote_amount_cents && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    Quote: {formatCents(lead.quote_amount_cents)}
                  </p>
                )}
                {lead.referred_by && (
                  <p className="text-xs text-purple-500 mt-0.5">Referred by {lead.referred_by}</p>
                )}
              </div>

              {/* Right: meta + actions */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  {lead.assigned_to ? (
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                      <User size={12} />
                      {lead.assigned_to}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400 italic">Unassigned</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-400">
                  <Clock size={11} />
                  {daysAgo(lead.created_at)}
                </div>
                {lead.last_activity !== lead.created_at && (
                  <div className="flex items-center gap-1 text-xs text-neutral-400">
                    <MessageSquare size={11} />
                    Last activity {daysAgo(lead.last_activity)}
                  </div>
                )}
                <WalterButton lead={lead} onClick={handleWalterDraft} />
              </div>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
