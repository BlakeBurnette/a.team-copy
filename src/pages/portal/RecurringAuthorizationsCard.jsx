// src/pages/portal/RecurringAuthorizationsCard.jsx
import React, { useEffect, useState } from 'react';
import { Shield, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Toast from '../../components/Toast';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function RecurringAuthorizationsCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorizations, setAuthorizations] = useState([]);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', duration: 2500 });

  const showToast = (message, duration = 2500) =>
    setToast({ show: true, message, duration });

  useEffect(() => {
    loadAuthorizations();
  }, []);

  const loadAuthorizations = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/customers/me/authorizations/recurring', {
        withCredentials: true,
        validateStatus: (s) => s < 500, // Don't throw on 404
      });
      // If endpoint doesn't exist yet, just show empty state
      setAuthorizations(data?.authorizations || []);
    } catch (err) {
      // Gracefully handle missing endpoint
      setAuthorizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeClick = (auth) => {
    setSelectedAuth(auth);
    setShowRevokeModal(true);
  };

  const confirmRevoke = async () => {
    if (!selectedAuth) return;

    setRevoking(true);
    try {
      await axios.post('/api/approvals/revoke', {
        approval_id: selectedAuth.id,
      }, {
        withCredentials: true,
      });

      showToast('Authorization revoked successfully');
      setShowRevokeModal(false);
      setSelectedAuth(null);
      await loadAuthorizations(); // Refresh list
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to revoke authorization', 3000);
    } finally {
      setRevoking(false);
    }
  };

  const cancelRevoke = () => {
    setShowRevokeModal(false);
    setSelectedAuth(null);
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="text-neutral-600">Loading authorizations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  const hasAuthorizations = authorizations.length > 0;

  return (
    <>
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast(t => ({ ...t, show: false }))}
      >
        {toast.message}
      </Toast>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-neutral-50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-neutral-700" />
            <h2 className="text-lg font-semibold text-neutral-900">Recurring Authorizations</h2>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            Manage your recurring service payment authorizations
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!hasAuthorizations ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Active Authorizations</h3>
              <p className="text-neutral-600">
                You don't have any active recurring payment authorizations at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {authorizations.map((auth) => (
                <div
                  key={auth.id}
                  className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-900">{auth.service_name}</h3>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-neutral-700">
                          <span className="font-medium">Amount:</span> ${auth.amount}
                        </p>
                        <p className="text-neutral-700">
                          <span className="font-medium">Authorized:</span> {formatDate(auth.authorized_date)}
                        </p>
                        {auth.services_count > 0 && (
                          <p className="text-neutral-600">
                            {auth.services_count} service{auth.services_count !== 1 ? 's' : ''} completed
                            {auth.last_service_date && ` (last: ${formatDate(auth.last_service_date)})`}
                          </p>
                        )}
                      </div>

                      {/* Authorization Language Preview */}
                      {auth.authorization_language && (
                        <details className="mt-3">
                          <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                            View Authorization Language
                          </summary>
                          <div className="mt-2 p-3 bg-neutral-50 rounded text-xs text-neutral-700 border border-neutral-200">
                            {auth.authorization_language}
                          </div>
                        </details>
                      )}
                    </div>

                    <div className="ml-4">
                      {auth.can_revoke ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeClick(auth)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Revoke
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-500">
                          <AlertCircle className="w-4 h-4" />
                          Cannot revoke
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Revocation Confirmation Modal */}
      {showRevokeModal && selectedAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900">Revoke Authorization?</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  You're about to revoke your recurring payment authorization for:
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 border rounded-lg p-4 mb-4">
              <p className="font-semibold text-neutral-900">{selectedAuth.service_name}</p>
              <p className="text-sm text-neutral-700 mt-1">${selectedAuth.amount} per service</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> Revoking this authorization will:
              </p>
              <ul className="text-sm text-amber-800 mt-2 ml-4 list-disc space-y-1">
                <li>Cancel all future scheduled services under this authorization</li>
                <li>Prevent automatic charges for this service</li>
                <li>Require re-authorization if you want to resume services</li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={cancelRevoke}
                disabled={revoking}
                className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevoke}
                disabled={revoking}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {revoking ? 'Revoking...' : 'Revoke Authorization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
