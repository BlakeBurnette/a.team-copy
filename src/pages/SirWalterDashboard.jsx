import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles, Send, Loader2, AlertCircle, Clock, CheckCircle2,
  Calendar, Users, DollarSign, ArrowRight, MessageSquare,
  Circle, X, FileText, MapPin, Phone, CreditCard,
  ClipboardList, UserPlus, ChevronDown, ChevronUp,
  Navigation, Check, Edit3, Trash2, Truck, CloudRain,
  Sun, CloudSnow, Wind, Thermometer, Package, TrendingUp,
  UserCheck, UserX, Play, CornerDownRight, Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../api/http';

// ═══════════════════════════════════════════════════════════════════════════
// Mock data — flip to false once real APIs are populated
// ═══════════════════════════════════════════════════════════════════════════

const USE_MOCK = true;

const MOCK_JOBS = [
  {
    id: 'j1', customer_name: 'Margaret Thompson', service: 'Weekly Mowing',
    address: '412 Oberlin Rd, Raleigh NC 27605', time: '8:00 AM',
    crew_name: 'Crew A — Danny', status: 'in_progress',
    lot_sqft: 8200, notes: 'Gate code: 4421. Dog in backyard, knock first.',
    on_my_way_sent: true,
  },
  {
    id: 'j2', customer_name: 'Robert Chen', service: 'Mulch & Bed Cleanup',
    address: '1809 Glenwood Ave, Raleigh NC 27608', time: '9:30 AM',
    crew_name: 'Crew A — Danny', status: 'pending',
    lot_sqft: 6400, notes: '3 yards cedar mulch. Front beds only.',
    on_my_way_sent: false,
  },
  {
    id: 'j3', customer_name: 'Lisa Whitfield', service: 'Weekly Mowing',
    address: '305 E Park Dr, Raleigh NC 27609', time: '11:00 AM',
    crew_name: 'Crew A — Danny', status: 'pending',
    lot_sqft: 11500, notes: '',
    on_my_way_sent: false,
  },
  {
    id: 'j4', customer_name: 'James & Angela Moretti', service: 'Spring Aeration + Overseed',
    address: '2200 Anderson Dr, Raleigh NC 27608', time: '8:30 AM',
    crew_name: 'Crew B — Marcus', status: 'in_progress',
    lot_sqft: 14200, notes: 'Fescue blend. Skip side yard — new sod.',
    on_my_way_sent: true,
  },
  {
    id: 'j5', customer_name: 'Patricia Langley', service: 'Hedge Trimming',
    address: '519 Devereux St, Raleigh NC 27605', time: '10:00 AM',
    crew_name: 'Crew B — Marcus', status: 'pending',
    lot_sqft: 5800, notes: 'Boxwood hedges along front walkway. ~40 linear ft.',
    on_my_way_sent: false,
  },
  {
    id: 'j6', customer_name: 'David Park', service: 'Leaf Removal',
    address: '3401 Wade Ave, Raleigh NC 27607', time: '1:00 PM',
    crew_name: 'Crew B — Marcus', status: 'pending',
    lot_sqft: 9600, notes: 'Heavy oak debris in back. Haul off included.',
    on_my_way_sent: false,
  },
  {
    id: 'j7', customer_name: 'Susan Bradley', service: 'Weekly Mowing',
    address: '704 Hillsborough St, Raleigh NC 27603', time: '12:30 PM',
    crew_name: 'Crew A — Danny', status: 'pending',
    lot_sqft: 7100, notes: '',
    on_my_way_sent: false,
  },
];

