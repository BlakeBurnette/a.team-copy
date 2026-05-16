// src/pages/ProjectWork.jsx
// View and log work on a project as a Sub/Participant

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  ClipboardList,
  FileText,
  Plus,
  Clock,
  DollarSign,
  Send,
  CheckCircle,
} from 'lucide-react';

/* ----------------------------- UI Components ----------------------------- */

const Badge = ({ tone = 'gray', children }) => {
  const tones = {
    gray: 'bg-gray-50 border border-gray-200 text-gray-700',
    green: 'bg-green-50 border border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border border-blue-200 text-blue-700',
    red: 'bg-red-50 border border-red-200 text-red-700',
    purple: 'bg-purple-50 border border-purple-200 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-amber-500 text-amber-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
);

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function currency(cents) {
  const n = Number(cents || 0);
  return `$${(n / 100).toFixed(2)}`;
}

/* ----------------------------- Log Work Modal ----------------------------- */

function LogWorkModal({ open, onClose, projectId, phases, onLogged }) {
  const [phaseId, setPhaseId] = useState('');
  const [notes, setNotes] = useState('');
  const [subtotalDollars, setSubtotalDollars] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await axios.post(
        `/api/owner/participating/${projectId}/service-records`,
        {
          phase_id: phaseId ? Number(phaseId) : null,
          notes: notes.trim() || null,
          subtotal_cents: subtotalDollars ? Math.round(Number(subtotalDollars) * 100) : 0,
          started_at: startedAt || new Date().toISOString(),
          completed_at: completedAt || null,
        },
        { withCredentials: true }
      );
      onLogged(data.service_record);
      onClose();
      // Reset
      setPhaseId('');
      setNotes('');
      setSubtotalDollars('');
      setStartedAt('');
      setCompletedAt('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log work');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Log Work</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
          )}

          {phases.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phase (optional)
              </label>
              <select
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">No specific phase</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Description
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Describe the work completed..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              value={subtotalDollars}
              onChange={(e) => setSubtotalDollars(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Started
              </label>
              <input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completed
              </label>
              <input
                type="datetime-local"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
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
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {busy ? 'Saving...' : 'Log Work'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------- Invoice Modal ----------------------------- */

function InvoiceModal({ open, onClose, projectId, serviceRecords, onCreated }) {
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [subtotalDollars, setSubtotalDollars] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const uninvoicedRecords = serviceRecords.filter((r) => !r.invoice_id);

  const toggleRecord = (id) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const calculatedTotal = selectedRecords.reduce((sum, id) => {
    const r = uninvoicedRecords.find((sr) => sr.service_record_id === id);
    return sum + (r?.total_cents || 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedRecords.length === 0 && !subtotalDollars) {
      setError('Select service records or enter an amount');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await axios.post(
        `/api/owner/participating/${projectId}/invoice`,
        {
          service_record_ids: selectedRecords,
          subtotal_cents: subtotalDollars
            ? Math.round(Number(subtotalDollars) * 100)
            : undefined,
          notes: notes.trim() || null,
          due_date: dueDate || null,
        },
        { withCredentials: true }
      );
      onCreated(data.invoice);
      onClose();
      setSelectedRecords([]);
      setSubtotalDollars('');
      setNotes('');
      setDueDate('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invoice Prime</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
          )}

          {uninvoicedRecords.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Service Records
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {uninvoicedRecords.map((r) => (
                  <label
                    key={r.service_record_id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(r.service_record_id)}
                      onChange={() => toggleRecord(r.service_record_id)}
                      className="rounded"
                    />
                    <span className="flex-1 text-sm">
                      {formatDate(r.created_at)} - {r.notes?.slice(0, 50) || 'Work logged'}
                    </span>
                    <span className="text-sm font-medium">{currency(r.total_cents)}</span>
                  </label>
                ))}
              </div>
              {selectedRecords.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected total: <strong>{currency(calculatedTotal)}</strong>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or enter custom amount ($)
            </label>
            <input
              type="number"
              value={subtotalDollars}
              onChange={(e) => setSubtotalDollars(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Invoice notes..."
            />
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
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {busy ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------- Main Page ----------------------------- */

export default function ProjectWork() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [participation, setParticipation] = useState(null);
  const [phases, setPhases] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [showLogWork, setShowLogWork] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      axios.get(`/api/owner/participating/${projectId}`, { withCredentials: true }),
      axios.get(`/api/owner/participating/${projectId}/invoices`, { withCredentials: true }),
    ])
      .then(([projRes, invRes]) => {
        if (!alive) return;
        setProject(projRes.data.project);
        setParticipation(projRes.data.participation);
        setPhases(projRes.data.phases || []);
        setServiceRecords(projRes.data.my_service_records || []);
        setInvoices(invRes.data?.invoices || []);
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
  }, [projectId]);

  const handleWorkLogged = (record) => {
    setServiceRecords((prev) => [record, ...prev]);
  };

  const handleInvoiceCreated = (invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
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
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => navigate('/app/participating')}
          className="mt-4 text-amber-600 hover:underline"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app/participating')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Building2 className="w-4 h-4" />
            <span>Prime: {project.prime_org_name}</span>
            <span className="mx-2">|</span>
            <Badge tone="purple">{participation?.role}</Badge>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowLogWork(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
        >
          <Plus className="w-4 h-4" />
          Log Work
        </button>
        <button
          onClick={() => setShowInvoice(true)}
          className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
        >
          <DollarSign className="w-4 h-4" />
          Invoice Prime
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1">
        <Tab active={tab === 'overview'} onClick={() => setTab('overview')}>
          Overview
        </Tab>
        <Tab active={tab === 'work'} onClick={() => setTab('work')}>
          My Work ({serviceRecords.length})
        </Tab>
        <Tab active={tab === 'invoices'} onClick={() => setTab('invoices')}>
          Invoices ({invoices.length})
        </Tab>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Project Details</h2>
            <div className="space-y-3 text-sm">
              {project.description && (
                <p className="text-gray-600">{project.description}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <Badge tone="blue" className="ml-2">
                    {project.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium">{project.project_type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <span className="ml-2 font-medium">{project.customer_name}</span>
                </div>
                {project.property_address && (
                  <div>
                    <span className="text-gray-500">Property:</span>
                    <span className="ml-2 font-medium">{project.property_address}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Start:</span>
                  <span className="ml-2">{formatDate(project.start_date)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Target End:</span>
                  <span className="ml-2">{formatDate(project.target_end_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {participation?.budget_allocation && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Your Budget Allocation</span>
              </div>
              <p className="text-2xl font-bold">
                {currency(participation.budget_allocation * 100)}
              </p>
            </div>
          )}

          {phases.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-400" />
                Project Phases
              </h2>
              <div className="space-y-2">
                {phases.map((phase) => (
                  <div
                    key={phase.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {phase.phase_order + 1}
                      </div>
                      <span className="font-medium">{phase.name}</span>
                    </div>
                    <Badge
                      tone={phase.status === 'approved' ? 'green' : 'gray'}
                    >
                      {phase.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'work' && (
        <div className="space-y-3">
          {serviceRecords.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No work logged yet.</p>
              <button
                onClick={() => setShowLogWork(true)}
                className="mt-4 text-amber-600 hover:underline"
              >
                Log your first work entry
              </button>
            </div>
          ) : (
            serviceRecords.map((r) => (
              <div key={r.service_record_id} className="bg-white border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {formatDate(r.created_at)}
                      </span>
                      {r.phase_name && (
                        <Badge tone="blue">{r.phase_name}</Badge>
                      )}
                    </div>
                    {r.notes && <p className="mt-2 text-gray-700">{r.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{currency(r.total_cents)}</p>
                    <Badge tone={r.status === 'completed' ? 'green' : 'yellow'}>
                      {r.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-lg">
              <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No invoices created yet.</p>
              <button
                onClick={() => setShowInvoice(true)}
                className="mt-4 text-amber-600 hover:underline"
              >
                Create your first invoice
              </button>
            </div>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">Invoice #{inv.id}</p>
                    <p className="text-sm text-gray-500">
                      Created {formatDate(inv.created_at)}
                    </p>
                    {inv.notes && (
                      <p className="mt-2 text-sm text-gray-600">{inv.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{currency(inv.total_cents)}</p>
                    <Badge
                      tone={
                        inv.status === 'paid'
                          ? 'green'
                          : inv.status === 'sent'
                          ? 'blue'
                          : 'yellow'
                      }
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <LogWorkModal
        open={showLogWork}
        onClose={() => setShowLogWork(false)}
        projectId={projectId}
        phases={phases}
        onLogged={handleWorkLogged}
      />

      <InvoiceModal
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        projectId={projectId}
        serviceRecords={serviceRecords}
        onCreated={handleInvoiceCreated}
      />
    </div>
  );
}
