import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Pause,
  Play,
  Pencil,
  ChevronDown,
  ChevronRight,
  Send,
  AlertTriangle,
  Settings2,
  Loader2,
} from 'lucide-react';
import { getTasks, updateTask, completeTask, getLeads, getActivities } from '../../api/crm';

/* ---------- config ---------- */

const USE_MOCK = true; // fallback to mock data if API fails

/* ---------- helpers ---------- */

function relativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  return 'just now';
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return `Today ${formatTime(date)}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow ${formatTime(date)}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${formatTime(date)}`;
}

/* ---------- mock dates ---------- */

const now = new Date();
const today = (h, m = 0) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
};
const tomorrow = (h, m = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d;
};
const daysAgo = (n) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
};

/* ---------- mock data ---------- */

const MOCK_QUEUED = [
  {
    id: 'f1',
    lead_id: 'l3',
    lead_name: 'Robert Kim',
    type: 'quote_follow_up',
    channel: 'email',
    scheduled_for: tomorrow(9),
    body: "Hi Robert, just following up on the spring cleanup quote I sent over. The mulching season fills up fast \u2014 would you like to lock in your spot? Happy to adjust anything on the quote.",
    status: 'pending_approval',
    attempt: 2,
  },
  {
    id: 'f2',
    lead_id: 'l5',
    lead_name: 'James Wright',
    type: 'first_touch',
    channel: 'sms',
    scheduled_for: today(14),
    body: "Hi James, this is [Business Name]. We saw your interest in lawn aeration + overseeding. Spring is the perfect time \u2014 want us to come take a look? We can have a quote to you same day.",
    status: 'approved',
    attempt: 1,
  },
  {
    id: 'f3',
    lead_id: 'l6',
    lead_name: 'Lisa Park',
    type: 'first_touch',
    channel: 'email',
    scheduled_for: today(10),
    body: "Hi Lisa, thanks for reaching out about landscape design! We'd love to see your new property and discuss your vision. Would this week work for a quick site visit? No obligation.",
    status: 'approved',
    attempt: 1,
  },
  {
    id: 'f4',
    lead_id: 'l1',
    lead_name: 'David Chen',
    type: 'quote_send',
    channel: 'sms',
    scheduled_for: today(15),
    body: "Hi David, here's your quote for weekly lawn mowing at 88 Elm St \u2014 $85/week. We can start as early as next Monday. Reply YES to confirm or let me know if you have questions!",
    status: 'pending_approval',
    attempt: 1,
  },
];

const MOCK_SENT = [
  {
    id: 'f10',
    lead_id: 'l4',
    lead_name: 'Amanda Foster',
    type: 'first_touch',
    channel: 'sms',
    sent_at: daysAgo(1),
    body: "Hi Amanda, Sarah Mitchell mentioned you might need hedge trimming! We'd be happy to take a look. What day works best?",
    status: 'delivered',
    opened: true,
  },
  {
    id: 'f11',
    lead_id: 'l2',
    lead_name: 'Patricia Gomez',
    type: 'site_visit_confirm',
    channel: 'sms',
    sent_at: daysAgo(2),
    body: "Hi Patricia, confirming Marcus will be at 220 Pine Ridge Dr tomorrow between 10am-12pm to assess the oak tree. He'll have a quote ready same day.",
    status: 'delivered',
    opened: true,
  },
  {
    id: 'f12',
    lead_id: 'l3',
    lead_name: 'Robert Kim',
    type: 'quote_follow_up',
    channel: 'email',
    sent_at: daysAgo(1),
    body: "Hi Robert, just checking in \u2014 did you get a chance to review the spring cleanup quote? Let me know if you have any questions.",
    status: 'delivered',
    opened: false,
  },
];

