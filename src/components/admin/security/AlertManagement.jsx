// src/components/admin/security/AlertManagement.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { getAlerts, acknowledgeAlert, resolveAlert, markAlertFalsePositive } from '../../../api/securityDashboard';
import Modal from '../../Modal';

const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
  },
  high: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
  },
};

const STATUS_STYLES = {
  pending: { badge: 'bg-amber-100 text-amber-800', icon: Clock },
  acknowledged: { badge: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  resolved: { badge: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  false_positive: { badge: 'bg-neutral-100 text-neutral-600', icon: XCircle },
};

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

function AlertCard({ alert, onAcknowledge, onResolve, onFalsePositive, actionLoading }) {
  const [expanded, setExpanded] = useState(false);

  const severity = (alert.severity || 'medium').toLowerCase();
  const status = (alert.status || 'pending').toLowerCase();
  const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium;
  const statusStyles = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const StatusIcon = statusStyles.icon;

  return (
    <div className={`rounded-xl border p-4 ${styles.bg} ${styles.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${styles.badge}`}>
              {severity}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${statusStyles.badge}`}>
              <StatusIcon className="w-3 h-3" />
              {status.replace('_', ' ')}
            </span>
          </div>
          <h3 className={`text-sm font-semibold mt-2 ${styles.text}`}>
            {alert.title || alert.event_type || 'Security Alert'}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            {alert.message || alert.description || 'No description available'}
          </p>
          <div className="text-xs text-neutral-500 mt-2">
            {fmtDateTime(alert.created_at || alert.timestamp)}
            {alert.user_email && ` • ${alert.user_email}`}
            {alert.ip_address && ` • IP: ${alert.ip_address}`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg border bg-white hover:bg-neutral-50"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
          {/* Alert details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-neutral-500">Event Type</div>
              <div className="font-medium">{alert.event_type || 'N/A'}</div>
            </div>
            <div>
              <div className="text-neutral-500">Category</div>
              <div className="font-medium">{alert.category || 'N/A'}</div>
            </div>
            {alert.org_id && (
              <div>
                <div className="text-neutral-500">Organization</div>
                <div className="font-medium">{alert.org_id}</div>
              </div>
            )}
            {alert.user_id && (
              <div>
                <div className="text-neutral-500">User ID</div>
                <div className="font-medium">{alert.user_id}</div>
              </div>
            )}
          </div>

          {/* Metadata */}
          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
            <div>
              <div className="text-sm text-neutral-500 mb-1">Additional Details</div>
              <pre className="text-xs bg-white rounded-lg p-2 overflow-x-auto border">
                {JSON.stringify(alert.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          {status === 'pending' && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onAcknowledge(alert.id)}
                disabled={actionLoading === alert.id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === alert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Acknowledge
              </button>
              <button
                type="button"
                onClick={() => onResolve(alert.id)}
                disabled={actionLoading === alert.id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={() => onFalsePositive(alert.id)}
                disabled={actionLoading === alert.id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-neutral-700 text-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                False Positive
              </button>
            </div>
          )}
          {status === 'acknowledged' && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onResolve(alert.id)}
                disabled={actionLoading === alert.id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === alert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Resolve
              </button>
              <button
                type="button"
                onClick={() => onFalsePositive(alert.id)}
                disabled={actionLoading === alert.id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-neutral-700 text-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                False Positive
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AlertManagement() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [resolveModal, setResolveModal] = useState({ open: false, alertId: null });
  const [resolution, setResolution] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterSeverity !== 'all') params.severity = filterSeverity;

      const data = await getAlerts(params);
      setAlerts(data?.alerts || data || []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAcknowledge = async (alertId) => {
    setActionLoading(alertId);
    try {
      await acknowledgeAlert(alertId);
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, status: 'acknowledged' } : a
      ));
    } catch (e) {
      setError(e?.message || 'Failed to acknowledge alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (alertId) => {
    setResolveModal({ open: true, alertId });
  };

  const confirmResolve = async () => {
    const { alertId } = resolveModal;
    setActionLoading(alertId);
    try {
      await resolveAlert(alertId, { resolution });
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, status: 'resolved' } : a
      ));
      setResolveModal({ open: false, alertId: null });
      setResolution('');
    } catch (e) {
      setError(e?.message || 'Failed to resolve alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFalsePositive = async (alertId) => {
    setActionLoading(alertId);
    try {
      await markAlertFalsePositive(alertId);
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, status: 'false_positive' } : a
      ));
    } catch (e) {
      setError(e?.message || 'Failed to mark as false positive');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-sm">
            <span className="text-neutral-600 mr-2">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-neutral-600 mr-2">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !alerts.length ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          <span className="ml-2 text-neutral-600">Loading alerts...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          No alerts found matching your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              onFalsePositive={handleFalsePositive}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      <Modal
        open={resolveModal.open}
        onClose={() => { setResolveModal({ open: false, alertId: null }); setResolution(''); }}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Resolve Alert</h3>
          <p className="text-sm text-neutral-600">
            Add a resolution note for the audit trail.
          </p>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Resolution details..."
            rows={3}
            className="w-full border rounded-lg px-3 py-2"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setResolveModal({ open: false, alertId: null }); setResolution(''); }}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmResolve}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Resolve Alert
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