const MOCK_CREW = [
  { id: 'c1', name: 'Danny Alvarez', role: 'crew_leader', clocked_in: true, clocked_in_at: '7:12 AM', current_job: 'j1' },
  { id: 'c2', name: 'Marcus Johnson', role: 'crew_leader', clocked_in: true, clocked_in_at: '7:05 AM', current_job: 'j4' },
  { id: 'c3', name: 'Tyler Webb', role: 'crew_member', clocked_in: true, clocked_in_at: '7:15 AM', current_job: 'j1' },
  { id: 'c4', name: 'Jordan Ellis', role: 'crew_member', clocked_in: false, clocked_in_at: null, current_job: null, out_reason: 'Called in sick' },
  { id: 'c5', name: 'Chris Ramirez', role: 'crew_member', clocked_in: true, clocked_in_at: '7:20 AM', current_job: 'j4', time_off: 'PTO Apr 23–25' },
];

const MOCK_DRAFTS = [
  {
    id: 'd1', type: 'on_my_way',
    recipient: 'Robert Chen', channel: 'SMS',
    reason: 'On my way — next on Crew A\'s route, ETA ~25 min',
    body: "Hi Robert, Danny's crew is finishing up nearby and heading your way next. Should be there around 9:30. See you soon!",
  },
  {
    id: 'd2', type: 'quote_follow_up',
    recipient: 'James & Angela Moretti', channel: 'Email',
    reason: 'Quote follow-up — aeration quote sent 5 days ago, no response',
    body: "Hi James and Angela,\n\nJust checking in on the spring aeration and overseeding quote we sent over last week. We've got a few openings this month, and I'd love to get you on the schedule before things fill up.\n\nLet me know if you have any questions — happy to walk through it.\n\nBest,\nBlake's Lawn Care",
  },
  {
    id: 'd3', type: 'seasonal_upsell',
    recipient: 'David Park', channel: 'SMS',
    reason: 'Seasonal upsell — leaf removal customer, spring fertilization window',
    body: "Hey David, spring is the perfect time for a fertilizer treatment — makes a huge difference after winter. Want me to add it to your next visit? Happy to send a quick quote.",
  },
  {
    id: 'd4', type: 'payment_reminder',
    recipient: 'Karen Mitchell', channel: 'SMS',
    reason: 'Payment reminder — invoice #1047, 45 days overdue ($185)',
    body: "Hi Karen, hope you're doing well! Just a friendly reminder that invoice #1047 from March 5th ($185) is still outstanding. You can pay anytime through your customer portal. Thanks!",
  },
  {
    id: 'd5', type: 'post_service',
    recipient: 'Margaret Thompson', channel: 'SMS',
    reason: 'Post-service follow-up — weekly mowing completed this morning',
    body: "Hi Margaret, your lawn is looking great! Danny's crew just wrapped up. Everything went smooth — let us know if you need anything before next week.",
  },
  {
    id: 'd6', type: 'new_lead',
    recipient: 'Rachel Foster', channel: 'Email',
    reason: 'New lead — inbound request via website form, wants bi-weekly mowing quote',
    body: "Hi Rachel,\n\nThanks for reaching out! I'd love to help with your lawn care. Based on your address at 2811 Fairview Rd, it looks like you've got about a 1/4 acre lot — perfect for our bi-weekly mowing plan.\n\nI've attached a quote for your review. If it looks good, just reply or click the link to approve, and we'll get you on the schedule. Our next available opening is Thursday, April 24th.\n\nLooking forward to working with you!\n\nBlake's Lawn Care",
    editable_quote: {
      service: 'Bi-Weekly Mowing',
      lot_sqft: 10800,
      price_cents: 7500,
      frequency: 'Every 2 weeks',
      notes: 'Front + back yard, standard cut height',
    },
  },
];

const MOCK_EXCEPTIONS = [
  {
    id: 'e1', type: 'no_payment_method', title: '3 customers without payment method',
    description: 'Karen Mitchell, Tom Nguyen, Beth Rawlings',
    action_label: 'Review',
  },
  {
    id: 'e2', type: 'quote_expiring', title: '2 quotes expiring within 3 days',
    description: 'Moretti aeration ($485) and Langley hedge design ($320).',
    action_label: 'View',
  },
  {
    id: 'e3', type: 'follow_up', title: 'Tom Nguyen — no response in 12 days',
    description: 'Last message was a bi-weekly mowing quote. Sir Walter can draft another follow-up.',
    action_label: 'Draft',
  },
  {
    id: 'e4', type: 'crew_reminder', title: 'Jordan Ellis hasn\'t clocked in',
    description: 'Assigned to Crew A today. Usually clocks in by 7:15 AM.',
    action_label: 'Text',
  },
];

