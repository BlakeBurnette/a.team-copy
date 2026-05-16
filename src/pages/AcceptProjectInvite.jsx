// src/pages/AcceptProjectInvite.jsx
// Public-ish page to view and accept/decline a project invitation

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FolderKanban,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Briefcase,
} from 'lucide-react';

/* ----------------------------- UI Components ----------------------------- */

const Badge = ({ tone = 'gray', children }) => {
  const tones = {
    gray: 'bg-gray-50 border border-gray-200 text-gray-700',
    green: 'bg-green-50 border border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border border-purple-200 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function currency(value) {
  const n = Number(value || 0);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ----------------------------- Main Page ----------------------------- */

export default function AcceptProjectInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [result, setResult] = useState(null); // 'accepted' | 'declined'

  useEffect(() => {
    let alive = true;
    setLoading(true);

    axios
      .get(`/api/owner/project-invites/${token}`, { withCredentials: true })
      .then(({ data }) => {
        if (!alive) return;
        setInvite(data.invite);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        const msg = err.response?.data?.error || 'Failed to load invitation';
        setError(msg);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await axios.post(
        `/api/owner/project-invites/${token}/accept`,
        {},
        { withCredentials: true }
      );
      setResult('accepted');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await axios.post(
        `/api/owner/project-invites/${token}/decline`,
        { reason: declineReason.trim() || null },
        { withCredentials: true }
      );
      setResult('declined');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to decline invitation');
    } finally {
      setBusy(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/app')}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Result state (after accept/decline)
  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          {result === 'accepted' ? (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Accepted!</h1>
              <p className="text-gray-600 mb-6">
                You are now a participant on "{invite.project_name}". You can start
                logging work and invoicing the prime organization.
              </p>
              <button
                onClick={() => navigate('/app/participating')}
                className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
              >
                View My Projects
              </button>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Declined</h1>
              <p className="text-gray-600 mb-6">
                You have declined the invitation to join "{invite.project_name}".
              </p>
              <button
                onClick={() => navigate('/app')}
                className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
              >
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Invitation view
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Project Invitation</h1>
          <p className="text-gray-600 mt-2">
            You've been invited to participate in a project
          </p>
        </div>

        {/* Invitation Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Project Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <h2 className="text-xl font-bold">{invite.project_name}</h2>
            <div className="flex items-center gap-2 mt-2 text-white/90">
              <Building2 className="w-4 h-4" />
              <span>From: {invite.prime_org_name}</span>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {/* Your Organization */}
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <p className="text-sm text-purple-700 font-medium">Invited Organization</p>
              <p className="text-lg font-semibold text-purple-900">{invite.sub_org_name}</p>
            </div>

            {/* Role */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Your Role</p>
                <p className="font-semibold capitalize">{invite.role}</p>
              </div>
            </div>

            {/* Budget Allocation */}
            {invite.budget_allocation && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Budget Allocation</p>
                  <p className="font-semibold">{currency(invite.budget_allocation)}</p>
                </div>
              </div>
            )}

            {/* Property */}
            {invite.property_address && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Property</p>
                  <p className="font-medium">{invite.property_address}</p>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {invite.start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Start</p>
                    <p className="text-sm font-medium">{formatDate(invite.start_date)}</p>
                  </div>
                </div>
              )}
              {invite.target_end_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Target End</p>
                    <p className="text-sm font-medium">{formatDate(invite.target_end_date)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {invite.project_description && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-1">Project Description</p>
                <p className="text-gray-700">{invite.project_description}</p>
              </div>
            )}

            {/* Expiration */}
            {invite.invite_expires_at && (
              <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3">
                <Clock className="w-4 h-4" />
                <span>Expires {formatDate(invite.invite_expires_at)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t p-6">
            {showDeclineForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for declining (optional)
                  </label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    placeholder="Let them know why you can't participate..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeclineForm(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDecline}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {busy ? 'Declining...' : 'Confirm Decline'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeclineForm(true)}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {busy ? 'Accepting...' : 'Accept Invitation'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Questions? Contact{' '}
          <a href={`mailto:${invite.prime_org_email}`} className="text-amber-600 hover:underline">
            {invite.prime_org_name}
          </a>
        </p>
      </div>
    </div>
  );
}
