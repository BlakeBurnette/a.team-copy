// src/components/owner/ProjectPhases.jsx
// Component for managing project phases (milestones/draw schedule)

import React, { useState } from 'react';
import axios from 'axios';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  PlayCircle,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
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
    orange: 'bg-orange-50 border border-orange-200 text-orange-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'approved') return 'green';
  if (s === 'in_progress') return 'blue';
  if (s === 'awaiting_inspection') return 'yellow';
  return 'gray';
}

function statusIcon(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'approved') {
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
  if (s === 'in_progress') {
    return <PlayCircle className="w-5 h-5 text-blue-500" />;
  }
  if (s === 'awaiting_inspection') {
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  }
  return <Clock className="w-5 h-5 text-gray-400" />;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function currency(value) {
  const n = Number(value || 0);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ----------------------------- Add/Edit Modal ----------------------------- */

function PhaseModal({ open, onClose, projectId, phase, onSaved }) {
  const isEdit = !!phase;
  const [form, setForm] = useState({
    name: phase?.name || '',
    description: phase?.description || '',
    phase_order: phase?.phase_order ?? '',
    budget_amount: phase?.budget_amount || '',
    budget_percentage: phase?.budget_percentage || '',
    start_date: phase?.start_date?.split('T')[0] || '',
    target_end_date: phase?.target_end_date?.split('T')[0] || '',
    inspection_required: phase?.inspection_required || false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Phase name is required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        phase_order: form.phase_order !== '' ? Number(form.phase_order) : undefined,
        budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
        budget_percentage: form.budget_percentage ? Number(form.budget_percentage) : null,
        start_date: form.start_date || null,
        target_end_date: form.target_end_date || null,
        inspection_required: form.inspection_required,
      };

      let data;
      if (isEdit) {
        const res = await axios.patch(
          `/api/owner/projects/${projectId}/phases/${phase.id}`,
          payload,
          { withCredentials: true }
        );
        data = res.data;
      } else {
        const res = await axios.post(`/api/owner/projects/${projectId}/phases`, payload, {
          withCredentials: true,
        });
        data = res.data;
      }
      onSaved(data, isEdit);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save phase');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Phase' : 'Add Phase'}
          </h2>
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
              Phase Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Foundation, Framing, Rough-in"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Phase details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <input
                type="number"
                value={form.phase_order}
                onChange={(e) => setForm({ ...form, phase_order: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                min="0"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget ($)
              </label>
              <input
                type="number"
                value={form.budget_amount}
                onChange={(e) => setForm({ ...form, budget_amount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target End
              </label>
              <input
                type="date"
                value={form.target_end_date}
                onChange={(e) => setForm({ ...form, target_end_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="inspection_required"
              checked={form.inspection_required}
              onChange={(e) => setForm({ ...form, inspection_required: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="inspection_required" className="text-sm text-gray-700">
              Inspection required before approval
            </label>
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
              {busy ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Phase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------- Approve Modal ----------------------------- */

function ApproveModal({ open, onClose, phase, projectId, onApproved }) {
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionPassed, setInspectionPassed] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleApprove = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(
        `/api/owner/projects/${projectId}/phases/${phase.id}/approve`,
        {
          inspection_notes: inspectionNotes.trim() || null,
          inspection_passed: inspectionPassed,
        },
        { withCredentials: true }
      );
      onApproved(data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve phase');
    } finally {
      setBusy(false);
    }
  };

  if (!open || !phase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Approve Phase: {phase.name}</h2>
        </div>
        <div className="p-6 space-y-4">
          {phase.inspection_required && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inspection_passed"
                checked={inspectionPassed}
                onChange={(e) => setInspectionPassed(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="inspection_passed" className="text-sm text-gray-700">
                Inspection passed
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Any notes about the approval or inspection..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {busy ? 'Approving...' : 'Approve Phase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Phase Card ----------------------------- */

function PhaseCard({ phase, isPrime, projectId, onEdit, onDelete, onApprove }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this phase?')) return;
    setBusy(true);
    try {
      await onDelete(phase.id);
    } finally {
      setBusy(false);
    }
  };

  const canApprove =
    isPrime &&
    (phase.status === 'in_progress' || phase.status === 'awaiting_inspection');

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
          {phase.phase_order + 1}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {statusIcon(phase.status)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{phase.name}</h3>
        </div>
        <Badge tone={statusTone(phase.status)}>
          {(phase.status || 'pending').replace(/_/g, ' ')}
        </Badge>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t pt-4 space-y-3">
          {phase.description && (
            <p className="text-sm text-gray-600">{phase.description}</p>
          )}

          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {phase.budget_amount && (
              <div>
                <span className="text-gray-500">Budget:</span>
                <span className="ml-2 font-medium">{currency(phase.budget_amount)}</span>
              </div>
            )}
            {phase.budget_percentage && (
              <div>
                <span className="text-gray-500">Percentage:</span>
                <span className="ml-2 font-medium">{phase.budget_percentage}%</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Start:</span>
              <span className="ml-2">{formatDate(phase.start_date)}</span>
            </div>
            <div>
              <span className="text-gray-500">Target:</span>
              <span className="ml-2">{formatDate(phase.target_end_date)}</span>
            </div>
          </div>

          {phase.inspection_required && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-600">Inspection required</span>
              {phase.inspection_passed_at && (
                <Badge tone="green">Passed {formatDate(phase.inspection_passed_at)}</Badge>
              )}
            </div>
          )}

          {phase.approved_at && (
            <div className="text-sm text-green-600">
              Approved {formatDate(phase.approved_at)}
              {phase.approved_by_name && ` by ${phase.approved_by_name}`}
            </div>
          )}

          {phase.inspection_notes && (
            <div className="text-sm">
              <span className="text-gray-500">Notes:</span>
              <p className="mt-1 text-gray-600">{phase.inspection_notes}</p>
            </div>
          )}

          {isPrime && (
            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              {canApprove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(phase);
                  }}
                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(phase);
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={busy}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Main Component ----------------------------- */

export default function ProjectPhases({ projectId, phases, onChange, isPrime }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [approvingPhase, setApprovingPhase] = useState(null);

  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);

  const handleSaved = (savedPhase, isEdit) => {
    if (isEdit) {
      onChange(phases.map((p) => (p.id === savedPhase.id ? savedPhase : p)));
    } else {
      onChange([...phases, savedPhase]);
    }
    setEditingPhase(null);
  };

  const handleDelete = async (phaseId) => {
    try {
      await axios.delete(`/api/owner/projects/${projectId}/phases/${phaseId}`, {
        withCredentials: true,
      });
      onChange(phases.filter((p) => p.id !== phaseId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete phase');
    }
  };

  const handleApproved = (approvedPhase) => {
    onChange(phases.map((p) => (p.id === approvedPhase.id ? approvedPhase : p)));
    setApprovingPhase(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-gray-400" />
          Phases ({phases.length})
        </h2>
        {isPrime && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            <Plus className="w-4 h-4" />
            Add Phase
          </button>
        )}
      </div>

      {/* Phase List */}
      {sortedPhases.length === 0 ? (
        <div className="text-center py-12 bg-white border rounded-lg">
          <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No phases defined yet.</p>
          {isPrime && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-amber-600 hover:underline"
            >
              Add your first phase
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPhases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              isPrime={isPrime}
              projectId={projectId}
              onEdit={(p) => {
                setEditingPhase(p);
                setShowModal(true);
              }}
              onDelete={handleDelete}
              onApprove={(p) => setApprovingPhase(p)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <PhaseModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPhase(null);
        }}
        projectId={projectId}
        phase={editingPhase}
        onSaved={handleSaved}
      />

      {/* Approve Modal */}
      <ApproveModal
        open={!!approvingPhase}
        onClose={() => setApprovingPhase(null)}
        phase={approvingPhase}
        projectId={projectId}
        onApproved={handleApproved}
      />
    </div>
  );
}
