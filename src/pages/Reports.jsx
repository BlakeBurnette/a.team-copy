// src/pages/Reports.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, ShieldAlert, Download,
  CreditCard, SlidersHorizontal, Building, CheckCircle, XCircle, Clock, Power, ToggleLeft, ToggleRight,
  Lock, AlertCircle, RotateCcw
} from 'lucide-react';
import Dropdown from '../components/Dropdown';
import { useAuth } from '../context/AuthContext';

function cx(...xs){ return xs.filter(Boolean).join(' '); }

function formatMoney(amountMinor, currency = 'USD', locale) {
  const nf = new Intl.NumberFormat(locale || undefined, {
    style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  return nf.format((amountMinor || 0) / 100);
}
function useDebounced(v, delay=400){
  const [s, setS] = useState(v);
  useEffect(() => { const t=setTimeout(()=>setS(v), delay); return ()=>clearTimeout(t); }, [v, delay]);
  return s;
}
function Pill({children, tone='neutral'}) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-800',
    success: 'bg-green-100 text-green-800',
    warn: 'bg-amber-100 text-amber-900',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone])}>{children}</span>;
}
const toneFor = (s) => (
  s === 'succeeded' ? 'success' :
  s === 'processing' ? 'info' :
  s === 'requires_capture' || s === 'requires_payment_method' ? 'warn' :
  s === 'canceled' || s === 'refunded' || s === 'failed' ? 'danger' :
  s === 'disputed' ? 'warn' : 'neutral'
);