const MOCK_CADENCES = [
  { stage: 'new', name: 'First Touch', delay_hours: 1, channel: 'sms', description: 'Immediate outreach after lead captured' },
  { stage: 'contacted', name: 'Check-in', delay_hours: 48, channel: 'sms', description: 'Follow up if no response after 2 days' },
  { stage: 'quoted', name: 'Quote Nudge', delay_hours: 72, channel: 'email', description: 'Gentle reminder 3 days after quote sent' },
  { stage: 'quoted', name: 'Final Touch', delay_hours: 240, channel: 'sms', description: 'Last follow-up 10 days after quote' },
  { stage: 'site_visit', name: 'Visit Confirm', delay_hours: 24, channel: 'sms', description: 'Confirm site visit with customer' },
];

/* ---------- API data mapping ---------- */

function mapPendingTaskToFollowUp(task, leadsMap) {
  const lead = leadsMap[task.lead_id] || {};
  return {
    id: task.id,
    lead_id: task.lead_id,
    lead_name: lead.name || task.lead_name || 'Unknown',
    type: task.title || 'follow_up',
    channel: task.type === 'email' ? 'email' : 'sms',
    scheduled_for: new Date(task.due_at),
    body: task.description || '',
    status: task.assigned_to_id ? 'approved' : 'pending_approval',
    attempt: task.attempt || 1,
  };
}

function mapCompletedToSent(task, leadsMap) {
  const lead = leadsMap[task.lead_id] || {};
  return {
    id: task.id,
    lead_id: task.lead_id,
    lead_name: lead.name || task.lead_name || 'Unknown',
    type: task.title || 'follow_up',
    channel: task.type === 'email' ? 'email' : 'sms',
    sent_at: new Date(task.completed_at || task.updated_at),
    body: task.description || '',
    status: 'delivered',
    opened: undefined,
  };
}

function mapActivityToSent(activity, leadsMap) {
  const lead = leadsMap[activity.lead_id] || {};
  return {
    id: activity.id,
    lead_id: activity.lead_id,
    lead_name: lead.name || activity.lead_name || 'Unknown',
    type: activity.subject || 'email',
    channel: 'email',
    sent_at: new Date(activity.occurred_at),
    body: activity.body || '',
    status: 'delivered',
    opened: activity.opened,
  };
}

/* ---------- small components ---------- */

function ChannelBadge({ channel }) {
  if (channel === 'sms') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <MessageSquare className="h-3 w-3" />
        SMS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      <Mail className="h-3 w-3" />
      Email
    </span>
  );
}

function TypeLabel({ type }) {
  const labels = {
    first_touch: 'First Touch',
    quote_follow_up: 'Quote Follow-up',
    quote_send: 'Quote Send',
    site_visit_confirm: 'Visit Confirm',
    check_in: 'Check-in',
  };
  return <span className="text-xs text-neutral-500">{labels[type] || type}</span>;
}

function StatusDot({ status, opened }) {
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle className="h-3.5 w-3.5" />
        Delivered
        {opened !== undefined && (
          <span className="ml-1 inline-flex items-center gap-0.5 text-neutral-500">
            {opened ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {opened ? 'Opened' : 'Not opened'}
          </span>
        )}
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <XCircle className="h-3.5 w-3.5" />
        Failed
      </span>
    );
  }
  return null;
}

