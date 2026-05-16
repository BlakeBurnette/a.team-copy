import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Sparkles, MapPin, Clock, CheckCircle2, AlertCircle,
  UserPlus, ChevronDown, ClipboardList, Truck, FileText,
  RotateCcw, StickyNote, User, Briefcase, TreePine,
  Hammer, Leaf, Droplets, PenLine, Loader2,
} from 'lucide-react';
import {
  getTasks, createTask, completeTask, assignLead, getSalesUsers, getLeads,
} from '../../api/crm';

// ═══════════════════════════════════════════════════════════════════════════
// Config — set USE_MOCK to true to bypass API and use hardcoded data
// ═══════════════════════════════════════════════════════════════════════════

const USE_MOCK = true;

// ═══════════════════════════════════════════════════════════════════════════
// Mock data (fallback)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_TEAM = [
  { id: 't1', name: 'Marcus Rivera', role: 'Estimator', avatar_initial: 'MR', active_assignments: 2, specialties: ['tree work', 'hardscaping'] },
  { id: 't2', name: 'Sarah Chen', role: 'Sales Rep', avatar_initial: 'SC', active_assignments: 1, specialties: ['lawn care', 'maintenance'] },
  { id: 't3', name: 'Jake Thompson', role: 'Estimator', avatar_initial: 'JT', active_assignments: 0, specialties: ['landscape design', 'irrigation'] },
];

const now = Date.now();
const DAY = 86_400_000;

