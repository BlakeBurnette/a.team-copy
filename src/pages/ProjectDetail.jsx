// src/pages/ProjectDetail.jsx
// Detailed view of a project with tabs for overview, participants, phases, and service records

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  FolderKanban,
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Users,
  ClipboardList,
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import ProjectParticipants from '../components/owner/ProjectParticipants';
import ProjectPhases from '../components/owner/ProjectPhases';

/* ----------------------------- UI Components ----------------------------- */

const Badge = ({ tone = 'gray', children }) => {
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
};

const Tab = ({ active, onClick, children, badge }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-amber-500 text-amber-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    {children}
    {badge > 0 && (
      <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">{badge}</span>
    )}
  </button>
);

function statusTone(status) {
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

/* ----------------------------- Overview Tab ----------------------------- */

function OverviewTab({ project, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'planning',
        total_budget: project.total_budget || '',
        start_date: project.start_date?.split('T')[0] || '',
        target_end_date: project.target_end_date?.split('T')[0] || '',
      });
    }
  }, [project]);

  const handleSave = async () => {
    setBusy(true);
    try {
      const { data } = await axios.patch(`/api/owner/projects/${project.id}`, form, {
        withCredentials: true,
      });
      onUpdate(data);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    } finally {
      setBusy(false);
    }
  };

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Project Info Card */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">Project Details</h2>
          {project.access_type === 'prime' && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget ($)</label>
                <input
                  type="number"
                  value={form.total_budget}
                  onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target End</label>
                <input
                  type="date"
                  value={form.target_end_date}
                  onChange={(e) => setForm({ ...form, target_end_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(project.status)}>
                {(project.status || 'planning').replace(/_/g, ' ')}
              </Badge>
              <Badge tone="gray">{project.project_type || 'general'}</Badge>
              {project.access_type === 'participant' && (
                <Badge tone="purple">You are a Sub</Badge>
              )}
            </div>

            {project.description && (
              <p className="text-gray-600">{project.description}</p>
            )}

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer:</span>
                <span className="ml-2 font-medium">{project.customer?.name || '—'}</span>
              </div>
              {project.property && (
                <div>
                  <span className="text-gray-500">Property:</span>
                  <span className="ml-2 font-medium">{project.property.address}</span>
                </div>
              )}
              {project.total_budget && (
                <div>
                  <span className="text-gray-500">Budget:</span>
                  <span className="ml-2 font-medium">{currency(project.total_budget * 100)}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Start:</span>
                <span className="ml-2 font-medium">{formatDate(project.start_date)}</span>
              </div>
              <div>
                <span className="text-gray-500">Target End:</span>
                <span className="ml-2 font-medium">{formatDate(project.target_end_date)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Participants</span>
          </div>
          <p className="text-2xl font-bold">{project.participant_count || 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <ClipboardList className="w-4 h-4" />
            <span className="text-sm">Phases</span>
          </div>
          <p className="text-2xl font-bold">{project.phase_count || 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Service Records</span>
          </div>
          <p className="text-2xl font-bold">—</p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Service Records Tab ----------------------------- */

function ServiceRecordsTab({ projectId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get(`/api/owner/projects/${projectId}/service-records`, { withCredentials: true })
      .then(({ data }) => {
        if (!alive) return;
        setRecords(data?.service_records || []);
      })
      .catch(() => {
        if (alive) setRecords([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading service records...</div>;
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No service records logged for this project yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div key={r.service_record_id} className="bg-white border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {r.participant_org_name || 'Unknown'} - {r.participant_role || 'Work'}
              </p>
              <p className="text-sm text-gray-500">
                {r.phase_name && <span>Phase: {r.phase_name} | </span>}
                {formatDate(r.created_at)}
              </p>
            </div>
            <Badge tone={r.status === 'completed' ? 'green' : 'yellow'}>
              {r.status || 'draft'}
            </Badge>
          </div>
          {r.notes && <p className="mt-2 text-sm text-gray-600">{r.notes}</p>}
          {r.total_cents > 0 && (
            <p className="mt-2 text-sm font-medium">{currency(r.total_cents)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Main Page ----------------------------- */

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios
      .get(`/api/owner/projects/${id}`, { withCredentials: true })
      .then(({ data }) => {
        if (!alive) return;
        setProject(data.project);
        setParticipants(data.participants || []);
        setPhases(data.phases || []);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.error || 'Failed to load project');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const handleProjectUpdate = (updated) => {
    setProject((prev) => ({ ...prev, ...updated }));
  };

  const handleParticipantsChange = (updated) => {
    setParticipants(updated);
  };

  const handlePhasesChange = (updated) => {
    setPhases(updated);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => navigate('/app/projects')}
          className="mt-4 text-amber-600 hover:underline"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  if (!project) return null;

  const isPrime = project.access_type === 'prime';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app/projects')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            {project.customer?.name && (
              <>
                <Building2 className="w-4 h-4" />
                <span>{project.customer.name}</span>
              </>
            )}
            {project.property?.address && (
              <>
                <span className="mx-2">|</span>
                <MapPin className="w-4 h-4" />
                <span>{project.property.address}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1 overflow-x-auto">
        <Tab active={tab === 'overview'} onClick={() => setTab('overview')}>
          Overview
        </Tab>
        <Tab
          active={tab === 'participants'}
          onClick={() => setTab('participants')}
          badge={participants.length}
        >
          Participants
        </Tab>
        <Tab active={tab === 'phases'} onClick={() => setTab('phases')} badge={phases.length}>
          Phases
        </Tab>
        <Tab active={tab === 'records'} onClick={() => setTab('records')}>
          Service Records
        </Tab>
      </div>

      {/* Tab Content */}
      <div className="pb-8">
        {tab === 'overview' && (
          <OverviewTab project={project} onUpdate={handleProjectUpdate} />
        )}
        {tab === 'participants' && (
          <ProjectParticipants
            projectId={project.id}
            participants={participants}
            onChange={handleParticipantsChange}
            isPrime={isPrime}
          />
        )}
        {tab === 'phases' && (
          <ProjectPhases
            projectId={project.id}
            phases={phases}
            onChange={handlePhasesChange}
            isPrime={isPrime}
          />
        )}
        {tab === 'records' && <ServiceRecordsTab projectId={project.id} />}
      </div>
    </div>
  );
}
