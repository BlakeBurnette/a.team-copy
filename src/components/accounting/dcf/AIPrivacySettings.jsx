import { useState, useEffect } from 'react';
import { Shield, Lock, Eye, CheckCircle, AlertTriangle, FileText, Clock, Hash } from 'lucide-react';
import { dcfApi } from '../../../api/accounting';

export default function AIPrivacySettings() {
  const [settings, setSettings] = useState(null);
  const [chainStatus, setChainStatus] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showCertForm, setShowCertForm] = useState(false);
  const [certForm, setCertForm] = useState({
    period_start: '',
    period_end: '',
    certificate_type: 'audit_integrity',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [settingsRes, chainRes, certsRes] = await Promise.all([
        dcfApi.getAISettings(),
        dcfApi.getChainStatus(),
        dcfApi.getCertificates(),
      ]);
      setSettings(settingsRes.settings || {});
      setChainStatus(chainRes);
      setCertificates(certsRes.certificates || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await dcfApi.updateAISettings(settings);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateCertificate() {
    try {
      setSaving(true);
      const result = await dcfApi.generateCertificate(certForm);
      if (result.success) {
        setCertificates([result.certificate, ...certificates]);
        setShowCertForm(false);
        setCertForm({ period_start: '', period_end: '', certificate_type: 'audit_integrity' });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Privacy Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Privacy Controls</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings?.contribute_to_global_insights || false}
              onChange={(e) => setSettings({ ...settings, contribute_to_global_insights: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div>
              <span className="font-medium">Contribute to Global Insights</span>
              <p className="text-sm text-gray-500">Share anonymized data to improve AI benchmarks for all users</p>
            </div>
          </label>

          {settings?.contribute_to_global_insights && (
            <div className="ml-7 space-y-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Granular Data Sharing:</div>
              {[
                { key: 'share_revenue_patterns', label: 'Revenue Patterns' },
                { key: 'share_expense_patterns', label: 'Expense Patterns' },
                { key: 'share_seasonality', label: 'Seasonality Data' },
                { key: 'share_growth_rates', label: 'Growth Rates' },
                { key: 'share_margins', label: 'Margin Data (more sensitive)' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings?.[key] !== false}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}

              <div className="mt-3">
                <label className="text-sm font-medium text-gray-700">Anonymization Level:</label>
                <select
                  value={settings?.anonymization_level || 'full'}
                  onChange={(e) => setSettings({ ...settings, anonymization_level: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                >
                  <option value="full">Full (Maximum Privacy)</option>
                  <option value="partial">Partial (Include Seasonality)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cryptographic Audit */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold">Cryptographic Audit</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings?.require_cryptographic_audit || false}
              onChange={(e) => setSettings({ ...settings, require_cryptographic_audit: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded"
            />
            <div>
              <span className="font-medium">Enable Cryptographic Audit Trail</span>
              <p className="text-sm text-gray-500">All AI requests will be anchored to a tamper-proof blockchain</p>
            </div>
          </label>

          <div>
            <label className="text-sm font-medium text-gray-700">Audit Retention Period:</label>
            <select
              value={settings?.audit_retention_days || 2555}
              onChange={(e) => setSettings({ ...settings, audit_retention_days: parseInt(e.target.value, 10) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
            >
              <option value={365}>1 Year</option>
              <option value={730}>2 Years</option>
              <option value={1825}>5 Years</option>
              <option value={2555}>7 Years (Default)</option>
              <option value={3650}>10 Years</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Chain Status */}
      {chainStatus && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Audit Chain Status</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{chainStatus.audits?.total || 0}</div>
              <div className="text-sm text-gray-500">Total AI Requests</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-700">{chainStatus.audits?.verified || 0}</div>
              <div className="text-sm text-gray-500">Chain Verified</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-700">{chainStatus.audits?.anchored || 0}</div>
              <div className="text-sm text-gray-500">Anchored</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-700">{chainStatus.certificates || 0}</div>
              <div className="text-sm text-gray-500">Certificates</div>
            </div>
          </div>

          {chainStatus.audits?.firstAudit && (
            <div className="mt-4 text-sm text-gray-500">
              <Clock className="w-4 h-4 inline mr-1" />
              First audit: {new Date(chainStatus.audits.firstAudit).toLocaleDateString()}
              {chainStatus.audits.lastAudit && (
                <span className="ml-4">Last: {new Date(chainStatus.audits.lastAudit).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Certificates */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">Audit Certificates</h3>
          </div>
          <button
            onClick={() => setShowCertForm(!showCertForm)}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Generate Certificate
          </button>
        </div>

        {showCertForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Period Start:</label>
                <input
                  type="date"
                  value={certForm.period_start}
                  onChange={(e) => setCertForm({ ...certForm, period_start: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Period End:</label>
                <input
                  type="date"
                  value={certForm.period_end}
                  onChange={(e) => setCertForm({ ...certForm, period_end: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Certificate Type:</label>
              <select
                value={certForm.certificate_type}
                onChange={(e) => setCertForm({ ...certForm, certificate_type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
              >
                <option value="audit_integrity">Audit Integrity</option>
                <option value="privacy_compliance">Privacy Compliance</option>
                <option value="data_isolation_proof">Data Isolation Proof</option>
              </select>
            </div>
            <button
              onClick={handleGenerateCertificate}
              disabled={saving || !certForm.period_start || !certForm.period_end}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Generating...' : 'Generate'}
            </button>
          </div>
        )}

        {certificates.length === 0 ? (
          <p className="text-gray-500 text-sm">No certificates generated yet.</p>
        ) : (
          <div className="space-y-2">
            {certificates.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{cert.certificate_type.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(cert.audit_period_start).toLocaleDateString()} - {new Date(cert.audit_period_end).toLocaleDateString()}
                    <span className="ml-2">({cert.audit_log_count} entries)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cert.trust_block_id ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Anchored
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Pending
                    </span>
                  )}
                  <span className="text-xs text-gray-400 font-mono">{cert.certificate_hash?.slice(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