const MOCK_WEATHER = [
  { day: 'Mon', high: 78, low: 56, icon: 'sun', condition: 'Clear', precip: 0 },
  { day: 'Tue', high: 81, low: 58, icon: 'sun', condition: 'Sunny', precip: 0 },
  { day: 'Wed', high: 74, low: 55, icon: 'wind', condition: 'Windy', precip: 10 },
  { day: 'Thu', high: 68, low: 52, icon: 'rain', condition: 'Rain', precip: 85 },
  { day: 'Fri', high: 65, low: 50, icon: 'rain', condition: 'Showers', precip: 60 },
  { day: 'Sat', high: 72, low: 54, icon: 'sun', condition: 'Clearing', precip: 5 },
  { day: 'Sun', high: 76, low: 57, icon: 'sun', condition: 'Clear', precip: 0 },
];

const MOCK_SUPPLY_REMINDERS = [
  {
    id: 's1', material: 'Cedar Mulch', quantity: '8 yards',
    reason: '14 mulch jobs next week across 6 properties.',
    supplier: 'Triangle Landscape Supply',
  },
  {
    id: 's2', material: 'Fescue Seed Blend', quantity: '50 lbs',
    reason: '3 aeration + overseed jobs booked (Moretti, Chen, Foster).',
    supplier: 'BWI Companies',
  },
];

const CHECKLIST_DISMISSED_KEY = 'ph_checklist_dismissed';
const CHECKLIST_ASKED_KEY = 'ph_asked_sir_walter';

// ═══════════════════════════════════════════════════════════════════════════
// Weather Forecast — schedule-aware weather strip
// ═══════════════════════════════════════════════════════════════════════════

const weatherIcons = {
  sun: Sun, rain: CloudRain, snow: CloudSnow, wind: Wind,
};