const MOCK_ASSIGNMENTS = [
  {
    id: 'a1', lead_id: 'l2', lead_name: 'Patricia Gomez', service: 'Tree removal — large oak',
    property_address: '220 Pine Ridge Dr, Cary, NC', assigned_to: 't1', assigned_name: 'Marcus Rivera',
    type: 'site_visit', status: 'in_progress', assigned_at: new Date(now - 2 * DAY).toISOString(),
    due_date: new Date(now - 1 * DAY).toISOString(), notes: 'Tree near power lines — check clearances',
  },
  {
    id: 'a2', lead_id: 'l4', lead_name: 'Amanda Foster', service: 'Hedge trimming',
    property_address: '302 Oak Valley Rd, Apex, NC', assigned_to: 't2', assigned_name: 'Sarah Chen',
    type: 'follow_up', status: 'complete', assigned_at: new Date(now - 2 * DAY).toISOString(),
    completed_at: new Date(now - 1 * DAY).toISOString(), notes: 'Customer confirmed via referral',
  },
  {
    id: 'a3', lead_id: 'l6', lead_name: 'Lisa Park', service: 'Landscape design consultation',
    property_address: '445 Willow Creek, Morrisville, NC', assigned_to: null, assigned_name: null,
    type: 'site_visit', status: 'unassigned', notes: 'New construction, needs full yard assessment',
  },
  {
    id: 'a4', lead_id: 'l1', lead_name: 'David Chen', service: 'Weekly lawn mowing',
    property_address: '88 Elm St, Raleigh, NC', assigned_to: null, assigned_name: null,
    type: 'quote_delivery', status: 'unassigned', notes: 'Simple quote from rate card — can send without site visit',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_ORDER = ['unassigned', 'assigned', 'in_progress', 'specs_submitted', 'complete'];

const STATUS_META = {
  unassigned:      { label: 'Unassigned',      bg: 'bg-red-100',    text: 'text-red-700',    ring: 'ring-red-300' },
  assigned:        { label: 'Assigned',         bg: 'bg-blue-100',   text: 'text-blue-700',   ring: 'ring-blue-300' },
  in_progress:     { label: 'In Progress',      bg: 'bg-amber-100',  text: 'text-amber-700',  ring: 'ring-amber-300' },
  specs_submitted: { label: 'Specs Submitted',  bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-300' },
  complete:        { label: 'Complete',          bg: 'bg-green-100',  text: 'text-green-700',  ring: 'ring-green-300' },
};

const TYPE_META = {
  site_visit:      { label: 'Site Visit',       icon: Truck },
  follow_up:       { label: 'Follow-up',        icon: ClipboardList },
  quote_delivery:  { label: 'Quote Delivery',   icon: FileText },
  measurement:     { label: 'Measurement',       icon: PenLine },
};

// Map API task type to UI assignment type
const TASK_TYPE_MAP = {
  call: 'follow_up',
  meeting: 'site_visit',
  todo: 'quote_delivery',
  email: 'follow_up',
};

function daysAgo(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return 'Today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

function isOverdue(a) {
  return a.due_date && new Date(a.due_date).getTime() < Date.now() && a.status !== 'complete';
}

function Badge({ meta }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${meta.bg} ${meta.text}`}>
      {meta.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Data transformation — API tasks → assignment shape
// ═══════════════════════════════════════════════════════════════════════════

function mapTaskToAssignment(task, salesUsersMap, leadsMap) {
  const lead = leadsMap[task.lead_id] || {};
  const assignedUser = salesUsersMap[task.assigned_to_id] || null;

  let status;
  if (task.status === 'completed') {
    status = 'complete';
  } else if (task.assigned_to_id) {
    status = 'assigned';
  } else {
    status = 'unassigned';
  }

  return {
    id: task.id,
    lead_id: task.lead_id,
    lead_name: lead.name || lead.contact_name || 'Unknown Lead',
    service: lead.service || task.title || '',
    property_address: lead.address || lead.property_address || '',
    assigned_to: task.assigned_to_id || null,
    assigned_name: assignedUser?.name || null,
    type: TASK_TYPE_MAP[task.type] || 'site_visit',
    status,
    assigned_at: task.created_at,
    due_date: task.due_at,
    completed_at: task.completed_at,
    notes: task.description || '',
  };
}

function mapSalesUserToTeamMember(user, pendingTasks) {
  const activeCount = pendingTasks.filter(t => t.assigned_to_id === user.id).length;
  const initials = (user.name || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    id: user.id,
    name: user.name || user.email || 'Unknown',
    role: user.role || 'Team Member',
    avatar_initial: initials || '??',
    active_assignments: activeCount,
    specialties: user.specialties || [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Sir Walter insight engine (client-side heuristics)
// ═══════════════════════════════════════════════════════════════════════════

function buildInsights(assignments, team) {
  const insights = [];
  const unassigned = assignments.filter(a => a.status === 'unassigned');
  const overdue = assignments.filter(a => isOverdue(a));

  // Unassigned leads + capacity suggestion
  if (unassigned.length > 0) {
    const lowestLoad = [...team].sort((a, b) => a.active_assignments - b.active_assignments)[0];
    if (lowestLoad) {
      const first = unassigned[0];
      insights.push(
        `${unassigned.length} lead${unassigned.length > 1 ? 's' : ''} unassigned. ` +
        `${lowestLoad.name} has capacity — assign ${first.lead_name}'s ${first.service.toLowerCase()}?`
      );
    }
  }

  // Overdue specs
  for (const a of overdue) {
    if (a.assigned_name) {
      insights.push(
        `${a.assigned_name}'s site visit at ${a.property_address.split(',')[0]} was ${daysAgo(a.assigned_at)} — specs not submitted yet.`
      );
    }
  }

  // Workload imbalance
  const loads = team.map(t => t.active_assignments);
  const max = Math.max(...loads);
  const min = Math.min(...loads);
  if (max - min >= 2) {
    const heavy = team.find(t => t.active_assignments === max);
    const light = team.find(t => t.active_assignments === min);
    if (heavy && light) {
      insights.push(
        `${heavy.name} has ${heavy.active_assignments} active assignments while ${light.name} has ${light.active_assignments}. Consider rebalancing.`
      );
    }
  }

  return insights.length > 0 ? insights : ['All assignments are on track. No action needed right now.'];
}

// ═══════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════

function SirWalterInsightBar({ insights }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-1.5 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Sir Walter</p>
          {insights.map((msg, i) => (
            <p key={i} className="text-sm text-amber-700">{msg}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamOverview({ team }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Team</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {team.map(m => (
          <div key={m.id} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-neutral-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {m.avatar_initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{m.name}</p>
              <p className="text-xs text-neutral-500">{m.role}</p>
              <div className="flex items-center gap-1 mt-1">
                <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-600">{m.active_assignments} active</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {m.specialties.map(s => (
                  <span key={s} className="text-[11px] bg-neutral-100 text-neutral-600 rounded px-1.5 py-0.5">{s}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignDropdown({ assignment, team, onAssign }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Assign
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 w-52 bg-white border border-neutral-200 rounded-lg shadow-lg py-1">
          {team.map(m => (
            <button
              key={m.id}
              onClick={() => { onAssign(assignment.id, m.id, assignment.lead_id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-neutral-800 text-white flex items-center justify-center text-[10px] font-bold">
                {m.avatar_initial}
              </div>
              <div>
                <span className="text-neutral-900">{m.name}</span>
                <span className="text-neutral-400 ml-1">({m.active_assignments} active)</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment, team, onAssign, onMarkComplete, onAddNotes }) {
  const overdue = isOverdue(assignment);
  const statusMeta = STATUS_META[assignment.status] || STATUS_META.unassigned;
  const typeMeta = TYPE_META[assignment.type] || TYPE_META.site_visit;
  const TypeIcon = typeMeta.icon;

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${overdue ? 'border-red-400 ring-1 ring-red-200' : 'border-neutral-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Left: lead info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-neutral-900">{assignment.lead_name}</h3>
            <Badge meta={statusMeta} />
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600`}>
              <TypeIcon className="w-3 h-3" />
              {typeMeta.label}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                <AlertCircle className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>

          <p className="text-sm text-neutral-700">{assignment.service}</p>

          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="w-3.5 h-3.5" />
            {assignment.property_address}
          </div>

          {assignment.notes && (
            <p className="text-xs text-neutral-500 italic">"{assignment.notes}"</p>
          )}

          <div className="flex items-center gap-3 text-xs text-neutral-500 pt-1">
            {assignment.assigned_name ? (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {assignment.assigned_name}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <User className="w-3.5 h-3.5" />
                Unassigned
              </span>
            )}
            {assignment.assigned_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Assigned {daysAgo(assignment.assigned_at)}
              </span>
            )}
            {assignment.due_date && (
              <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                <AlertCircle className="w-3.5 h-3.5" />
                Due {daysAgo(assignment.due_date)}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {assignment.status === 'unassigned' && (
            <AssignDropdown assignment={assignment} team={team} onAssign={onAssign} />
          )}
          {assignment.status !== 'unassigned' && assignment.status !== 'complete' && (
            <button
              onClick={() => onAssign(assignment.id, null, assignment.lead_id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-800 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reassign
            </button>
          )}
          {assignment.status !== 'complete' && (
            <button
              onClick={() => onMarkComplete(assignment.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complete
            </button>
          )}
          <button
            onClick={() => onAddNotes(assignment.id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-800 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <StickyNote className="w-3.5 h-3.5" />
            Notes
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════

export default function AssignmentsTab() {
  const [assignments, setAssignments] = useState(USE_MOCK ? MOCK_ASSIGNMENTS : []);
  const [team, setTeam] = useState(USE_MOCK ? MOCK_TEAM : []);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState(null);

  // Fetch real data from API
  useEffect(() => {
    if (USE_MOCK) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [pendingRes, completedRes, usersRes, leadsRes] = await Promise.allSettled([
          getTasks({ status: 'pending' }),
          getTasks({ status: 'completed', limit: 20 }),
          getSalesUsers(),
          getLeads({ status: 'open' }),
        ]);

        if (cancelled) return;

        // Extract data from responses (handle axios response shape)
        const pendingTasks = pendingRes.status === 'fulfilled' ? (pendingRes.value.data || pendingRes.value) : [];
        const completedTasks = completedRes.status === 'fulfilled' ? (completedRes.value.data || completedRes.value) : [];
        const salesUsers = usersRes.status === 'fulfilled' ? (usersRes.value.data || usersRes.value) : [];
        const leads = leadsRes.status === 'fulfilled' ? (leadsRes.value.data || leadsRes.value) : [];

        // If all fetches failed, fall back to mock
        if (pendingRes.status === 'rejected' && completedRes.status === 'rejected' &&
            usersRes.status === 'rejected' && leadsRes.status === 'rejected') {
          throw new Error('All API requests failed');
        }

        // Build lookup maps
        const salesUsersMap = {};
        const usersArray = Array.isArray(salesUsers) ? salesUsers : (salesUsers.users || salesUsers.data || []);
        for (const u of usersArray) {
          salesUsersMap[u.id] = u;
        }

        const leadsMap = {};
        const leadsArray = Array.isArray(leads) ? leads : (leads.leads || leads.data || []);
        for (const l of leadsArray) {
          leadsMap[l.id] = l;
        }

        // Combine and map tasks
        const allTasks = [
          ...(Array.isArray(pendingTasks) ? pendingTasks : (pendingTasks.tasks || pendingTasks.data || [])),
          ...(Array.isArray(completedTasks) ? completedTasks : (completedTasks.tasks || completedTasks.data || [])),
        ];

        const mappedAssignments = allTasks.map(t => mapTaskToAssignment(t, salesUsersMap, leadsMap));

        // Build team from sales users
        const pendingTasksArray = Array.isArray(pendingTasks) ? pendingTasks : (pendingTasks.tasks || pendingTasks.data || []);
        const mappedTeam = usersArray.map(u => mapSalesUserToTeamMember(u, pendingTasksArray));

        setAssignments(mappedAssignments.length > 0 ? mappedAssignments : MOCK_ASSIGNMENTS);
        setTeam(mappedTeam.length > 0 ? mappedTeam : MOCK_TEAM);
      } catch (err) {
        if (cancelled) return;
        console.error('[AssignmentsTab] API fetch failed, falling back to mock:', err);
        setError(err.message);
        setAssignments(MOCK_ASSIGNMENTS);
        setTeam(MOCK_TEAM);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const insights = useMemo(() => buildInsights(assignments, team), [assignments, team]);

  // Group by status in defined order
  const grouped = useMemo(() => {
    const map = {};
    for (const s of STATUS_ORDER) map[s] = [];
    for (const a of assignments) {
      (map[a.status] || (map[a.status] = [])).push(a);
    }
    return STATUS_ORDER.filter(s => map[s].length > 0).map(s => ({ status: s, items: map[s] }));
  }, [assignments]);

  // ── handlers ──
  const handleAssign = useCallback(async (assignmentId, teamMemberId, leadId) => {
    // Optimistic local update
    setAssignments(prev => prev.map(a => {
      if (a.id !== assignmentId) return a;
      if (!teamMemberId) {
        return { ...a, assigned_to: null, assigned_name: null, status: 'unassigned', assigned_at: null };
      }
      const member = team.find(t => t.id === teamMemberId);
      return {
        ...a,
        assigned_to: teamMemberId,
        assigned_name: member?.name || null,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      };
    }));

    // Fire API calls (non-blocking, log errors)
    if (!USE_MOCK && teamMemberId) {
      try {
        await Promise.allSettled([
          leadId ? assignLead(leadId, teamMemberId) : Promise.resolve(),
          import('../../api/crm').then(({ updateTask }) => updateTask(assignmentId, { assigned_to_id: teamMemberId })),
        ]);
      } catch (err) {
        console.error('[AssignmentsTab] Assign API error:', err);
      }
    }
  }, [team]);

  const handleMarkComplete = useCallback(async (assignmentId) => {
    // Optimistic local update
    setAssignments(prev => prev.map(a =>
      a.id === assignmentId ? { ...a, status: 'complete', completed_at: new Date().toISOString() } : a
    ));

    // Fire API call
    if (!USE_MOCK) {
      try {
        await completeTask(assignmentId);
      } catch (err) {
        console.error('[AssignmentsTab] Complete API error:', err);
      }
    }
  }, []);

  const handleAddNotes = useCallback((assignmentId) => {
    const note = window.prompt('Add a note:');
    if (!note) return;
    setAssignments(prev => prev.map(a =>
      a.id === assignmentId ? { ...a, notes: a.notes ? `${a.notes}\n${note}` : note } : a
    ));
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
        <span className="ml-2 text-sm text-neutral-500">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Error notice (non-blocking since we fall back to mock) */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
          Could not load live data — showing demo assignments. ({error})
        </div>
      )}

      {/* Sir Walter insight bar */}
      <SirWalterInsightBar insights={insights} />

      {/* Team overview */}
      <TeamOverview team={team} />

      {/* Assignment list grouped by status */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Assignments</h2>
        <div className="space-y-6">
          {grouped.map(({ status, items }) => {
            const meta = STATUS_META[status];
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${meta.bg} ${meta.ring} ring-1`} />
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    {meta.label} ({items.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {items.map(a => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      team={team}
                      onAssign={handleAssign}
                      onMarkComplete={handleMarkComplete}
                      onAddNotes={handleAddNotes}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