export default function Reports({ embedded = false }) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const isOwner = hasRole('owner');

  // Tab state — when embedded, go straight to quickbooks
  const [activeTab, setActiveTab] = useState(embedded ? 'quickbooks' : 'payments');

  // state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [accountId, setAccountId] = useState(null);

  const [rows, setRows] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [prevStack, setPrevStack] = useState([]);

  // filters
  const [query, setQuery] = useState('');
  const dq = useDebounced(query);
  const [status, setStatus] = useState('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(50);

  // mobile filters drawer
  const [filtersOpen, setFiltersOpen] = useState(false);

  // QuickBooks admin state
  const [qbOrgs, setQbOrgs] = useState([]);
  const [qbStats, setQbStats] = useState(null);
  const [qbLoading, setQbLoading] = useState(false);
  const [qbErr, setQbErr] = useState('');
  const [toggling, setToggling] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // QuickBooks owner state
  const [ownerQbStatus, setOwnerQbStatus] = useState(null);
  const [ownerQbLoading, setOwnerQbLoading] = useState(false);
  const [ownerSyncLog, setOwnerSyncLog] = useState([]);
  const [ownerSyncing, setOwnerSyncing] = useState(false);
  const [ownerRetrying, setOwnerRetrying] = useState(null);

  const authHeader = useMemo(() => ({}), []);

  const fetchPage = async ({ starting_after = null, replaceHistory = false } = {}) => {
    setLoading(true); setErr('');
    try {
      const params = {
        q: dq || undefined,
        status: status !== 'any' ? status : undefined,
        from, to, limit, starting_after,
      };
      const { data } = await axios.get('/api/owner/stripe/payments', {
        params, headers: authHeader, withCredentials: true,
      });
      if (!data?.ok) throw new Error(data?.error || 'Failed to fetch payments');

      setHasAccount(!!data.hasAccount);
      setAccountId(data.accountId || null);
      setRows(data.items || []);
      setHasMore(!!data.has_more);
      setNextCursor(data.next_cursor || null);

      if (!replaceHistory && starting_after) setPrevStack((s)=>[...s, starting_after]);
      else if(!starting_after) setPrevStack([]);
    } catch (e) {
      console.error('[Reports] list error:', e?.response?.data || e);
      setErr(e?.response?.data?.error || e?.message || 'Failed to load data');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPage({ replaceHistory: true }); /* eslint-disable-next-line */ }, [dq, status, from, to, limit]);

  const goNext = () => { if (hasMore && nextCursor) fetchPage({ starting_after: nextCursor }); };
  const goPrev = () => {
    if (!prevStack.length) return;
    const c=[...prevStack]; c.pop(); const prev=c.pop();
    setPrevStack(c);
    fetchPage({ starting_after: prev || null, replaceHistory: true });
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({
        q: dq || '',
        status: status !== 'any' ? status : '',
        from: from || '',
        to: to || '',
        limit: String(limit || 50),
        format: 'csv',
      });
      const url = `/api/owner/stripe/payments?${params.toString()}`;
      const res = await fetch(url, { headers: authHeader, credentials: 'include' });
      if (!res.ok) throw new Error('CSV export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const label = ['payments', from || 'start', to || 'end'].join('_');
      a.download = `${label}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('[Reports] export CSV error:', e);
      alert(e.message || 'CSV export failed');
    }
  };

  // QuickBooks admin functions
  const fetchQbOrgs = useCallback(async () => {
    if (!isAdmin) return;
    setQbLoading(true);
    setQbErr('');
    try {
      const [orgsRes, statsRes] = await Promise.all([
        axios.get('/api/integrations/quickbooks/admin/orgs', { withCredentials: true }),
        axios.get('/api/integrations/quickbooks/admin/stats', { withCredentials: true }),
      ]);
      setQbOrgs(orgsRes.data.orgs || []);
      setQbStats(statsRes.data);
    } catch (e) {
      setQbErr(e?.response?.data?.error || e?.message || 'Failed to load QuickBooks data');
    } finally {
      setQbLoading(false);
    }
  }, [isAdmin]);

  const handleToggleQb = async (orgId, enabled) => {
    setToggling(orgId);
    try {
      await axios.post(`/api/integrations/quickbooks/admin/org/${orgId}/toggle`, { enabled }, {
        withCredentials: true,
      });
      fetchQbOrgs();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to toggle QuickBooks');
    } finally {
      setToggling(null);
    }
  };

  const fetchOrgDetails = async (orgId) => {
    setSelectedOrg(orgId);
    setLoadingDetails(true);
    try {
      const { data } = await axios.get(`/api/integrations/quickbooks/admin/org/${orgId}`, {
        withCredentials: true,
      });
      setOrgDetails(data);
    } catch (e) {
      console.error('[Reports] org details error:', e);
      setOrgDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch QB data when switching to that tab (admin)
  useEffect(() => {
    if (activeTab === 'quickbooks' && isAdmin && qbOrgs.length === 0) {
      fetchQbOrgs();
    }
  }, [activeTab, isAdmin, fetchQbOrgs, qbOrgs.length]);

  // Owner QuickBooks functions
  const fetchOwnerQbStatus = useCallback(async () => {
    if (!isOwner && !isAdmin) return;
    setOwnerQbLoading(true);
    try {
      const { data } = await axios.get('/api/integrations/quickbooks/status', { withCredentials: true });
      setOwnerQbStatus(data);
      if (data.connected) {
        fetchOwnerSyncLog();
      }
    } catch (e) {
      console.error('[Reports] owner QB status error:', e);
      setOwnerQbStatus({ enabled: false, connected: false });
    } finally {
      setOwnerQbLoading(false);
    }
  }, [isOwner, isAdmin]);

  const fetchOwnerSyncLog = async () => {
    try {
      const { data } = await axios.get('/api/integrations/quickbooks/sync-log', {
        params: { limit: 50 },
        withCredentials: true,
      });
      setOwnerSyncLog(data.items || []);
    } catch (e) {
      console.error('[Reports] owner sync log error:', e);
    }
  };

  const handleOwnerSyncAll = async () => {
    setOwnerSyncing(true);
    try {
      const { data } = await axios.post('/api/integrations/quickbooks/sync', {}, { withCredentials: true });
      alert(`Sync complete: ${data.processed || 0} items processed`);
      fetchOwnerQbStatus();
    } catch (e) {
      alert(e?.response?.data?.error || 'Sync failed');
    } finally {
      setOwnerSyncing(false);
    }
  };

  const handleOwnerRetry = async (logId) => {
    setOwnerRetrying(logId);
    try {
      await axios.post(`/api/integrations/quickbooks/retry/${logId}`, {}, { withCredentials: true });
      fetchOwnerSyncLog();
    } catch (e) {
      alert(e?.response?.data?.error || 'Retry failed');
    } finally {
      setOwnerRetrying(null);
    }
  };

  // Fetch owner QB data when switching to that tab (also when embedded, even for admins)
  useEffect(() => {
    if (activeTab === 'quickbooks' && (isOwner || isAdmin) && (embedded || !isAdmin) && !ownerQbStatus) {
      fetchOwnerQbStatus();
    }
  }, [activeTab, isOwner, isAdmin, embedded, ownerQbStatus, fetchOwnerQbStatus]);

  const Filters = ({ inline=false }) => (
    <div className={cx(inline ? '' : 'p-4', 'space-y-3')}>
      {/* Search */}
      <div>
        {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">Search</label>}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            aria-label="Search"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="email, last4, description, amount…"
            className="w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Grid of controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Dropdown
          label={!inline ? "Status" : undefined}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'any', label: 'any' },
            { value: 'succeeded', label: 'succeeded' },
            { value: 'processing', label: 'processing' },
            { value: 'requires_capture', label: 'requires capture' },
            { value: 'requires_payment_method', label: 'requires payment method' },
            { value: 'canceled', label: 'canceled' },
            { value: 'failed', label: 'failed' },
            { value: 'refunded', label: 'refunded' },
            { value: 'disputed', label: 'disputed' },
          ]}
        />
        <Dropdown
          label={!inline ? "Per Page" : undefined}
          value={limit}
          onChange={(v)=>setLimit(parseInt(v,10))}
          options={[20,50,100].map(n=>({ value: n, label: String(n) }))}
        />
        <div>
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">From</label>}
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="w-full py-2.5 px-3 border rounded-lg"/>
        </div>
        <div>
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">To</label>}
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="w-full py-2.5 px-3 border rounded-lg"/>
        </div>
        <div className="flex items-end">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-neutral-50 w-full justify-center"
            title="Export CSV"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>
    </div>
  );

  // QuickBooks Admin Tab Content
  const QuickBooksAdminTab = () => (
    <div className="space-y-4 mt-4">
      {/* Stats Cards */}
      {qbStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600">{qbStats.totalOrgs || 0}</div>
            <div className="text-sm text-neutral-600">Total Orgs</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600">{qbStats.enabledOrgs || 0}</div>
            <div className="text-sm text-neutral-600">QB Enabled</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-600">{qbStats.connectedOrgs || 0}</div>
            <div className="text-sm text-neutral-600">Connected</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-600">{qbStats.totalSynced || 0}</div>
            <div className="text-sm text-neutral-600">Items Synced</div>
          </div>
        </div>
      )}

      {qbErr && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
          {qbErr}
        </div>
      )}

      {/* Orgs Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Organizations</h3>
          <button
            onClick={fetchQbOrgs}
            disabled={qbLoading}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <RefreshCw className={cx('h-4 w-4', qbLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {qbLoading && qbOrgs.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">Loading...</div>
        ) : qbOrgs.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">No organizations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left py-3 px-4">Organization</th>
                  <th className="text-left py-3 px-4">QB Enabled</th>
                  <th className="text-left py-3 px-4">Connection</th>
                  <th className="text-left py-3 px-4">Last Sync</th>
                  <th className="text-left py-3 px-4">Stats</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {qbOrgs.map((org) => (
                  <tr key={org.id} className="border-t hover:bg-neutral-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-neutral-400" />
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-xs text-neutral-500">ID: {org.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleQb(org.id, !org.quickbooks_enabled)}
                        disabled={toggling === org.id}
                        className={cx(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                          org.quickbooks_enabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        )}
                      >
                        {toggling === org.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : org.quickbooks_enabled ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                        {org.quickbooks_enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      {org.qb_connected ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs">{org.qb_company_name || 'Connected'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-neutral-400">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs">Not connected</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {org.last_sync_at ? (
                        <div className="flex items-center gap-1 text-xs text-neutral-600">
                          <Clock className="h-3 w-3" />
                          {new Date(org.last_sync_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">Never</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {org.sync_counts ? (
                        <div className="flex gap-2 text-xs">
                          <span className="text-green-600">{org.sync_counts.synced || 0} synced</span>
                          {org.sync_counts.failed > 0 && (
                            <span className="text-red-600">{org.sync_counts.failed} failed</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => fetchOrgDetails(org.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Org Details Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setSelectedOrg(null); setOrgDetails(null); }} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold">QuickBooks Details - Org #{selectedOrg}</h3>
              <button
                onClick={() => { setSelectedOrg(null); setOrgDetails(null); }}
                className="p-1 hover:bg-neutral-100 rounded"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {loadingDetails ? (
                <div className="text-center py-8 text-neutral-500">Loading...</div>
              ) : orgDetails ? (
                <div className="space-y-4">
                  {orgDetails.connection ? (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="font-medium text-green-800 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Connected to {orgDetails.connection.company_name}
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        Realm ID: {orgDetails.connection.realm_id}
                      </div>
                      <div className="text-sm text-green-700">
                        Connected: {new Date(orgDetails.connection.created_at).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <div className="text-neutral-600">Not connected to QuickBooks</div>
                    </div>
                  )}

                  {orgDetails.stats && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-neutral-50 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-green-600">{orgDetails.stats.synced || 0}</div>
                        <div className="text-xs text-neutral-600">Synced</div>
                      </div>
                      <div className="bg-neutral-50 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-amber-600">{orgDetails.stats.pending || 0}</div>
                        <div className="text-xs text-neutral-600">Pending</div>
                      </div>
                      <div className="bg-neutral-50 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-red-600">{orgDetails.stats.failed || 0}</div>
                        <div className="text-xs text-neutral-600">Failed</div>
                      </div>
                    </div>
                  )}

                  {orgDetails.recentSync?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recent Sync Activity</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {orgDetails.recentSync.map((item) => (
                          <div
                            key={item.id}
                            className={cx(
                              'p-2 rounded text-xs flex items-center gap-2',
                              item.sync_status === 'synced' ? 'bg-green-50' : item.sync_status === 'failed' ? 'bg-red-50' : 'bg-amber-50'
                            )}
                          >
                            {item.sync_status === 'synced' ? (
                              <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                            ) : item.sync_status === 'failed' ? (
                              <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-600 flex-shrink-0" />
                            )}
                            <span className="capitalize">{item.entity_type}</span>
                            <span className="text-neutral-500">#{item.entity_id}</span>
                            <span className="text-neutral-400 ml-auto">
                              {new Date(item.synced_at || item.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-red-600">Failed to load details</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // QuickBooks Owner Tab Content
  const QuickBooksOwnerTab = () => {
    if (ownerQbLoading && !ownerQbStatus) {
      return <div className="text-center py-8 text-neutral-500">Loading...</div>;
    }

    if (!ownerQbStatus?.enabled) {
      return (
        <div className="bg-neutral-50 border rounded-xl p-6 text-center mt-4">
          <Lock className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
          <div className="font-medium text-neutral-700">QuickBooks Not Available</div>
          <div className="text-sm text-neutral-500 mt-1">
            QuickBooks integration is not enabled for your organization. Contact your administrator to enable it.
          </div>
        </div>
      );
    }

    if (!ownerQbStatus?.connected) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center mt-4">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <div className="font-medium text-amber-800">QuickBooks Not Connected</div>
          <div className="text-sm text-amber-700 mt-1">
            Go to <a href="/app/settings?tab=Integrations" className="underline">Settings &gt; Integrations</a> to connect your QuickBooks account.
          </div>
        </div>
      );
    }

    const { stats, companyName, lastSyncAt } = ownerQbStatus;

    return (
      <div className="space-y-4 mt-4">
        {/* Connection Info & Sync Button */}
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#2CA01C"/>
                  <path d="M17 12.5c0 2.5-2 4.5-4.5 4.5S8 15 8 12.5 10 8 12.5 8c1 0 1.9.3 2.6.9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Connected to {companyName || 'QuickBooks'}
                </div>
                {lastSyncAt && (
                  <div className="text-xs text-neutral-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last synced: {new Date(lastSyncAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleOwnerSyncAll}
              disabled={ownerSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <RefreshCw className={cx('h-4 w-4', ownerSyncing && 'animate-spin')} />
              {ownerSyncing ? 'Syncing...' : 'Sync All'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-green-600">{stats.synced || 0}</div>
              <div className="text-xs text-neutral-600">Synced</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-amber-600">{stats.pending || 0}</div>
              <div className="text-xs text-neutral-600">Pending</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-red-600">{stats.failed || 0}</div>
              <div className="text-xs text-neutral-600">Failed</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{stats.customers || 0}</div>
              <div className="text-xs text-neutral-600">Customers</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{stats.invoices || 0}</div>
              <div className="text-xs text-neutral-600">Invoices</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{stats.payments || 0}</div>
              <div className="text-xs text-neutral-600">Payments</div>
            </div>
          </div>
        )}

        {/* Sync Log */}
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Sync History</h3>
            <button
              onClick={fetchOwnerSyncLog}
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {ownerSyncLog.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">No sync history yet</div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {ownerSyncLog.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.sync_status === 'synced' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : item.sync_status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium capitalize">
                        {item.entity_type} #{item.entity_id}
                        {item.qb_id && <span className="text-neutral-400 ml-2">→ QB #{item.qb_id}</span>}
                      </div>
                      {item.error_message && (
                        <div className="text-xs text-red-600 truncate" title={item.error_message}>
                          {item.error_message}
                        </div>
                      )}
                      <div className="text-xs text-neutral-500">
                        {new Date(item.synced_at || item.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {item.sync_status === 'failed' && (
                    <button
                      onClick={() => handleOwnerRetry(item.id)}
                      disabled={ownerRetrying === item.id}
                      className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 inline-flex items-center gap-1 flex-shrink-0"
                    >
                      <RotateCcw className={cx('h-3 w-3', ownerRetrying === item.id && 'animate-spin')} />
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Determine if QuickBooks tab should be shown
  const showQbTab = isAdmin || isOwner;

  return (
    <div className={embedded ? '' : 'p-4 md:p-6'}>
      {/* Header */}
      {!embedded && (
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4 md:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Reports</h1>
          <div className="text-sm text-neutral-600">
            {activeTab === 'payments' ? 'Stripe payments by date range, with CSV export' : 'QuickBooks sync details'}
          </div>
          {activeTab === 'payments' && hasAccount && (
            <div className="mt-1 text-[11px] text-neutral-500 truncate">
              Connected Account: <span className="font-mono">{accountId}</span>
            </div>
          )}
        </div>
        <div className="hidden md:flex items-center gap-2">
          {activeTab === 'payments' && (
            <button
              onClick={()=>fetchPage({ replaceHistory: true })}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
              type="button" disabled={loading} title="Refresh"
            >
              <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </button>
          )}
        </div>
      </div>
      )}

      {/* Tabs (show if admin or owner, hide when embedded) */}
      {showQbTab && !embedded && (
        <div className="flex gap-1 mb-4 border-b">
          <button
            onClick={() => setActiveTab('payments')}
            className={cx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            )}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </div>
          </button>
          <button
            onClick={() => setActiveTab('quickbooks')}
            className={cx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'quickbooks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            )}
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#2CA01C"/>
                <path d="M17 12.5c0 2.5-2 4.5-4.5 4.5S8 15 8 12.5 10 8 12.5 8c1 0 1.9.3 2.6.9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              QuickBooks{isAdmin && ' (Admin)'}
            </div>
          </button>
        </div>
      )}

      {/* QuickBooks Tab — embedded (Business workspace) always uses owner view */}
      {activeTab === 'quickbooks' ? (
        (isAdmin && !embedded) ? <QuickBooksAdminTab /> : <QuickBooksOwnerTab />
      ) : (
        <>
      {/* Mobile sticky filter/actions bar */}
      <div className="md:hidden sticky top-[56px] z-30 -mx-4 px-4 py-2 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
            aria-haspopup="dialog" aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <button
            onClick={()=>fetchPage({ replaceHistory: true })}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
            disabled={loading}
          >
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <div className="flex-1" />
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Filters panel (desktop inline) */}
      <div className="hidden md:block bg-white border rounded-2xl shadow-sm p-5 mb-4">
        {!hasAccount ? (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            No Stripe account connected yet.
          </div>
        ) : (
          <Filters inline />
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Fee</th>
                <th className="py-3 px-4">Net</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-neutral-500">Loading…</td></tr>
              ) : err ? (
                <tr><td colSpan={8} className="py-6 text-center text-red-600">{err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-neutral-500">No payments found.</td></tr>
              ) : rows.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-3 px-4 whitespace-nowrap">{p.created_fmt}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{p.customer_name || p.customer_email || '—'}</span>
                      {p.customer_email && <span className="text-xs text-neutral-500">{p.customer_email}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-[320px]">
                    <div className="truncate" title={p.description || ''}>{p.description || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-neutral-400" />
                      <span>{p.pm_type}</span>
                      {p.card_brand && <span className="text-xs text-neutral-500">({p.card_brand} •••• {p.last4})</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{formatMoney(p.amount, p.currency)}</td>
                  <td className="py-3 px-4">{p.fee_minor != null ? formatMoney(p.fee_minor, p.currency) : '—'}</td>
                  <td className="py-3 px-4">{p.net_minor != null ? formatMoney(p.net_minor, p.currency) : '—'}</td>
                  <td className="py-3 px-4"><Pill tone={toneFor(p.status)}>{p.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-neutral-50">
          <div className="text-xs text-neutral-500">
            {rows.length > 0 && `${rows.length} result${rows.length === 1 ? '' : 's'} on this page`}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50" disabled={loading || prevStack.length===0}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button onClick={goNext} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50" disabled={loading || !hasMore}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile list (cards) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center text-neutral-500 py-10">Loading…</div>
        ) : err ? (
          <div className="text-center text-red-600 py-6">{err}</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-neutral-500 py-10">No payments found.</div>
        ) : rows.map((p)=>(
          <div key={p.id} className="bg-white border rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-neutral-500">{p.created_fmt}</div>
                <div className="font-medium truncate">{p.customer_name || p.customer_email || '—'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">{formatMoney(p.amount, p.currency)}</div>
                <div className="mt-1"><Pill tone={toneFor(p.status)}>{p.status}</Pill></div>
              </div>
            </div>
            {p.description && <div className="mt-2 text-sm text-neutral-600 line-clamp-2">{p.description}</div>}
            <div className="mt-3 text-sm text-neutral-600 flex items-center gap-1">
              <CreditCard className="h-4 w-4 text-neutral-400" />
              <span className="truncate">
                {p.pm_type}
                {p.card_brand ? ` · ${p.card_brand} •••• ${p.last4}` : ''}
              </span>
            </div>
          </div>
        ))}

        {/* Pager (mobile) */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between py-2">
            <button onClick={goPrev} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-white disabled:opacity-50" disabled={loading || prevStack.length===0}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button onClick={goNext} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-white disabled:opacity-50" disabled={loading || !hasMore}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filters Drawer */}
      {filtersOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Filters</div>
              <button className="p-2 -mr-2" aria-label="Close filters" onClick={()=>setFiltersOpen(false)}>
                <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <Filters />
            <div className="flex items-center gap-2 pt-2">
              <button className="flex-1 rounded-lg border px-3 py-2" onClick={()=>{ setQuery(''); setStatus('any'); setFrom(''); setTo(''); }}>
                Clear
              </button>
              <button className="flex-1 rounded-lg bg-zinc-600 text-white px-3 py-2" onClick={()=>{ setFiltersOpen(false); fetchPage({ replaceHistory:true }); }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