function WeatherStrip({ forecast, weatherAlert }) {
  if (!forecast || forecast.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {weatherAlert && (
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-start gap-2">
          <CloudRain className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">{weatherAlert}</p>
        </div>
      )}
      <div className="px-4 py-3 flex items-center gap-1 overflow-x-auto">
        {forecast.map((day, i) => {
          const Icon = weatherIcons[day.icon] || Sun;
          const isRainy = day.precip >= 50;
          return (
            <div
              key={i}
              className={`flex flex-col items-center min-w-[52px] px-2 py-1.5 rounded-lg ${
                isRainy ? 'bg-blue-50' : ''
              }`}
            >
              <span className="text-[10px] font-medium text-gray-500 uppercase">{day.day}</span>
              <Icon className={`h-4 w-4 my-1 ${isRainy ? 'text-blue-500' : 'text-amber-400'}`} />
              <span className="text-xs font-medium text-gray-900">{day.high}°</span>
              <span className="text-[10px] text-gray-400">{day.low}°</span>
              {day.precip > 0 && (
                <span className={`text-[10px] mt-0.5 ${isRainy ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {day.precip}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Crew Status — who's clocked in, who's where
// ═══════════════════════════════════════════════════════════════════════════

function CrewStatus({ crew }) {
  if (!crew || crew.length === 0) return null;

  const clockedIn = crew.filter(c => c.clocked_in);
  const notIn = crew.filter(c => !c.clocked_in);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900">Crew status</h3>
        <span className="text-xs text-gray-500">
          {clockedIn.length}/{crew.length} clocked in
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {clockedIn.map(c => (
          <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-800">{c.name}</span>
            <span className="text-[10px] text-emerald-600">since {c.clocked_in_at}</span>
            {c.time_off && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                {c.time_off}
              </span>
            )}
          </div>
        ))}
        {notIn.map(c => (
          <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200">
            <UserX className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-xs font-medium text-rose-700">{c.name}</span>
            <span className="text-[10px] text-rose-500">
              {c.out_reason || 'not clocked in'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Today's Route — the daily action list
// ═══════════════════════════════════════════════════════════════════════════

function TodaysRoute({ jobs, crewMembers }) {
  const hasCrew = crewMembers && crewMembers.length > 0;

  const grouped = useMemo(() => {
    if (!hasCrew || !jobs || jobs.length === 0) return null;
    const groups = {};
    jobs.forEach(job => {
      const key = job.crew_name || job.assigned_to || 'Unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(job);
    });
    return groups;
  }, [jobs, hasCrew]);

  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Today's Route</h3>
        </div>
        <p className="text-sm text-gray-500">
          No jobs scheduled today. Sir Walter is watching for inbound leads and messages.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Today's Route</h3>
          <span className="text-xs text-gray-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {grouped ? (
        <div className="divide-y divide-gray-100">
          {Object.entries(grouped).map(([crewName, crewJobs]) => (
            <CrewJobGroup key={crewName} crewName={crewName} jobs={crewJobs} />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {jobs.map((job, i) => (
            <JobRow key={job.id || i} job={job} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CrewJobGroup({ crewName, jobs }) {
  const [collapsed, setCollapsed] = useState(false);
  const completed = jobs.filter(j => j.status === 'completed').length;
  const inProgress = jobs.filter(j => j.status === 'in_progress').length;

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">{crewName}</span>
          <span className="text-xs text-gray-500">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
          {inProgress > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
              {inProgress} active
            </span>
          )}
          {completed > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
              {completed} done
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronUp className="h-3.5 w-3.5 text-gray-400" />}
      </button>
      {!collapsed && (
        <ul className="divide-y divide-gray-50">
          {jobs.map((job, i) => (
            <JobRow key={job.id || i} job={job} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobRow({ job }) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <li className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {job.status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : job.status === 'in_progress' ? (
            <Play className="h-4 w-4 text-amber-500 fill-amber-500" />
          ) : (
            <Circle className="h-4 w-4 text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{job.customer_name}</span>
            {job.service && (
              <span className="text-xs text-gray-500 truncate">&middot; {job.service}</span>
            )}
            {job.on_my_way_sent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                notified
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {job.address && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 truncate">{job.address}</span>
              </div>
            )}
            {job.lot_sqft && (
              <span className="text-[10px] text-gray-400 flex-shrink-0">
                {(job.lot_sqft / 1000).toFixed(1)}k sqft
              </span>
            )}
          </div>
          {job.notes && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-[10px] text-amber-600 hover:text-amber-700 mt-1 flex items-center gap-0.5"
            >
              <CornerDownRight className="h-2.5 w-2.5" />
              {showNotes ? 'hide notes' : 'notes'}
            </button>
          )}
          {showNotes && job.notes && (
            <p className="text-xs text-gray-600 mt-1 pl-3 border-l-2 border-amber-200 italic">
              {job.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {job.time && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              job.status === 'in_progress'
                ? 'text-amber-700 bg-amber-100'
                : 'text-gray-600 bg-gray-100'
            }`}>
              {job.time}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Drafts from Walter — editable messages waiting for owner to send
// ═══════════════════════════════════════════════════════════════════════════

const DRAFT_TYPE_LABELS = {
  on_my_way: 'On My Way',
  post_service: 'Follow-Up',
  quote_follow_up: 'Quote',
  seasonal_upsell: 'Upsell',
  payment_reminder: 'Payment',
  new_lead: 'New Lead',
};
const DRAFT_TYPE_COLORS = {
  on_my_way: 'bg-sky-50 text-sky-700 border-sky-200',
  post_service: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  quote_follow_up: 'bg-violet-50 text-violet-700 border-violet-200',
  seasonal_upsell: 'bg-amber-50 text-amber-700 border-amber-200',
  payment_reminder: 'bg-rose-50 text-rose-700 border-rose-200',
  new_lead: 'bg-teal-50 text-teal-700 border-teal-200',
};

function DraftsInbox({ drafts, onApprove, onUpdate, onReject }) {
  if (!drafts || drafts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-gray-900">Outbox clear</h3>
        </div>
        <p className="text-sm text-gray-500">
          No drafts waiting. Sir Walter will prepare messages as things come up.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Send className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900">Ready to send</h3>
        <span className="text-xs text-gray-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
          {drafts.length}
        </span>
      </div>
      <ul className="divide-y divide-gray-50">
        {drafts.map((draft) => (
          <DraftRow
            key={draft.id}
            draft={draft}
            onApprove={() => onApprove(draft)}
            onUpdate={onUpdate}
            onReject={() => onReject(draft)}
          />
        ))}
      </ul>
    </div>
  );
}

function DraftRow({ draft, onApprove, onUpdate, onReject }) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(draft.body);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  const handleSave = () => {
    onUpdate({ ...draft, body: editBody });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditBody(draft.body);
    setEditing(false);
  };

  const typeLabel = DRAFT_TYPE_LABELS[draft.type] || draft.type;
  const typeColor = DRAFT_TYPE_COLORS[draft.type] || 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <MessageSquare className="h-4 w-4 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{draft.recipient}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${typeColor}`}>
              {typeLabel}
            </span>
            {draft.channel && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                {draft.channel}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{draft.reason}</p>

          {/* Quote details for new leads */}
          {draft.editable_quote && (
            <div className="mt-2 p-2.5 bg-teal-50/50 rounded-lg border border-teal-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-teal-800">{draft.editable_quote.service}</span>
                <span className="font-bold text-teal-900">
                  ${(draft.editable_quote.price_cents / 100).toFixed(2)}/{draft.editable_quote.frequency === 'Every 2 weeks' ? 'visit' : 'visit'}
                </span>
              </div>
              <div className="text-teal-700">
                {(draft.editable_quote.lot_sqft / 1000).toFixed(1)}k sqft &middot; {draft.editable_quote.frequency}
                {draft.editable_quote.notes && <> &middot; {draft.editable_quote.notes}</>}
              </div>
            </div>
          )}

          {/* Expandable / editable message */}
          {!editing && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-amber-600 hover:text-amber-700 mt-1.5 flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              {expanded ? 'Hide' : 'Preview'}
            </button>
          )}
          {expanded && !editing && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
              {draft.body}
            </div>
          )}
          {editing && (
            <div className="mt-2">
              <textarea
                ref={textareaRef}
                value={editBody}
                onChange={(e) => {
                  setEditBody(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                className="w-full p-3 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                rows={3}
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={handleSave}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                >
                  Save changes
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
            title="Send"
          >
            <Check className="h-3 w-3" />
            Send
          </button>
          <button
            onClick={() => { setExpanded(true); setEditing(true); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit before sending"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onReject}
            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            title="Discard"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Supply Reminders — material needs based on upcoming quotes/jobs
// ═══════════════════════════════════════════════════════════════════════════

function SupplyReminders({ reminders }) {
  if (!reminders || reminders.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900">Supply check</h3>
      </div>
      <div className="space-y-2">
        {reminders.map(r => (
          <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{r.material}</span>
                <span className="text-xs font-bold text-amber-700">{r.quantity}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{r.reason}</p>
              {r.supplier && (
                <p className="text-[10px] text-gray-400 mt-0.5">Usual supplier: {r.supplier}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Needs Attention — exceptions that need human action
// ═══════════════════════════════════════════════════════════════════════════

function NeedsAttention({ exceptions }) {
  if (!exceptions || exceptions.length === 0) return null;

  const iconMap = {
    unpaid: DollarSign, no_payment_method: CreditCard, missing_data: FileText,
    quote_expiring: Clock, schedule_conflict: Calendar, crew_reminder: Users,
    follow_up: Phone,
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900">Needs attention</h3>
        <span className="text-xs text-gray-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
          {exceptions.length}
        </span>
      </div>
      <ul className="divide-y divide-gray-50">
        {exceptions.map((ex, i) => {
          const Icon = iconMap[ex.type] || AlertCircle;
          return (
            <li key={ex.id || i} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">{ex.title}</span>
                  <p className="mt-0.5 text-sm text-gray-600">{ex.description}</p>
                </div>
                {ex.action_label && (
                  <button className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors">
                    {ex.action_label}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Schedule Capacity
// ═══════════════════════════════════════════════════════════════════════════

function ScheduleCapacity({ nextAvailable, weekLoad }) {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        <span>
          Next opening: <span className="font-medium text-gray-700">{nextAvailable || 'checking...'}</span>
        </span>
      </div>
      {weekLoad !== null && weekLoad !== undefined && (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>
            This week: <span className="font-medium text-gray-700">{weekLoad} job{weekLoad !== 1 ? 's' : ''}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Ask Sir Walter — compact command bar
// ═══════════════════════════════════════════════════════════════════════════

const SUGGESTIONS = [
  'What should I focus on today?',
  'Who needs follow-up?',
  'Draft a reminder for overdue invoices',
  "What's my next opening?",
  'Any quotes about to expire?',
  'How much mulch do I need this week?',
];

function AskWalterPanel() {
  const { user } = useAuth() || {};
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || sending) return;

    try { localStorage.setItem(CHECKLIST_ASKED_KEY, new Date().toISOString()); } catch {}

    const userMsg = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      const res = await apiFetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: { page: location.pathname, roles: user?.roles || [] },
        }),
      });

      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant', content: data.content, tool_results: data.tool_results,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant', content: 'Sorry, I had trouble with that. Try again.',
      }]);
    } finally {
      setSending(false);
    }
  }, [input, messages, sending, user, location.pathname]);

  const hasMessages = messages.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900">Ask Sir Walter</h3>
      </div>

      <div className="p-4">
        {hasMessages && (
          <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-amber-500 text-white' : 'bg-white border border-amber-200 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.tool_results?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.tool_results.map((r, j) => (
                        <div key={j} className="bg-amber-50 border border-amber-100 rounded p-2">
                          <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide mb-1">{r.tool}</p>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-hidden">
                            {typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {!hasMessages && !input.trim() && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)} disabled={sending}
                className="text-xs px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >{s}</button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={hasMessages ? 'Follow up...' : 'Ask Sir Walter anything...'}
            className="flex-1 text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-gray-400"
            disabled={sending}
          />
          <button onClick={() => sendMessage()} disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════

export default function SirWalterDashboard() {
  const { user } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [crewMembers, setCrewMembers] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [weather, setWeather] = useState([]);
  const [weatherAlert, setWeatherAlert] = useState(null);
  const [supplyReminders, setSupplyReminders] = useState([]);
  const [nextAvailable, setNextAvailable] = useState(null);
  const [weekLoad, setWeekLoad] = useState(null);
  const [counts, setCounts] = useState({ customers: 0, services: 0, schedule: 0, stripe: false });

  useEffect(() => {
    try { setChecklistDismissed(USE_MOCK || !!localStorage.getItem(CHECKLIST_DISMISSED_KEY)); } catch {}
  }, []);

  // Fetch all dashboard data
  useEffect(() => {
    let alive = true;

    if (USE_MOCK) {
      setJobs(MOCK_JOBS);
      setCrewMembers(MOCK_CREW);
      setDrafts(MOCK_DRAFTS);
      setExceptions(MOCK_EXCEPTIONS);
      setWeather(MOCK_WEATHER);
      setWeatherAlert("Rain expected Thursday & Friday. Sir Walter recommends front-loading the schedule — move Thursday's 4 mowing jobs to Monday/Tuesday if crews have capacity.");
      setSupplyReminders(MOCK_SUPPLY_REMINDERS);
      setNextAvailable('Thu, Apr 24');
      setWeekLoad(32);
      setCounts({ customers: 47, services: 6, schedule: 7, stripe: true });
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await apiFetch(`/api/schedule?from=${todayStr}&to=${todayStr}`);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          if (alive) {
            setCounts(c => ({ ...c, schedule: items.length }));
            setJobs(items.map(j => ({
              id: j.id,
              customer_name: j.customer_name || j.title || 'Job',
              service: j.service_name || j.description || '',
              address: j.address || j.location || j.property_address || '',
              time: j.time_window || j.start_time || '',
              crew_name: j.crew_name || j.assigned_crew || '',
              assigned_to: j.assigned_to || '',
              status: j.status || 'pending',
              lot_sqft: j.lot_sqft || null,
              notes: j.notes || j.access_notes || '',
              on_my_way_sent: j.on_my_way_sent || false,
            })));
          }
        }
      } catch {}

      try {
        const now = new Date();
        const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
        const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
        const res = await apiFetch(`/api/schedule?from=${sun.toISOString().split('T')[0]}&to=${sat.toISOString().split('T')[0]}`);
        if (res.ok) {
          const data = await res.json();
          if (alive) setWeekLoad(Array.isArray(data?.items) ? data.items.length : 0);
        }
      } catch {}

      try {
        const res = await apiFetch('/api/schedule/available');
        if (res.ok) {
          const data = await res.json();
          if (alive && data) {
            const slot = Array.isArray(data) ? data[0] : data.next_available || data.date;
            if (slot) {
              const d = typeof slot === 'string' ? slot : slot.date;
              if (d) {
                const dt = new Date(d);
                const diffDays = Math.round((dt - new Date()) / 86400000);
                if (diffDays <= 0) setNextAvailable('Today');
                else if (diffDays === 1) setNextAvailable('Tomorrow');
                else setNextAvailable(dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
              }
            }
          }
        }
      } catch {}

      try {
        const res = await apiFetch('/api/owner/crew-members');
        if (res.ok) {
          const data = await res.json();
          if (alive) setCrewMembers(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
        }
      } catch {}

      try {
        const res = await apiFetch('/api/owner/customers?limit=1');
        if (res.ok) {
          const data = await res.json();
          if (alive) setCounts(c => ({ ...c, customers: data?.total || data?.count || 0 }));
        }
      } catch {}

      const excs = [];
      try {
        const res = await apiFetch('/api/owner/customers?limit=200');
        if (res.ok) {
          const data = await res.json();
          const customers = Array.isArray(data?.items) ? data.items : [];
          const noPayment = customers.filter(c => !c.payment_method && !c.stripe_customer_id);
          if (alive && noPayment.length > 0) {
            excs.push({
              id: 'no-payment', type: 'no_payment_method',
              title: `${noPayment.length} customer${noPayment.length > 1 ? 's' : ''} without payment method`,
              description: noPayment.slice(0, 3).map(c => c.name).join(', ') + (noPayment.length > 3 ? ` +${noPayment.length - 3} more` : ''),
              action_label: 'Review',
            });
          }
        }
      } catch {}

      try {
        const res = await apiFetch('/api/quotes?status=pending&limit=50');
        if (res.ok) {
          const data = await res.json();
          const quotes = Array.isArray(data?.items) ? data.items : [];
          const expiring = quotes.filter(q => q.expires_at && (new Date(q.expires_at) - Date.now()) / 86400000 <= 3 && (new Date(q.expires_at) - Date.now()) > 0);
          if (alive && expiring.length > 0) {
            excs.push({
              id: 'quotes-expiring', type: 'quote_expiring',
              title: `${expiring.length} quote${expiring.length > 1 ? 's' : ''} expiring within 3 days`,
              description: 'Send a follow-up before they expire.',
              action_label: 'View',
            });
          }
        }
      } catch {}

      if (alive) {
        setExceptions(excs);
        setDrafts([]);
        setLoading(false);
      }
    };

    fetchAll();
    return () => { alive = false; };
  }, []);

  const handleApproveDraft = useCallback(async (draft) => {
    setDrafts(d => d.filter(x => x.id !== draft.id));
  }, []);

  const handleUpdateDraft = useCallback((updated) => {
    setDrafts(d => d.map(x => x.id === updated.id ? updated : x));
  }, []);

  const handleRejectDraft = useCallback(async (draft) => {
    setDrafts(d => d.filter(x => x.id !== draft.id));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          <span className="text-sm text-gray-500">Sir Walter is getting your day ready...</span>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Good {getTimeOfDay()}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {jobs.length > 0
            ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''} on the schedule today.`
            : 'No jobs on the schedule today.'}
          {drafts.length > 0 && ` ${drafts.length} message${drafts.length !== 1 ? 's' : ''} ready to send.`}
        </p>
        <div className="mt-1.5">
          <ScheduleCapacity nextAvailable={nextAvailable} weekLoad={weekLoad} />
        </div>
      </div>

      {/* Getting Started checklist */}
      {!checklistDismissed && (
        <GettingStartedChecklist
          counts={counts}
          onDismiss={() => {
            setChecklistDismissed(true);
            try { localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true'); } catch {}
          }}
        />
      )}

      {/* Weather — schedule-aware forecast with rain alerts */}
      <WeatherStrip forecast={weather} weatherAlert={weatherAlert} />

      {/* Crew Status — who's clocked in */}
      <CrewStatus crew={crewMembers} />

      {/* Today's Route — the main event */}
      <TodaysRoute jobs={jobs} crewMembers={crewMembers} />

      {/* Drafts from Walter — editable messages waiting for approval */}
      <DraftsInbox
        drafts={drafts}
        onApprove={handleApproveDraft}
        onUpdate={handleUpdateDraft}
        onReject={handleRejectDraft}
      />

      {/* Supply Reminders — material needs for upcoming jobs */}
      <SupplyReminders reminders={supplyReminders} />

      {/* Needs Attention — only shows if there are exceptions */}
      <NeedsAttention exceptions={exceptions} />

      {/* Ask Sir Walter */}
      <AskWalterPanel />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Getting Started — onboarding checklist
// ═══════════════════════════════════════════════════════════════════════════

function GettingStartedChecklist({ counts, onDismiss }) {
  const [asked, setAsked] = useState(false);
  useEffect(() => { try { setAsked(!!localStorage.getItem(CHECKLIST_ASKED_KEY)); } catch {} }, []);

  const items = [
    { done: (counts.customers || 0) > 0, label: 'Add your first customer', icon: UserPlus },
    { done: (counts.services || 0) > 0, label: 'Set up a service', icon: ClipboardList },
    { done: (counts.schedule || 0) > 0, label: 'Schedule your first job', icon: Calendar },
    { done: (counts.stripe || false), label: 'Connect Stripe for payments', icon: CreditCard },
    { done: asked, label: 'Ask Sir Walter a question', icon: MessageSquare },
  ];
  const completeCount = items.filter(i => i.done).length;
  if (completeCount === items.length) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Getting started &middot; {completeCount}/{items.length}</h3>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-700 p-1 -m-1" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-gray-600 mb-3">A few things to do before Sir Walter is running your whole operation.</p>
      <ul className="space-y-1">
        {items.map(item => (
          <li key={item.label} className="flex items-center gap-2 text-sm px-1.5 py-1 -mx-1.5 rounded">
            {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" /> : <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            <span className={item.done ? 'text-gray-500 line-through' : 'text-gray-800'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
