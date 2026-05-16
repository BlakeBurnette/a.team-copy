// src/pages/settings/QuickBooksSettings.jsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { RefreshCw, ExternalLink, CheckCircle, XCircle, AlertCircle, Unlink, Lock, Clock, RotateCcw } from 'lucide-react';

const Toggle = ({ checked, onChange, disabled }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={!!checked}
      onChange={onChange}
      disabled={disabled}
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50" />
  </label>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg border border-neutral-200 p-4 ${className}`}>
    {children}
  </div>
);

export default function QuickBooksSettings({ showToast }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncLog, setSyncLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [retrying, setRetrying] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/integrations/quickbooks/status', {
        withCredentials: true,
      });
      setStatus(data);
      // If connected, fetch sync log
      if (data.connected) {
        fetchSyncLog();
      }
    } catch (err) {
      console.error('[qb] Failed to fetch status:', err);
      setStatus({ connected: false, canConnect: false, enabled: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSyncLog = async () => {
    setLoadingLog(true);
    try {
      const { data } = await axios.get('/api/integrations/quickbooks/sync-log', {
        params: { limit: 20 },
        withCredentials: true,
      });
      setSyncLog(data.items || []);
    } catch (err) {
      console.error('[qb] Failed to fetch sync log:', err);
    } finally {
      setLoadingLog(false);
    }
  };

  const handleRetry = async (logId) => {
    setRetrying(logId);
    try {
      await axios.post(`/api/integrations/quickbooks/retry/${logId}`, {}, {
        withCredentials: true,
      });
      showToast?.('Item queued for retry');
      fetchSyncLog();
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check for OAuth callback results
    const params = new URLSearchParams(window.location.search);
    if (params.get('qb_success')) {
      showToast?.('QuickBooks connected successfully!');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      fetchStatus();
    } else if (params.get('qb_error')) {
      showToast?.(`QuickBooks connection failed: ${params.get('qb_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchStatus, showToast]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await axios.get('/api/integrations/quickbooks/connect', {
        withCredentials: true,
      });
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast?.('Failed to get authorization URL');
      }
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Failed to initiate connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect QuickBooks? Sync history will be preserved.')) {
      return;
    }

    setDisconnecting(true);
    try {
      await axios.post('/api/integrations/quickbooks/disconnect', {}, {
        withCredentials: true,
      });
      showToast?.('QuickBooks disconnected');
      fetchStatus();
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { data } = await axios.post('/api/integrations/quickbooks/sync', {}, {
        withCredentials: true,
      });
      const msg = data.processed > 0
        ? `Synced ${data.processed} item(s)`
        : 'No items to sync';
      showToast?.(msg);
      fetchStatus();
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleSetting = async (key, value) => {
    setSavingSettings(true);
    try {
      await axios.put('/api/integrations/quickbooks/settings', {
        [key]: value,
      }, {
        withCredentials: true,
      });
      setStatus((prev) => ({
        ...prev,
        syncSettings: {
          ...prev.syncSettings,
          [key === 'syncCustomers' ? 'customers' : key === 'syncInvoices' ? 'invoices' : 'payments']: value,
        },
      }));
      showToast?.('Settings saved');
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-neutral-200 rounded w-1/3" />
            <div className="h-4 bg-neutral-200 rounded w-2/3" />
          </div>
        </Card>
      </div>
    );
  }

  const { connected, companyName, lastSyncAt, syncSettings, stats, canConnect, enabled } = status || {};

  // Feature is disabled for this org
  if (!enabled) {
    return (
      <div className="space-y-4">
        <Card className="bg-neutral-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-neutral-200 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-neutral-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-neutral-700">QuickBooks Integration</h3>
              <p className="text-sm text-neutral-500 mt-1">
                This feature is not enabled for your organization. Please contact your administrator to enable QuickBooks integration.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#2CA01C"/>
                <path d="M17 12.5c0 2.5-2 4.5-4.5 4.5S8 15 8 12.5 10 8 12.5 8c1 0 1.9.3 2.6.9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12.5 8V6M12.5 19v-2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">QuickBooks Online</h3>
              {connected ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Connected to {companyName || 'QuickBooks'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <XCircle className="w-4 h-4" />
                  <span>Not connected</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {connected ? (
              <>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <Unlink className="w-4 h-4" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </>
            ) : canConnect ? (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                {connecting ? 'Connecting...' : 'Connect to QuickBooks'}
              </button>
            ) : (
              <span className="text-sm text-neutral-500">
                QuickBooks integration not configured
              </span>
            )}
          </div>
        </div>

        {connected && lastSyncAt && (
          <div className="mt-3 text-sm text-neutral-500">
            Last synced: {new Date(lastSyncAt).toLocaleString()}
          </div>
        )}
      </Card>

      {/* Sync Settings */}
      {connected && (
        <Card>
          <h4 className="font-semibold mb-4">Sync Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Sync Customers</div>
                <div className="text-sm text-neutral-500">
                  Push new and updated customers to QuickBooks
                </div>
              </div>
              <Toggle
                checked={syncSettings?.customers}
                onChange={(e) => handleToggleSetting('syncCustomers', e.target.checked)}
                disabled={savingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Sync Invoices</div>
                <div className="text-sm text-neutral-500">
                  Push invoices to QuickBooks when created
                </div>
              </div>
              <Toggle
                checked={syncSettings?.invoices}
                onChange={(e) => handleToggleSetting('syncInvoices', e.target.checked)}
                disabled={savingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Sync Payments</div>
                <div className="text-sm text-neutral-500">
                  Record payments in QuickBooks when received
                </div>
              </div>
              <Toggle
                checked={syncSettings?.payments}
                onChange={(e) => handleToggleSetting('syncPayments', e.target.checked)}
                disabled={savingSettings}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Sync Stats */}
      {connected && stats && (
        <Card>
          <h4 className="font-semibold mb-4">Sync Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{stats.synced || 0}</div>
              <div className="text-sm text-neutral-600">Synced</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{stats.pending || 0}</div>
              <div className="text-sm text-neutral-600">Pending</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
              <div className="text-sm text-neutral-600">Failed</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold">{stats.customers || 0}</div>
              <div className="text-sm text-neutral-600">Customers</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold">{stats.invoices || 0}</div>
              <div className="text-sm text-neutral-600">Invoices</div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold">{stats.payments || 0}</div>
              <div className="text-sm text-neutral-600">Payments</div>
            </div>
          </div>

          {stats.failed > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-800">Some items failed to sync</div>
                <div className="text-sm text-red-600">
                  Click "Sync Now" to retry failed items, or check the sync log below.
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Sync Log */}
      {connected && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Recent Sync Activity</h4>
            <button
              type="button"
              onClick={fetchSyncLog}
              disabled={loadingLog}
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingLog ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingLog && syncLog.length === 0 ? (
            <div className="text-center py-4 text-neutral-500">Loading sync history...</div>
          ) : syncLog.length === 0 ? (
            <div className="text-center py-4 text-neutral-500">No sync activity yet</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {syncLog.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg text-sm flex items-start justify-between gap-2 ${
                    item.sync_status === 'synced'
                      ? 'bg-green-50'
                      : item.sync_status === 'failed'
                      ? 'bg-red-50'
                      : 'bg-amber-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.sync_status === 'synced' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : item.sync_status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      )}
                      <span className="font-medium capitalize">{item.entity_type}</span>
                      <span className="text-neutral-500">#{item.entity_id}</span>
                    </div>
                    {item.error_message && (
                      <div className="text-xs text-red-600 mt-1 truncate" title={item.error_message}>
                        {item.error_message}
                      </div>
                    )}
                    <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.synced_at || item.created_at).toLocaleString()}
                    </div>
                  </div>
                  {item.sync_status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => handleRetry(item.id)}
                      disabled={retrying === item.id}
                      className="text-xs px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 inline-flex items-center gap-1"
                    >
                      <RotateCcw className={`w-3 h-3 ${retrying === item.id ? 'animate-spin' : ''}`} />
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How QuickBooks sync works</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Customers, invoices, and payments are pushed to QuickBooks automatically</li>
              <li>Sync runs every few minutes for new items</li>
              <li>Data flows one-way: from this app to QuickBooks</li>
              <li>Existing QuickBooks data is not modified</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
