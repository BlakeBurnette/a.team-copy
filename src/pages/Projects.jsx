// src/pages/Projects.jsx
// List of projects where the organization is the Prime/Coordinator

import React, { useEffect, useMemo, useState, useDeferredValue, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUserProfile } from '../context/AuthContext';
import {
  FolderKanban,
  Plus,
  Search,
  Building2,
  Calendar,
  Users,
  ChevronRight,
  MapPin,
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

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'green';
  if (s === 'planning') return 'blue';
  if (s === 'on_hold') return 'yellow';
  if (s === 'completed') return 'purple';
  if (s === 'cancelled') return 'red';
  return 'gray';
}

function typeTone(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'construction') return 'orange';
  if (t === 'renovation') return 'blue';
  if (t === 'prep') return 'purple';
  return 'gray';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
          {project.customer_name && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Building2 className="w-3.5 h-3.5" />
              {project.customer_name}
            </p>
          )}
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
        <Badge tone={statusTone(project.status)}>
          {(project.status || 'planning').replace(/_/g, ' ')}
        </Badge>
        <Badge tone={typeTone(project.project_type)}>
          {project.project_type || 'general'}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-3">
          {project.participant_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {project.participant_count} sub{project.participant_count !== 1 ? 's' : ''}
            </span>
          )}
          {project.phase_count > 0 && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {project.phase_count} phase{project.phase_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {project.start_date && (
          <span>{formatDate(project.start_date)}</span>
        )}
      </div>

      {project.total_budget && (
        <div className="mt-2 text-sm font-medium text-gray-700">
          Budget: {currency(project.total_budget * 100)}
        </div>
      )}
    </div>
  );
});

/* ----------------------------- Create Modal ----------------------------- */

function CreateProjectModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [projectType, setProjectType] = useState('general');
  const [description, setDescription] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingCustomers(true);
    axios
      .get('/api/owner/customers', { withCredentials: true })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.customers || [];
        setCustomers(list);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, [open]);

  useEffect(() => {
    if (!customerId) {
      setProperties([]);
      return;
    }
    axios
      .get(`/api/owner/customers/${customerId}/properties`, { withCredentials: true })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.properties || [];
        setProperties(list);
      })
      .catch(() => setProperties([]));
  }, [customerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !customerId) {
      setError('Name and customer are required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await axios.post(
        '/api/owner/projects',
        {
          name: name.trim(),
          customer_id: Number(customerId),
          property_id: propertyId ? Number(propertyId) : null,
          project_type: projectType,
          description: description.trim() || null,
          total_budget: totalBudget ? Number(totalBudget) : null,
          start_date: startDate || null,
          target_end_date: targetEndDate || null,
        },
        { withCredentials: true }
      );
      onCreated(data);
      onClose();
      // Reset form
      setName('');
      setCustomerId('');
      setPropertyId('');
      setProjectType('general');
      setDescription('');
      setTotalBudget('');
      setStartDate('');
      setTargetEndDate('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Kitchen Renovation - 123 Main St"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              disabled={loadingCustomers}
              required
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.email}
                </option>
              ))}
            </select>
          </div>

          {properties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property (optional)
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select a property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.street}, {p.city}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Type
            </label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="general">General</option>
              <option value="construction">Construction</option>
              <option value="renovation">Renovation</option>
              <option value="prep">Prep (Staging/Cleaning)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Project details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Budget ($)
            </label>
            <input
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target End Date
              </label>
              <input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
            >
              {busy ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------- Main Page ----------------------------- */

export default function Projects() {
  const { profile } = useUserProfile();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const searchQ = useDeferredValue(search);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('project_type', typeFilter);

    axios
      .get(`/api/owner/projects?${params.toString()}`, { withCredentials: true })
      .then(({ data }) => {
        if (!alive) return;
        setProjects(data?.projects || []);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.error || 'Failed to load projects');
        setProjects([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [statusFilter, typeFilter]);

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return projects;
    const q = searchQ.toLowerCase();
    return projects.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q) ||
        (p.property_address || '').toLowerCase().includes(q)
    );
  }, [projects, searchQ]);

  const handleCreated = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

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
          <option value="">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Types</option>
          <option value="general">General</option>
          <option value="construction">Construction</option>
          <option value="renovation">Renovation</option>
          <option value="prep">Prep</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading projects...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {projects.length === 0
              ? 'No projects yet. Create one to get started!'
              : 'No projects match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/app/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