function StageBadge({ stage }) {
  const colors = {
    new: 'bg-emerald-100 text-emerald-700',
    contacted: 'bg-sky-100 text-sky-700',
    quoted: 'bg-amber-100 text-amber-700',
    site_visit: 'bg-purple-100 text-purple-700',
  };
  const labels = {
    new: 'New',
    contacted: 'Contacted',
    quoted: 'Quoted',
    site_visit: 'Site Visit',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[stage] || 'bg-neutral-100 text-neutral-600'}`}>
      {labels[stage] || stage}
    </span>
  );
}

function delayLabel(hours) {
  if (hours < 24) return `${hours}h`;
  const days = hours / 24;
  return `${days}d`;
}

/* ---------- main component ---------- */

export default function FollowUpsTab() {
  const [queued, setQueued] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [cadencesOpen, setCadencesOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [pendingRes, completedRes, leadsRes, activitiesRes] = await Promise.allSettled([
          getTasks({ status: 'pending', sort: 'due_at' }),
          getTasks({ status: 'completed', sort: '-completed_at', per_page: 20 }),
          getLeads({ status: 'open' }),
          getActivities({ type: 'email', sort: '-occurred_at', per_page: 20 }),
        ]);

        if (cancelled) return;

        // Build leads lookup map
        const leadsData = leadsRes.status === 'fulfilled' ? (leadsRes.value?.data?.data || leadsRes.value?.data || []) : [];
        const leadsMap = {};
        (Array.isArray(leadsData) ? leadsData : []).forEach((l) => {
          leadsMap[l.id] = l;
        });

        // Map pending tasks to queued follow-ups (filter to email/call types)
        const pendingTasks = pendingRes.status === 'fulfilled'
          ? (pendingRes.value?.data?.data || pendingRes.value?.data || [])
          : [];
        const filteredPending = (Array.isArray(pendingTasks) ? pendingTasks : []).filter(
          (t) => t.type === 'email' || t.type === 'call'
        );
        const mappedQueued = filteredPending.map((t) => mapPendingTaskToFollowUp(t, leadsMap));

        // Map completed tasks + activities to sent follow-ups
        const completedTasks = completedRes.status === 'fulfilled'
          ? (completedRes.value?.data?.data || completedRes.value?.data || [])
          : [];
        const filteredCompleted = (Array.isArray(completedTasks) ? completedTasks : []).filter(
          (t) => t.type === 'email' || t.type === 'call'
        );
        const mappedCompletedTasks = filteredCompleted.map((t) => mapCompletedToSent(t, leadsMap));

        const activitiesData = activitiesRes.status === 'fulfilled'
          ? (activitiesRes.value?.data?.data || activitiesRes.value?.data || [])
          : [];
        const mappedActivities = (Array.isArray(activitiesData) ? activitiesData : []).map((a) =>
          mapActivityToSent(a, leadsMap)
        );

        // Combine and sort sent by date descending
        const allSent = [...mappedCompletedTasks, ...mappedActivities].sort(
          (a, b) => b.sent_at - a.sent_at
        );

        // If we got no data at all from any endpoint, fall back to mock
        if (mappedQueued.length === 0 && allSent.length === 0 && USE_MOCK) {
          setQueued(MOCK_QUEUED);
          setSent(MOCK_SENT);
          setUsingMock(true);
        } else {
          setQueued(mappedQueued);
          setSent(allSent);
          setUsingMock(false);
        }
      } catch (err) {
        console.error('[FollowUpsTab] Failed to fetch data, using mock fallback:', err);
        if (!cancelled && USE_MOCK) {
          setQueued(MOCK_QUEUED);
          setSent(MOCK_SENT);
          setUsingMock(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const todayDate = new Date().toDateString();
  const todayCount = queued.filter((f) => f.scheduled_for.toDateString() === todayDate).length;
  const pendingCount = queued.filter((f) => f.status === 'pending_approval').length;

  /* action handlers */
  const approve = async (id) => {
    // Optimistic update
    setQueued((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'approved' } : f)));
    if (!usingMock) {
      try {
        await updateTask(id, { status: 'pending' });
      } catch (err) {
        console.error('[FollowUpsTab] Failed to approve task:', err);
        // Revert on error
        setQueued((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'pending_approval' } : f)));
      }
    }
  };

  const skip = async (id) => {
    // Optimistic update
    setQueued((prev) => prev.filter((f) => f.id !== id));
    if (!usingMock) {
      try {
        await completeTask(id);
      } catch (err) {
        console.error('[FollowUpsTab] Failed to skip task:', err);
        // Refetch would be needed for proper revert, but for now just log
      }
    }
  };

  const pause = async (id) => {
    // Optimistic update
    setQueued((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'paused' } : f)));
    if (!usingMock) {
      try {
        await updateTask(id, { status: 'cancelled' });
      } catch (err) {
        console.error('[FollowUpsTab] Failed to pause task:', err);
        setQueued((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'approved' } : f)));
      }
    }
  };

  const resume = async (id) => {
    // Optimistic update
    setQueued((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'approved' } : f)));
    if (!usingMock) {
      try {
        await updateTask(id, { status: 'pending' });
      } catch (err) {
        console.error('[FollowUpsTab] Failed to resume task:', err);
        setQueued((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'paused' } : f)));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-sm text-neutral-500">Loading follow-ups...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Sir Walter Insight Bar ---- */}
      <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Sir Walter</p>
            <p className="mt-0.5 text-sm text-amber-800">
              {todayCount} follow-up{todayCount !== 1 ? 's' : ''} going out today.
              {pendingCount > 0 && (
                <> {pendingCount} need{pendingCount === 1 ? 's' : ''} your approval before sending.</>
              )}{' '}
              1 lead (Lisa Park) hasn't been touched in 4 days &mdash; escalating.
            </p>
          </div>
        </div>
      </div>

      {/* ---- Queued Follow-ups ---- */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-800">
          <Clock className="h-4.5 w-4.5 text-neutral-500" />
          Queued
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
            {queued.length}
          </span>
        </h2>
        <div className="space-y-3">
          {queued.map((f) => {
            const isPending = f.status === 'pending_approval';
            const isPaused = f.status === 'paused';
            return (
              <div
                key={f.id}
                className={`rounded-lg border bg-white p-4 shadow-sm transition-colors ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/30'
                    : isPaused
                    ? 'border-neutral-300 bg-neutral-50 opacity-70'
                    : 'border-neutral-200'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-neutral-900">{f.lead_name}</span>
                  <TypeLabel type={f.type} />
                  <ChannelBadge channel={f.channel} />
                  {f.attempt > 1 && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      Attempt {f.attempt}
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-800">
                      <AlertTriangle className="h-3 w-3" />
                      Needs Approval
                    </span>
                  )}
                  {isPaused && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
                      <Pause className="h-3 w-3" />
                      Paused
                    </span>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{f.body}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                    <Send className="h-3 w-3" />
                    {formatDate(f.scheduled_for)}
                  </span>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        onClick={() => approve(f.id)}
                        className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {isPaused ? (
                      <button
                        onClick={() => resume(f.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <Play className="h-3 w-3" />
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => pause(f.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <Pause className="h-3 w-3" />
                        Pause
                      </button>
                    )}
                    <button className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => skip(f.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="h-3 w-3" />
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Sent Follow-ups ---- */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-800">
          <CheckCircle className="h-4.5 w-4.5 text-neutral-500" />
          Recently Sent
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
            {sent.length}
          </span>
        </h2>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white shadow-sm">
          {sent.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span className="w-32 truncate font-medium text-neutral-900 text-sm">{f.lead_name}</span>
              <TypeLabel type={f.type} />
              <ChannelBadge channel={f.channel} />
              <span className="text-xs text-neutral-400">{relativeTime(f.sent_at)}</span>
              <StatusDot status={f.status} opened={f.opened} />
            </div>
          ))}
        </div>
      </section>

      {/* ---- Cadences ---- */}
      <section>
        <button
          onClick={() => setCadencesOpen(!cadencesOpen)}
          className="flex w-full items-center gap-2 text-base font-semibold text-neutral-800 hover:text-neutral-600 transition-colors"
        >
          {cadencesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Settings2 className="h-4.5 w-4.5 text-neutral-500" />
          Follow-up Cadences
        </button>

        {cadencesOpen && (
          <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-2">Stage</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Delay</th>
                  <th className="px-4 py-2">Channel</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {MOCK_CADENCES.map((c, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <StageBadge stage={c.stage} />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-neutral-800">{c.name}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{delayLabel(c.delay_hours)}</td>
                    <td className="px-4 py-2.5">
                      <ChannelBadge channel={c.channel} />
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">{c.description}</td>
                    <td className="px-4 py-2.5">
                      <button className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
