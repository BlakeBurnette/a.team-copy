// src/pages/ParticipatingProjects.jsx
// List of projects where the organization is a Sub/Participant

import React, { useEffect, useMemo, useState, useDeferredValue, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  MapPin,
  Search,
  Bell,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

/* ----------------------------- UI Components ----------------------------- */

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
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
});

function participantStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'accepted' || s === 'active') return 'green';
  if (s === 'completed') return 'purple';
  if (s === 'invited') return 'yellow';
  if (s === 'declined' || s === 'removed') return 'red';
  return 'gray';
}

function projectStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'green';
  if (s === 'planning') return 'blue';
  if (s === 'on_hold') return 'yellow';
  if (s === 'completed') return 'purple';
  if (s === 'cancelled') return 'red';
  return 'gray';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function currency(cents) {
  const n = Math.max(0, Number(cents || 0));
  return `$${(n / 100).toFixed(2)}`;
}

/* ----------------------------- Project Card ----------------------------- */

const ProjectCard = memo(function ProjectCard({ project, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <Building2 className="w-3.5 h-3.5" />
            Prime: {project.organization_name}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>

      {project.property_address && (
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{project.property_address}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge tone={participantStatusTone(project.participant_status)}>
          {project.participant_status || 'invited'}
        </Badge>
        <Badge tone="purple">{project.participant_role}</Badge>
        <Badge tone={projectStatusTone(project.status)}>
          Project: {(project.status || 'planning').replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        {project.customer_name && <span>{project.customer_name}</span>}
        {project.start_date && <span>{formatDate(project.start_date)}</span>}
      </div>

      {project.budget_allocation && (
        <div className="mt-2 text-sm font-medium text-gray-700">
          Your Budget: {currency(project.budget_allocation * 100)}
        </div>
      )}
    </div>
  );
});

/* ----------------------------- Invite Card ----------------------------- */

const InviteCard = memo(function InviteCard({ invite, onAccept, onDecline }) {
  const [busy, setBusy] = useState(false);

  const handleAccept = async (e) => {
    e.stopPropagation();
    setBusy(true);
    await onAccept(invite);
    setBusy(false);
  };

  const handleDecline = async (e) => {
    e.stopPropagation();
    if (!confirm('Decline this project invitation?')) return;
    setBusy(true);
    await onDecline(invite);
    setBusy(false);
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <Bell className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{invite.project_name}</h3>
          <p className="text-sm text-gray-600">
            Invited by <strong>{invite.prime_org_name}</strong> as{' '}
            <strong className="capitalize">{invite.role}</strong>
          </p>
        </div>
      </div>

      {invite.property_address && (
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5" />
          {invite.property_address}
        </p>
      )}

      {invite.budget_allocation && (
        <p className="text-sm text-gray-600 mb-3">
          Budget allocation: {currency(invite.budget_allocation * 100)}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleAccept}
          disabled={busy}
          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Accept
        </button>
        <button
          onClick={handleDecline}
          disabled={busy}
          className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          Decline
        </button>
      </div>
    </div>
  );
});

/* ----------------------------- Main Page ----------------------------- */

export default function ParticipatingProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const searchQ = useDeferredValue(search);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      axios.get('/api/owner/projects/participating', { withCredentials: true }),
      axios.get('/api/owner/project-invites', { withCredentials: true }),
    ])
      .then(([projRes, inviteRes]) => {
        if (!alive) return;
        setProjects(projRes.data?.projects || []);
        setInvites(inviteRes.data?.invites || []);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.error || 'Failed to load projects');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let result = projects;
    if (statusFilter) {
      result = result.filter((p) => p.participant_status === statusFilter);
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.organization_name || '').toLowerCase().includes(q) ||
          (p.participant_role || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, statusFilter, searchQ]);

  const handleAcceptInvite = async (invite) => {
    try {
      await axios.post(
        `/api/owner/project-invites/${invite.invite_token}/accept`,
        {},
        { withCredentials: true }
      );
      // Refresh data
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      // Fetch the newly accepted project
      const { data } = await axios.get('/api/owner/projects/participating', {
        withCredentials: true,
      });
      setProjects(data?.projects || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept invite');
    }
  };

  const handleDeclineInvite = async (invite) => {
    try {
      await axios.post(
        `/api/owner/project-invites/${invite.invite_token}/decline`,
        {},
        { withCredentials: true }
      );
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to decline invite');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Briefcase className="w-6 h-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900">Working On</h1>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-500" />
            Pending Invitations ({invites.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {invites.map((invite) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                onAccept={handleAcceptInvite}
                onDecline={handleDeclineInvite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="accepted">Accepted</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading projects...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : filtered.length === 0 && invites.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {projects.length === 0
              ? "You're not participating in any projects yet."
              : 'No projects match your search.'}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No active projects match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/app/participating/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
