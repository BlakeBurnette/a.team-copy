// src/components/owner/ProjectParticipants.jsx
// Component for managing project participants (subs)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Plus,
  Building2,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  UserMinus,
  Send,
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

function statusIcon(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'accepted' || s === 'active' || s === 'completed') {
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  }
  if (s === 'declined' || s === 'removed') {
    return <XCircle className="w-4 h-4 text-red-500" />;
  }
  return <Clock className="w-4 h-4 text-yellow-500" />;
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'accepted' || s === 'active') return 'green';
  if (s === 'completed') return 'purple';
  if (s === 'declined' || s === 'removed') return 'red';
  return 'yellow';
}

function currency(value) {
  const n = Number(value || 0);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ----------------------------- Invite Modal ----------------------------- */

function InviteParticipantModal({ open, onClose, projectId, onInvited }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [role, setRole] = useState('');
  const [budgetAllocation, setBudgetAllocation] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Common sub roles
  const commonRoles = [
    'electrical',
    'plumbing',
    'hvac',
    'framing',
    'roofing',
    'flooring',
    'painting',
    'drywall',
    'landscaping',
    'cleaning',
    'staging',
    'inspection',
    'other',
  ];

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    // Fetch available organizations to invite
    axios
      .get('/api/admin/organizations', { withCredentials: true })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.organizations || [];
        setOrgs(list);
      })
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrgId || !role) {
      setError('Organization and role are required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await axios.post(
        `/api/owner/projects/${projectId}/participants`,
        {
          organization_id: Number(selectedOrgId),
          role,
          budget_allocation: budgetAllocation ? Number(budgetAllocation) : null,
          notes: notes.trim() || null,
        },
        { withCredentials: true }
      );
      onInvited(data);
      onClose();
      // Reset
      setSelectedOrgId('');
      setRole('');
      setBudgetAllocation('');
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invite');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invite Subcontractor</h2>
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
              Organization *
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              disabled={loading}
              required
            >
              <option value="">Select an organization...</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              The sub will receive an invitation to join this project
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role/Trade *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select a role...</option>
              {commonRoles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget Allocation ($)
            </label>
            <input
              type="number"
              value={budgetAllocation}
              onChange={(e) => setBudgetAllocation(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="0.00"
              step="0.01"
              min="0"
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
              placeholder="Any special instructions..."
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
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {busy ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------- Participant Card ----------------------------- */

function ParticipantCard({ participant, isPrime, onUpdate, onRemove }) {
  const [busy, setBusy] = useState(false);

  const handleRemove = async () => {
    if (!confirm('Remove this participant from the project?')) return;
    setBusy(true);
    try {
      await onRemove(participant.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {participant.organization_name || 'Unknown Organization'}
            </h3>
            <p className="text-sm text-gray-500 capitalize">{participant.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcon(participant.status)}
          <Badge tone={statusTone(participant.status)}>
            {participant.status}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
        {participant.organization_email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{participant.organization_email}</span>
          </div>
        )}
        {participant.organization_phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{participant.organization_phone}</span>
          </div>
        )}
      </div>

      {participant.budget_allocation && (
        <div className="mt-3 text-sm">
          <span className="text-gray-500">Budget:</span>
          <span className="ml-2 font-medium">{currency(participant.budget_allocation)}</span>
        </div>
      )}

      {participant.notes && (
        <p className="mt-2 text-sm text-gray-600">{participant.notes}</p>
      )}

      {isPrime && participant.status !== 'removed' && (
        <div className="mt-4 pt-3 border-t flex justify-end">
          <button
            onClick={handleRemove}
            disabled={busy}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <UserMinus className="w-4 h-4" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Main Component ----------------------------- */

export default function ProjectParticipants({ projectId, participants, onChange, isPrime }) {
  const [showInvite, setShowInvite] = useState(false);

  const handleInvited = (newParticipant) => {
    onChange([...participants, newParticipant]);
  };

  const handleRemove = async (participantId) => {
    try {
      await axios.delete(`/api/owner/projects/${projectId}/participants/${participantId}`, {
        withCredentials: true,
      });
      onChange(
        participants.map((p) =>
          p.id === participantId ? { ...p, status: 'removed' } : p
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove participant');
    }
  };

  const activeParticipants = participants.filter(
    (p) => p.status !== 'removed' && p.status !== 'declined'
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          Participants ({activeParticipants.length})
        </h2>
        {isPrime && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            <Plus className="w-4 h-4" />
            Invite Sub
          </button>
        )}
      </div>

      {/* List */}
      {participants.length === 0 ? (
        <div className="text-center py-12 bg-white border rounded-lg">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No participants yet.</p>
          {isPrime && (
            <button
              onClick={() => setShowInvite(true)}
              className="mt-4 text-amber-600 hover:underline"
            >
              Invite your first subcontractor
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {participants.map((p) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              isPrime={isPrime}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <InviteParticipantModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        projectId={projectId}
        onInvited={handleInvited}
      />
    </div>
  );
}
