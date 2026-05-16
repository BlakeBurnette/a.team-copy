// src/pages/ARDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertCircle, DollarSign, Calendar, User, CheckCircle, Flag, Clock } from 'lucide-react';
import axios from 'axios';
import Toast from '../components/Toast';
import { useUserProfile } from '../context/AuthContext';

const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  } catch {
    return dateStr;
  }
};

const getFailureTypeBadgeColor = (type) => {
  switch (type) {
    case 'nsf':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'dispute':
    case 'chargeback':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'payment_failed':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  }
};

const formatFailureType = (type) => {
  switch (type) {
    case 'nsf':
      return 'Insufficient Funds';
    case 'dispute':
      return 'Disputed';
    case 'chargeback':
      return 'Chargeback';
    case 'payment_failed':
      return 'Payment Failed';
    default:
      return type;
  }
};

export default function ARDashboard({ embedded = false }) {
  const navigate = useNavigate();
  const { profile, user, roles: roleList } = useUserProfile();

  // Determine user role
  const role = (profile?.role || user?.role || (Array.isArray(roleList) ? roleList[0] : '') || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isOwner = role === 'owner';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [toast, setToast] = useState({ show: false, message: '', duration: 2400 });

  const showToast = (msg, duration = 2400) => setToast({ show: true, message: msg, duration });

  const loadAR = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: arData } = await axios.get('/api/accounts-receivable', {
        withCredentials: true,
      });
      setData(arData);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load accounts receivable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAR();
  }, [loadAR]);

  const handleRetryPayment = async (arId) => {
    setProcessingIds(prev => new Set(prev).add(arId));
    try {
      const { data: result } = await axios.post(`/api/accounts-receivable/${arId}/retry`, {}, {
        withCredentials: true,
      });

      if (result.payment_status === 'succeeded') {
        showToast('Payment successful!');
        await loadAR(); // Reload list
      } else {
        showToast('Payment retry failed. Customer notified.', 3000);
      }
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to retry payment', 3000);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(arId);
        return next;
      });
    }
  };

  const handleSendReminder = async (arId) => {
    setProcessingIds(prev => new Set(prev).add(arId));
    try {
      await axios.post(`/api/accounts-receivable/${arId}/remind`, {}, {
        withCredentials: true,
      });
      showToast('Reminder sent to customer');
      await loadAR();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to send reminder', 3000);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(arId);
        return next;
      });
    }
  };

  const handleResolve = async (arId) => {
    const resolution = prompt('Resolve as: paid, waived, or written_off');
    if (!resolution || !['paid', 'waived', 'written_off'].includes(resolution)) {
      showToast('Invalid resolution method');
      return;
    }

    const notes = prompt('Resolution notes (optional):');

    setProcessingIds(prev => new Set(prev).add(arId));
    try {
      await axios.post(`/api/accounts-receivable/${arId}/resolve`, {
        resolution_method: resolution,
        notes: notes || undefined,
      }, {
        withCredentials: true,
      });
      showToast('A/R item resolved');
      await loadAR();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to resolve', 3000);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(arId);
        return next;
      });
    }
  };

  const handleFlag = async (arId) => {
    const reason = prompt('Why does this need admin review?');
    if (!reason) {
      showToast('Flag reason is required');
      return;
    }

    setProcessingIds(prev => new Set(prev).add(arId));
    try {
      await axios.post(`/api/accounts-receivable/${arId}/flag`, {
        reason,
        priority: 'normal',
      }, {
        withCredentials: true,
      });
      showToast('Flagged for admin review');
      await loadAR();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to flag', 3000);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(arId);
        return next;
      });
    }
  };

  const totalOutstanding = data?.total_outstanding_cents ? (data.total_outstanding_cents / 100).toFixed(2) : '0.00';
  const hasOutstanding = data?.outstanding && data.outstanding.length > 0;

  return (
    <div className={embedded ? 'space-y-4' : 'p-4 md:p-6 space-y-4'}>
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast(t => ({ ...t, show: false }))}
      >
        {toast.message}
      </Toast>

      {/* Header - hidden when embedded */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Accounts Receivable</h1>
            <p className="text-sm text-neutral-600 mt-1">
              Outstanding payments requiring collection
            </p>
          </div>
          <button
            type="button"
            onClick={loadAR}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {/* Refresh button when embedded */}
      {embedded && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={loadAR}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {/* Alert Banner */}
      {hasOutstanding && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                {data.outstanding.length} Outstanding Payment{data.outstanding.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Total: ${totalOutstanding} needs collection
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aging Breakdown - for owner visibility */}
      {hasOutstanding && data?.aging && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 text-neutral-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">0-7 Days</span>
            </div>
            <p className="text-lg font-bold text-neutral-900">
              ${((data.aging.current?.total_cents || 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-neutral-500">{data.aging.current?.count || 0} items</p>
          </div>
          <div className="bg-white border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-700 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">8-14 Days</span>
            </div>
            <p className="text-lg font-bold text-yellow-700">
              ${((data.aging.week?.total_cents || 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-yellow-600">{data.aging.week?.count || 0} items</p>
          </div>
          <div className="bg-white border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-orange-700 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">15-30 Days</span>
            </div>
            <p className="text-lg font-bold text-orange-700">
              ${((data.aging.twoWeeks?.total_cents || 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-orange-600">{data.aging.twoWeeks?.count || 0} items</p>
          </div>
          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">30+ Days</span>
            </div>
            <p className="text-lg font-bold text-red-700">
              ${((data.aging.month?.total_cents || 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-red-600">{data.aging.month?.count || 0} items</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="py-12 text-center text-neutral-600">
          Loading accounts receivable...
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !hasOutstanding && (
        <div className="bg-white border rounded-xl shadow-sm p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">All Caught Up!</h3>
          <p className="text-neutral-600">No outstanding payments at this time.</p>
        </div>
      )}

      {/* A/R Table */}
      {hasOutstanding && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-700">Customer</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-700">Amount</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-700">Reason</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-700">Days Out</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-700">Last Contact</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.outstanding.map((item) => {
                  const isProcessing = processingIds.has(item.id);
                  const isUrgent = item.days_outstanding > 7;

                  return (
                    <tr key={item.id} className={isUrgent ? 'bg-red-50' : ''}>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-neutral-900">{item.customer_name}</p>
                          <p className="text-sm text-neutral-600">{item.customer_email}</p>
                          {item.customer_phone && (
                            <p className="text-sm text-neutral-500">{item.customer_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-lg">
                          ${(item.amount_cents / 100).toFixed(2)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getFailureTypeBadgeColor(item.failure_type)}`}
                          >
                            {formatFailureType(item.failure_type)}
                          </div>
                          <p className="text-xs text-neutral-600">{item.failure_reason}</p>
                          {/* Retry attempts badge */}
                          {typeof item.retry_attempts === 'number' && (
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                  item.retry_attempts >= 3
                                    ? 'bg-red-100 text-red-800'
                                    : item.retry_attempts >= 2
                                    ? 'bg-orange-100 text-orange-800'
                                    : item.retry_attempts >= 1
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                Retries: {item.retry_attempts}/3
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={isUrgent ? 'text-red-600 font-bold' : 'text-neutral-700'}>
                          {item.days_outstanding} days
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <p>{formatRelativeDate(item.last_outreach_at)}</p>
                          {item.next_outreach_at && (
                            <p className="text-xs text-neutral-600 mt-1">
                              Next: {formatRelativeDate(item.next_outreach_at)}
                            </p>
                          )}
                          <p className="text-xs text-neutral-500 mt-1">
                            Attempts: {item.outreach_count || 0}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Flagged indicator */}
                          {item.flagged && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              <Flag className="w-3 h-3" />
                              Flagged
                            </span>
                          )}

                          {/* Admin only: Retry */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRetryPayment(item.id)}
                              disabled={isProcessing || (item.retry_attempts >= 3)}
                              className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={item.retry_attempts >= 3 ? 'Maximum retry attempts reached (3/3)' : 'Retry payment'}
                            >
                              Retry
                            </button>
                          )}

                          {/* Owner & Admin: Remind */}
                          <button
                            type="button"
                            onClick={() => handleSendReminder(item.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-sm rounded-lg border hover:bg-neutral-50 disabled:opacity-50"
                          >
                            Remind
                          </button>

                          {/* Owner only: Flag for admin review */}
                          {isOwner && !item.flagged && (
                            <button
                              type="button"
                              onClick={() => handleFlag(item.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-sm rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Flag className="w-3 h-3" />
                              Escalate
                            </button>
                          )}

                          {/* Admin only: Resolve */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleResolve(item.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
