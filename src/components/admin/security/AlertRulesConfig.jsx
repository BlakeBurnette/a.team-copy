// src/components/admin/security/AlertRulesConfig.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Bell,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import { getAlertRules, updateAlertRule } from '../../../api/securityDashboard';

function RuleCard({ rule, onUpdate, updating }) {
  const [expanded, setExpanded] = useState(false);
  const [localRule, setLocalRule] = useState(rule);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalRule(rule);
    setHasChanges(false);
  }, [rule]);

  const handleToggle = (field) => {
    setLocalRule(prev => {
      const updated = { ...prev, [field]: !prev[field] };
      setHasChanges(true);
      return updated;
    });
  };

  const handleSave = async () => {
    await onUpdate(rule.id, {
      enabled: localRule.enabled,
      email_enabled: localRule.email_enabled,
      sms_enabled: localRule.sms_enabled,
    });
    setHasChanges(false);
  };

  const severityColor = {
    critical: 'border-red-300 bg-red-50',
    high: 'border-amber-300 bg-amber-50',
    medium: 'border-yellow-300 bg-yellow-50',
    low: 'border-blue-300 bg-blue-50',
  };

  return (
    <div className={`rounded-xl border p-4 ${severityColor[rule.severity] || 'border-neutral-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localRule.enabled}
                onChange={() => handleToggle('enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
            <h3 className={`font-semibold ${localRule.enabled ? 'text-neutral-900' : 'text-neutral-400'}`}>
              {rule.name || rule.event_type}
            </h3>
          </div>
          <p className="text-sm text-neutral-600 mt-1 ml-14">
            {rule.description || `Alerts on ${rule.event_type} events`}
          </p>
          <div className="flex items-center gap-4 mt-2 ml-14 text-sm">
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
              rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
              rule.severity === 'high' ? 'bg-amber-100 text-amber-800' :
              rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {rule.severity}
            </span>
            <span className="text-neutral-500">
              Threshold: {rule.threshold || 1}
            </span>
            <span className="text-neutral-500">
              Cooldown: {rule.cooldown_minutes || 15}m
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={updating === rule.id}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {updating === rule.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          )}
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
        <div className="mt-4 pt-4 border-t border-neutral-200 ml-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notification channels */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3">Notification Channels</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localRule.email_enabled}
                    onChange={() => handleToggle('email_enabled')}
                    className="w-4 h-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <Mail className="w-4 h-4 text-neutral-500" />
                  <span className="text-sm">Email notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localRule.sms_enabled}
                    onChange={() => handleToggle('sms_enabled')}
                    className="w-4 h-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <MessageSquare className="w-4 h-4 text-neutral-500" />
                  <span className="text-sm">SMS notifications</span>
                </label>
              </div>
            </div>

            {/* Rule details */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3">Rule Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Event Type</span>
                  <span className="font-medium">{rule.event_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Category</span>
                  <span className="font-medium">{rule.category || 'All'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Threshold</span>
                  <span className="font-medium">{rule.threshold || 1} occurrences</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Time Window</span>
                  <span className="font-medium">{rule.window_minutes || 15} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cooldown</span>
                  <span className="font-medium">{rule.cooldown_minutes || 15} minutes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Conditions */}
          {rule.conditions && Object.keys(rule.conditions).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-neutral-700 mb-2">Conditions</h4>
              <pre className="bg-white rounded-lg border p-3 text-xs overflow-x-auto">
                {JSON.stringify(rule.conditions, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AlertRulesConfig() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAlertRules();
      setRules(data?.rules || data || []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (ruleId, updates) => {
    setUpdating(ruleId);
    try {
      const updated = await updateAlertRule(ruleId, updates);
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...updated } : r));
    } catch (e) {
      setError(e?.message || 'Failed to update rule');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-neutral-600">Loading rules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Alert Rules</h2>
          <p className="text-sm text-neutral-600">
            Configure which events trigger alerts and how notifications are sent.
          </p>
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

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
          <p>No alert rules configured.</p>
          <p className="text-sm mt-1">Contact your administrator to set up security alert rules.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onUpdate={handleUpdate}
              updating={updating}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <Bell className="w-5 h-5 mt-0.5" />
          <div>
            <strong>About Alert Rules</strong>
            <p className="mt-1">
              Alert rules determine when security events trigger notifications. Rules can be configured to send
              email and/or SMS alerts based on event severity, type, and occurrence thresholds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
