import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useUserProfile } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext.jsx';
import Badge from '../../components/Badge';
import Dropdown from '../../components/Dropdown';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import {
  deleteGustoMapping,
  fetchCrewMembers,
  fetchGustoEmployees,
  fetchGustoExports,
  fetchGustoMappings,
  fetchGustoPayPeriod,
  fetchGustoSettings,
  fetchGustoStatus,
  getGustoHealth,
  getGustoReconciliation,
  bulkRetryGustoReconciliation,
  pauseGustoExports,
  fetchGustoRunbook,
  maintenanceRetryEligible,
  resumeGustoExports,
  retryGustoExport,
  saveGustoMapping,
  saveGustoPayPeriod,
  saveGustoSettings,
  reexportGustoTimecard,
} from '../../api/gusto';

const cardCls = 'bg-white border border-neutral-200 rounded-lg shadow-sm p-4 space-y-4';
const sectionTitleCls = 'text-lg font-semibold text-neutral-900';
const inputCls = 'border border-neutral-300 rounded-lg px-3 text-sm w-full h-11 min-h-[44px]';
const primaryBtnCls =
  'inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-lg bg-neutral-900 text-white text-sm font-semibold whitespace-nowrap hover:bg-neutral-800 disabled:opacity-60';
const secondaryBtnCls =
  'inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 whitespace-nowrap hover:bg-neutral-50 disabled:opacity-60';

const friendlyDate = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch {
    return '—';
  }
};

const truncate = (str, len = 120) => {
  if (!str) return '';
  if (str.length <= len) return str;
  return `${str.slice(0, len - 1)}…`;
};

const statusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'succeeded' || s === 'exported' || s === 'success') return 'green';
  if (s === 'failed' || s === 'error') return 'red';
  if (s === 'pending' || s === 'queued') return 'yellow';
  return 'gray';
};

export default function GustoIntegration({ embedded }) {
  const profileCtx = useUserProfile() || {};
  const profile = profileCtx.profile || profileCtx.user || null;
  const loadingProfile = profileCtx.loadingProfile || false;
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};

  const [connection, setConnection] = useState(null);
  const [connectionError, setConnectionError] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(false);

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [delayDays, setDelayDays] = useState(7);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsToast, setSettingsToast] = useState(false);

  const [crew, setCrew] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [mappings, setMappings] = useState({});
  const [draftMappings, setDraftMappings] = useState({});
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState('');
  const [mappingBusy, setMappingBusy] = useState({});

  const [exportsList, setExportsList] = useState([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [exportsError, setExportsError] = useState('');
  const [retrying, setRetrying] = useState({});
  const [exportsFilter, setExportsFilter] = useState('all');

  const [payPeriod, setPayPeriod] = useState({
    type: 'weekly',
    anchor_weekday: 1,
    anchor_date: '',
    timezone: 'America/New_York',
  });
  const [payPeriodLoading, setPayPeriodLoading] = useState(false);
  const [payPeriodSaving, setPayPeriodSaving] = useState(false);
  const [payPeriodError, setPayPeriodError] = useState('');
  const [payPeriodToast, setPayPeriodToast] = useState(false);
  const [payPeriodFieldErrors, setPayPeriodFieldErrors] = useState({});
  const [paused, setPaused] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);

  const [reconRange, setReconRange] = useState({
    period_start: '',
    period_end: '',
  });
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');
  const [reconRows, setReconRows] = useState([]);
  const [reconSelection, setReconSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [reconRetrying, setReconRetrying] = useState({});
  const [runbookOpen, setRunbookOpen] = useState(false);
  const [runbookLoading, setRunbookLoading] = useState(false);
  const [runbookError, setRunbookError] = useState('');
  const [runbookContent, setRunbookContent] = useState(null);
  const [health, setHealth] = useState(null);

  const getToken = useCallback(async () => null, []);

  const isOwner = useMemo(() => (profile?.role || '').toLowerCase() === 'owner', [profile]);

  const connectUrl = '/api/integrations/gusto/connect';

  const loadConnection = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError('');
    try {
      const token = await getToken();
      const data = await fetchGustoStatus(token);
      setConnection(data || {});
      const pausedVal = Boolean(
        data?.paused ||
          data?.exports_paused ||
          data?.gusto_paused ||
          (data?.status || '').toLowerCase() === 'paused'
      );
      setPaused(pausedVal);
    } catch (e) {
      setConnection(null);
      const status = e?.response?.status;
      if (status === 404 || status === 405) {
        setConnectionError('Gusto integration is not enabled for this account.');
      } else {
        setConnectionError(e?.response?.data?.error || e?.message || 'Failed to load connection status');
      }
    } finally {
      setConnectionLoading(false);
    }
  }, [getToken]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError('');
    try {
      const token = await getToken();
      const data = await fetchGustoSettings(token);
      const days = Number(data?.payroll_run_delay_days ?? data?.payroll_delay_days ?? 7);
      setDelayDays(Number.isFinite(days) ? days : 7);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404 || status === 405) {
        setDelayDays(7);
        setSettingsError('');
      } else {
        setSettingsError(e?.response?.data?.error || e?.message || 'Failed to load settings');
      }
    } finally {
      setSettingsLoading(false);
    }
  }, [getToken]);

  const loadMappings = useCallback(async () => {
    setMappingLoading(true);
    setMappingError('');
    try {
      const token = await getToken();
      const [crewRes, employeesRes, mappingsRes] = await Promise.all([
        fetchCrewMembers(token),
        fetchGustoEmployees(token),
        fetchGustoMappings(token),
      ]);

      const crewList = Array.isArray(crewRes) ? crewRes : [];
      const employeesList = Array.isArray(employeesRes?.employees)
        ? employeesRes.employees
        : Array.isArray(employeesRes)
        ? employeesRes
        : [];

      const mappingsList = Array.isArray(mappingsRes?.mappings)
        ? mappingsRes.mappings
        : Array.isArray(mappingsRes)
        ? mappingsRes
        : [];

      const byUser = {};
      mappingsList.forEach((m) => {
        const userId = m?.payhive_user_id || m?.user_id || m?.id;
        if (!userId) return;
        byUser[userId] = {
          gustoEmployeeId: m?.gusto_employee_id || m?.employee_id || '',
          gustoJobId: m?.gusto_job_id || m?.job_id || '',
        };
      });

      setCrew(crewList);
      setEmployees(employeesList);
      setMappings(byUser);
      setDraftMappings(byUser);
    } catch (e) {
      console.error('[Gusto] loadMappings error', e?.response?.data || e);
      setMappingError(e?.response?.data?.error || e?.message || 'Failed to load mappings');
    } finally {
      setMappingLoading(false);
    }
  }, [getToken]);

  const loadExports = useCallback(async () => {
    setExportsLoading(true);
    setExportsError('');
    try {
      const token = await getToken();
      const data = await fetchGustoExports(
        {
          limit: 25,
          status: exportsFilter === 'all' ? undefined : exportsFilter,
        },
        token
      );
      const list = Array.isArray(data?.jobs) ? data.jobs : Array.isArray(data) ? data : [];
      setExportsList(list);
    } catch (e) {
      setExportsError(e?.response?.data?.error || e?.message || 'Failed to load export jobs');
    } finally {
      setExportsLoading(false);
    }
  }, [getToken, exportsFilter]);

  const loadPayPeriod = useCallback(async () => {
    setPayPeriodLoading(true);
    setPayPeriodError('');
    setPayPeriodFieldErrors({});
    try {
      const token = await getToken();
      const data = await fetchGustoPayPeriod(token);
      const anchorRaw = data?.anchor_date || data?.start_date || '';
      const anchorDate = anchorRaw ? String(anchorRaw).slice(0, 10) : '';
      setPayPeriod({
        type: data?.type || data?.period_type || 'weekly',
        anchor_weekday: Number(
          data?.anchor_weekday ??
            data?.weekday ??
            data?.week_anchor ??
            payPeriod.anchor_weekday
        ),
        anchor_date: anchorDate,
        timezone: data?.timezone || data?.time_zone || 'America/New_York',
      });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404 || status === 405) {
        // feature might be off; keep defaults silently
        setPayPeriodError('');
      } else {
        setPayPeriodError(e?.response?.data?.error || e?.message || 'Failed to load pay period');
      }
    } finally {
      setPayPeriodLoading(false);
    }
  }, [getToken, payPeriod.anchor_weekday]);

  const validatePayPeriod = () => {
    const errs = {};
    if (payPeriod.type === 'weekly' && (payPeriod.anchor_weekday === '' || payPeriod.anchor_weekday === null || Number.isNaN(Number(payPeriod.anchor_weekday)))) {
      errs.anchor_weekday = 'Select an anchor weekday.';
    }
    if (payPeriod.type === 'biweekly' && !payPeriod.anchor_date) {
      errs.anchor_date = 'Anchor date required for biweekly.';
    }
    if (!payPeriod.timezone) {
      errs.timezone = 'Timezone required.';
    }
    setPayPeriodFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePayPeriod = async () => {
    if (!validatePayPeriod()) return;
    setPayPeriodSaving(true);
    setPayPeriodError('');
    try {
      const token = await getToken();
      await saveGustoPayPeriod(
        {
          type: payPeriod.type,
          anchor_weekday: Number(payPeriod.anchor_weekday),
          anchor_date: payPeriod.anchor_date || null,
          timezone: payPeriod.timezone,
        },
        token
      );
      setPayPeriodToast(true);
    } catch (e) {
      setPayPeriodError(e?.response?.data?.error || e?.message || 'Failed to save pay period');
    } finally {
      setPayPeriodSaving(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadConnection();
      loadSettings();
      loadMappings();
      loadPayPeriod();
    }
  }, [isOwner, loadConnection, loadSettings, loadMappings, loadPayPeriod]);

  useEffect(() => {
    if (isOwner) {
      loadExports();
    }
  }, [isOwner, loadExports]);

  if (loadingProfile) {
    return <div className="p-4 md:p-6 text-neutral-600">Loading…</div>;
  }
  if (!isOwner) {
    return <Navigate to="/unauthorized" replace />;
  }

  const isConnected = connection?.connected || (connection?.status || '').toLowerCase() === 'connected';
  const missingMappings = useMemo(() => {
    if (!crew || crew.length === 0) return 0;
    return crew.filter((c) => {
      const draft = draftMappings?.[c.id] || {};
      return !draft?.gustoEmployeeId;
    }).length;
  }, [crew, draftMappings]);

  const updateDraft = (userId, field, value) => {
    setDraftMappings((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [field]: value },
    }));
  };

  const handleSaveSettings = async () => {
    const days = Number(delayDays);
    if (!Number.isFinite(days) || days < 0) {
      setSettingsError('Enter a valid number of days (0 or more).');
      return;
    }
    setSavingSettings(true);
    setSettingsError('');
    try {
      const token = await getToken();
      await saveGustoSettings({ payroll_run_delay_days: days }, token);
      setSettingsToast(true);
    } catch (e) {
      setSettingsError(e?.response?.data?.error || e?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveMapping = async (userId) => {
    const draft = draftMappings[userId] || {};
    if (!draft.gustoEmployeeId) return;
    setMappingBusy((prev) => ({ ...prev, [userId]: 'saving' }));
    setMappingError('');
    try {
      const token = await getToken();
      await saveGustoMapping(
        {
          payhive_user_id: userId,
          gusto_employee_id: draft.gustoEmployeeId,
          gusto_job_id: draft.gustoJobId || null,
        },
        token
      );
      setMappings((prev) => ({
        ...prev,
        [userId]: { gustoEmployeeId: draft.gustoEmployeeId, gustoJobId: draft.gustoJobId || '' },
      }));
    } catch (e) {
      setMappingError(e?.response?.data?.error || e?.message || 'Failed to save mapping');
    } finally {
      setMappingBusy((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const handleUnmap = async (userId) => {
    setMappingBusy((prev) => ({ ...prev, [userId]: 'unmapping' }));
    setMappingError('');
    try {
      const token = await getToken();
      await deleteGustoMapping(userId, token);
      setMappings((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setDraftMappings((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (e) {
      setMappingError(e?.response?.data?.error || e?.message || 'Failed to unmap user');
    } finally {
      setMappingBusy((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const handleRetry = async (jobId) => {
    setRetrying((prev) => ({ ...prev, [jobId]: true }));
    setExportsError('');
    try {
      const token = await getToken();
      await retryGustoExport(jobId, token);
      await loadExports();
    } catch (e) {
      setExportsError(e?.response?.data?.error || e?.message || 'Retry failed');
    } finally {
      setRetrying((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
    }
  };

  const handleTogglePause = async () => {
    setToggleBusy(true);
    try {
      const token = await getToken();
      if (paused) {
        await resumeGustoExports(token);
        setPaused(false);
      } else {
        await pauseGustoExports(token);
        setPaused(true);
      }
      await loadConnection();
    } catch (e) {
      setConnectionError(e?.response?.data?.error || e?.message || 'Failed to update pause state');
    } finally {
      setToggleBusy(false);
    }
  };

  const loadReconciliation = async () => {
    if (!reconRange.period_start || !reconRange.period_end) {
      setReconError('Select a start and end date.');
      return;
    }
    setReconLoading(true);
    setReconError('');
    setReconSelection({});
    setBulkResult(null);
    try {
      const token = await getToken();
      const data = await getGustoReconciliation(
        {
          period_start: reconRange.period_start,
          period_end: reconRange.period_end,
        },
        token
      );
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setReconRows(list);
    } catch (e) {
      setReconRows([]);
      setReconError(e?.response?.data?.error || e?.message || 'Failed to load reconciliation');
    } finally {
      setReconLoading(false);
    }
  };

  const loadHealth = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getGustoHealth(token);
      setHealth(data || {});
    } catch (e) {
      // silent; widget will show unknown
      setHealth(null);
    }
  }, [getToken]);

  useEffect(() => {
    if (isOwner) {
      loadHealth();
    }
  }, [isOwner, loadHealth]);

  const toggleSelect = (id) => {
    setReconSelection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const bulkRetry = async () => {
    const ids = Object.entries(reconSelection)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    if (!ids.length) return;
    setBulkBusy(true);
    setBulkResult(null);
    try {
      const token = await getToken();
      const data = await bulkRetryGustoReconciliation({ timecard_ids: ids }, token);
      setBulkResult(data || { success: ids.length });
      await loadReconciliation();
    } catch (e) {
      setBulkResult({ error: e?.response?.data?.error || e?.message || 'Bulk retry failed' });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleReconRetry = async (timecardId) => {
    setReconRetrying((prev) => ({ ...prev, [timecardId]: true }));
    setReconError('');
    try {
      const token = await getToken();
      await reexportGustoTimecard(timecardId, token);
      await loadReconciliation();
    } catch (e) {
      setReconError(e?.response?.data?.error || e?.message || 'Retry failed');
    } finally {
      setReconRetrying((prev) => {
        const next = { ...prev };
        delete next[timecardId];
        return next;
      });
    }
  };

  const loadRunbook = async (errorCode) => {
    setRunbookOpen(true);
    setRunbookLoading(true);
    setRunbookError('');
    setRunbookContent(null);
    try {
      const token = await getToken();
      const data = await fetchGustoRunbook(errorCode, token);
      setRunbookContent(data || {});
    } catch (e) {
      setRunbookError(e?.response?.data?.error || e?.message || 'Failed to load runbook');
    } finally {
      setRunbookLoading(false);
    }
  };

  const maintenanceRetry = async () => {
    setBulkBusy(true);
    try {
      const token = await getToken();
      const data = await maintenanceRetryEligible(token);
      setBulkResult({
        success: data?.retried_count || data?.success_count,
        skipped: data?.skipped_count,
        message: data?.message,
      });
      await loadReconciliation();
    } catch (e) {
      setBulkResult({ error: e?.response?.data?.error || e?.message || 'Retry failed' });
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header with Gusto branding */}
      {!embedded && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#f45d48] text-white font-bold text-lg">
                G
              </div>
              <h1 className="text-2xl font-bold text-neutral-900">Gusto Integration</h1>
            </div>
            <p className="text-sm text-neutral-600">
              Connect PayHive to Gusto, control export timing, map crew to employees, and monitor export jobs.
            </p>
          </div>
          <Badge color={
            health?.status === 'red'
              ? 'red'
              : health?.status === 'yellow'
              ? 'yellow'
              : isConnected
              ? 'green'
              : 'gray'
          }>
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      )}

      {/* Integration Health - full width summary bar */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-neutral-900">Integration Health</div>
          <button
            type="button"
            onClick={loadHealth}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="text-xs text-neutral-500 mb-1">Mapped Crew</div>
            <div className="text-lg font-semibold text-neutral-900">
              {health?.mapped_crew ?? '--'} <span className="text-neutral-400 font-normal">/ {health?.total_crew ?? '--'}</span>
            </div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="text-xs text-neutral-500 mb-1">Failed Exports</div>
            <div className={`text-lg font-semibold ${(health?.eligible_failed ?? 0) > 0 ? 'text-red-600' : 'text-neutral-900'}`}>
              {health?.eligible_failed ?? 0}
            </div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="text-xs text-neutral-500 mb-1">Pending</div>
            <div className="text-lg font-semibold text-neutral-900">
              {health?.pending ?? 0}
            </div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="text-xs text-neutral-500 mb-1">Last Export</div>
            <div className="text-sm font-medium text-neutral-900 truncate">
              {friendlyDate(health?.last_export_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Connection and Exports Control - side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={sectionTitleCls}>Connection</span>
              {isConnected ? (
                <Badge color="green">Connected</Badge>
              ) : (
                <Badge color="red">Not Connected</Badge>
              )}
            </div>
          </div>

          {(connection?.gusto_needs_reconnect || connection?.needs_reconnect) && (
            <div className="border border-amber-200 bg-amber-50 rounded-md p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <div className="space-y-2">
                <div className="font-semibold">Connection needs reconnect</div>
                <button
                  className={primaryBtnCls}
                  onClick={() => window.location.assign(connectUrl)}
                >
                  Reconnect to Gusto
                </button>
              </div>
            </div>
          )}

          {connectionLoading && (
            <div className="text-sm text-neutral-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking connection…
            </div>
          )}
          {connectionError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {connectionError}
            </div>
          )}

          {isConnected ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Connected to Gusto</span>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                {connection?.company_name && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Company</span>
                    <span className="font-medium text-neutral-900">{connection.company_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">Token expires</span>
                  <span className="text-neutral-700">{friendlyDate(connection?.token_expires_at || connection?.token_expiry)}</span>
                </div>
              </div>
              <button
                className={secondaryBtnCls + ' w-full'}
                onClick={() => window.location.assign(connectUrl)}
                disabled={connectionLoading}
              >
                Reconnect to Gusto
                <ExternalLink className="w-4 h-4 ml-2" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Connect your Gusto account to automatically export timecards and sync employee data.
              </p>
              <button
                className={primaryBtnCls + ' w-full'}
                onClick={() => window.location.assign(connectUrl)}
                disabled={connectionLoading}
              >
                Connect to Gusto
                <ExternalLink className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}
        </div>

        <div className={cardCls}>
          <div className="flex items-center justify-between gap-3">
            <span className={sectionTitleCls}>Exports Control</span>
            <Badge color={paused ? 'yellow' : 'green'}>{paused ? 'Paused' : 'Active'}</Badge>
          </div>
          <p className="text-sm text-neutral-600">
            Pause stops new exports from being sent to Gusto. Existing exports stay untouched.
          </p>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={toggleBusy}
            className={paused ? primaryBtnCls + ' w-full' : secondaryBtnCls + ' w-full'}
          >
            {toggleBusy ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Updating…
              </span>
            ) : paused ? (
              'Resume exports'
            ) : (
              'Pause exports'
            )}
          </button>
        </div>
      </div>

      {/* Payroll Settings - side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cardCls}>
          <span className={sectionTitleCls}>Payroll Export Timing</span>
          <p className="text-sm text-neutral-600">
            Configure when timecards become eligible for export to Gusto.
          </p>
          {settingsError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {settingsError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-800">
              Days after time block to export
            </label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={delayDays}
              onChange={(e) => setDelayDays(e.target.value)}
              disabled={settingsLoading || savingSettings}
            />
            <div className="text-xs text-neutral-500">
              PayHive schedules eligibility only — it does not run payroll.
            </div>
          </div>
          <button
            className={primaryBtnCls}
            onClick={handleSaveSettings}
            disabled={settingsLoading || savingSettings}
          >
            {savingSettings ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </span>
            ) : (
              'Save'
            )}
          </button>
        </div>

        <div className={cardCls}>
          <span className={sectionTitleCls}>Pay Period</span>
          <p className="text-sm text-neutral-600">
            Define your pay period schedule for accurate timecard grouping.
          </p>
          {payPeriodError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {payPeriodError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Period type</label>
              <select
                className={inputCls}
                value={payPeriod.type}
                onChange={(e) =>
                  setPayPeriod((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                disabled={payPeriodSaving}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Anchor weekday</label>
              <select
                className={inputCls}
                value={payPeriod.anchor_weekday ?? ''}
                onChange={(e) =>
                  setPayPeriod((prev) => ({
                    ...prev,
                    anchor_weekday: Number(e.target.value),
                  }))
                }
                disabled={payPeriodSaving || payPeriod.type !== 'weekly'}
              >
                <option value="">Select</option>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
              {payPeriodFieldErrors.anchor_weekday && (
                <div className="text-xs text-rose-700">{payPeriodFieldErrors.anchor_weekday}</div>
              )}
            </div>
          </div>
          {payPeriod.type === 'biweekly' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Anchor date</label>
              <input
                type="date"
                className={inputCls}
                value={payPeriod.anchor_date || ''}
                onChange={(e) =>
                  setPayPeriod((prev) => ({
                    ...prev,
                    anchor_date: e.target.value,
                  }))
                }
                disabled={payPeriodSaving}
              />
              {payPeriodFieldErrors.anchor_date && (
                <div className="text-xs text-rose-700">{payPeriodFieldErrors.anchor_date}</div>
              )}
            </div>
          )}
          <button
            className={primaryBtnCls}
            onClick={handleSavePayPeriod}
            disabled={payPeriodSaving || payPeriodLoading}
          >
            {payPeriodSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </span>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={sectionTitleCls}>User Mapping</span>
            {missingMappings > 0 ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                {missingMappings} missing
              </span>
            ) : (
              <Badge color="green">All mapped</Badge>
            )}
          </div>
          <button
            className={secondaryBtnCls}
            onClick={loadMappings}
            disabled={mappingLoading}
            title="Refresh mappings"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${mappingLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {mappingError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {mappingError}
          </div>
        )}

        {mappingLoading ? (
          <div className="text-sm text-neutral-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading crew and employees…
          </div>
        ) : crew.length === 0 ? (
          <div className="text-sm text-neutral-600">No crew members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-700 border-b">
                  <th className="py-2 pr-4 font-semibold">PayHive User</th>
                  <th className="py-2 pr-4 font-semibold">Gusto Employee</th>
                  <th className="py-2 pr-4 font-semibold">Job</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {crew.map((user) => {
                  const draft = draftMappings[user.id] || { gustoEmployeeId: '', gustoJobId: '' };
                  const current = mappings[user.id] || { gustoEmployeeId: '', gustoJobId: '' };
                  const selectedEmployee = employees.find(
                    (e) => String(e.id) === String(draft.gustoEmployeeId)
                  );
                  const jobs = Array.isArray(selectedEmployee?.jobs) ? selectedEmployee.jobs : [];
                  const hasChanges =
                    draft.gustoEmployeeId &&
                    (String(draft.gustoEmployeeId) !== String(current.gustoEmployeeId || '') ||
                      String(draft.gustoJobId || '') !== String(current.gustoJobId || ''));
                  const busy = mappingBusy[user.id];

                  const employeeOptions = employees.map((e) => ({
                    value: String(e.id),
                    label: `${e.name || e.full_name || e.email || 'Employee'}${e.email ? ` (${e.email})` : ''}`,
                  }));

                  const jobOptions = jobs.map((j) => ({
                    value: String(j.id || j.job_id || j.gusto_job_id || ''),
                    label: j.title || j.name || 'Job',
                  }));

                  return (
                    <tr key={user.id} className="align-top">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-neutral-900">{user.name || 'Crew member'}</div>
                        <div className="text-xs text-neutral-600">{user.email || 'No email'}</div>
                      </td>
                      <td className="py-3 pr-4 min-w-[220px]">
                        <Dropdown
                          options={employeeOptions}
                          value={draft.gustoEmployeeId || ''}
                          onChange={(val) => {
                            updateDraft(user.id, 'gustoEmployeeId', val);
                            updateDraft(user.id, 'gustoJobId', '');
                          }}
                          placeholder="Select employee"
                          disabled={!!busy}
                        />
                      </td>
                      <td className="py-3 pr-4 min-w-[180px]">
                        <Dropdown
                          options={jobOptions}
                          value={draft.gustoJobId || ''}
                          onChange={(val) => updateDraft(user.id, 'gustoJobId', val)}
                          placeholder={jobs.length ? 'Select job (optional)' : 'No jobs'}
                          disabled={!!busy || jobs.length === 0}
                        />
                      </td>
                      <td className="py-3 flex items-center gap-2">
                        <button
                          className={primaryBtnCls}
                          onClick={() => handleSaveMapping(user.id)}
                          disabled={!!busy || !hasChanges}
                        >
                          {busy === 'saving' ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                            </span>
                          ) : (
                            'Save'
                          )}
                        </button>
                        {current.gustoEmployeeId && (
                          <button
                            className={secondaryBtnCls}
                            onClick={() => handleUnmap(user.id)}
                            disabled={!!busy}
                          >
                            {busy === 'unmapping' ? 'Removing…' : 'Unmap'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={sectionTitleCls}>Reconciliation</span>
              {paused ? <Badge color="yellow">Exports paused</Badge> : null}
            </div>
            <div className="text-xs text-neutral-600">Check eligibility and retry failed exports.</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-neutral-700 flex flex-col">
              <span className="text-[11px] text-neutral-500">Start</span>
              <input
                type="date"
                className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
                value={reconRange.period_start}
                onChange={(e) => setReconRange((prev) => ({ ...prev, period_start: e.target.value }))}
              />
            </label>
            <label className="text-xs text-neutral-700 flex flex-col">
              <span className="text-[11px] text-neutral-500">End</span>
              <input
                type="date"
                className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
                value={reconRange.period_end}
                onChange={(e) => setReconRange((prev) => ({ ...prev, period_end: e.target.value }))}
              />
            </label>
            <button
              type="button"
              onClick={loadReconciliation}
              disabled={reconLoading}
              className={secondaryBtnCls}
            >
              {reconLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Load reconciliation
            </button>
          </div>
        </div>

        {reconError ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
            {reconError}
          </div>
        ) : null}

          <div className="flex items-center gap-2 mb-2 flex-wrap">
          <input
            type="checkbox"
            checked={
              reconRows.length > 0 &&
              reconRows.every((r) => {
                const id = r.timecard_id || r.id;
                return !id || reconSelection[id];
              })
            }
            onChange={(e) => {
              const checked = e.target.checked;
              const next = {};
              if (checked) {
                reconRows.forEach((r) => {
                  const id = r.timecard_id || r.id;
                  if (id) next[id] = true;
                });
              }
              setReconSelection(next);
            }}
          />
          <button
            type="button"
            onClick={bulkRetry}
            disabled={bulkBusy || Object.values(reconSelection).filter(Boolean).length === 0}
            className={primaryBtnCls}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Bulk retry
          </button>
          <button
            type="button"
            onClick={maintenanceRetry}
            disabled={bulkBusy}
            className={secondaryBtnCls}
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Retry all eligible failures
          </button>
          <div className="text-xs text-neutral-500">
            {Object.values(reconSelection).filter(Boolean).length} selected
          </div>
        </div>

        {reconLoading ? (
          <div className="text-sm text-neutral-700 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading reconciliation…
          </div>
        ) : reconRows.length === 0 ? (
          <div className="text-sm text-neutral-600">No reconciliation rows loaded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-700 border-b">
                  <th className="py-2 pr-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        reconRows.length > 0 &&
                        reconRows.every((r) => {
                          const id = r.timecard_id || r.id;
                          return !id || reconSelection[id];
                        })
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next = {};
                        if (checked) {
                          reconRows.forEach((r) => {
                            const id = r.timecard_id || r.id;
                            if (id) next[id] = true;
                          });
                        }
                        setReconSelection(next);
                      }}
                    />
                  </th>
                  <th className="py-2 pr-4 font-semibold">Timecard</th>
                  <th className="py-2 pr-4 font-semibold">Crew member</th>
                  <th className="py-2 pr-4 font-semibold">Period</th>
                  <th className="py-2 pr-4 font-semibold">Eligible at</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Action needed</th>
                  <th className="py-2 pr-4 font-semibold">Last error</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reconRows.map((row) => {
                  const id = row.timecard_id || row.id;
                  const hasId = !!id;
                  const status = row.export_status || row.status;
                  const statusC = statusColor(status);
                  const member = row.crew_member || row.user_name || row.user || {};
                  const eligibleAt = row.eligible_at || row.export_eligible_at;
                  const eligibleDate = eligibleAt ? new Date(eligibleAt) : null;
                  const now = Date.now();
                  const eligibleFuture = eligibleDate && eligibleDate.getTime() > now;
                  const eligibleLabel = eligibleDate ? friendlyDate(eligibleDate) : 'Unknown';
                  const flagsArr = Array.isArray(row.action_flags) ? row.action_flags : [];
                  const mappingMissing = row.missing_mapping || row.mapping_missing || flagsArr.includes('MISSING_MAPPING');
                  const openShift = row.open_shift || row.open_shifts || flagsArr.includes('OPEN_SHIFT');
                  const rowPaused = row.paused || paused || flagsArr.includes('PAUSED');
                  const disconnected = !isConnected || flagsArr.includes('DISCONNECTED');
                  const actionNeeded = [];
                  if (mappingMissing) actionNeeded.push('MISSING_MAPPING');
                  if (openShift) actionNeeded.push('OPEN_SHIFT');
                  if (disconnected) actionNeeded.push('DISCONNECTED');
                  if (rowPaused) actionNeeded.push('PAUSED');
                  if (eligibleFuture) actionNeeded.push('NOT_ELIGIBLE');
                  const canRetry =
                    hasId &&
                    !eligibleFuture &&
                    !rowPaused &&
                    !mappingMissing &&
                    statusC === 'red' &&
                    !reconRetrying[id];
                  const actionsSelected = !!reconSelection[id];
                  const crewLabel =
                    typeof member === 'string'
                      ? member
                      : `${member.name || member.full_name || 'Crew member'}${
                          member.email ? ` (${member.email})` : ''
                        }`;
                  return (
                    <tr key={id || status} className="align-top">
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={!!actionsSelected}
                          disabled={!hasId}
                          onChange={() => hasId && toggleSelect(id)}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        {id ? (
                          <Link to={`/app/crews?timecard=${id}`} className="text-amber-700 hover:underline">
                            {id}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-4 text-neutral-800">{crewLabel}</td>
                      <td className="py-3 pr-4 text-neutral-800">
                        {row.period_start || row.start} – {row.period_end || row.end}
                      </td>
                      <td className="py-3 pr-4 text-neutral-800">
                        {eligibleFuture ? (
                          <Badge color="yellow">Not eligible yet</Badge>
                        ) : (
                          eligibleLabel
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge color={rowPaused ? 'yellow' : statusC}>{rowPaused ? 'paused' : status || 'unknown'}</Badge>
                          {disconnected ? <Badge color="red">DISCONNECTED</Badge> : null}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          {actionNeeded.length === 0 ? (
                            <Badge color="green">Ready</Badge>
                          ) : (
                            actionNeeded.map((a) => (
                              <Badge key={a} color="yellow">{a}</Badge>
                            ))
                          )}
                          {mappingMissing ? (
                            <Link to="/app/admin/integrations/gusto" className="text-amber-700 text-xs underline">
                              Go to mappings
                            </Link>
                          ) : null}
                          {openShift && hasId ? (
                            <Link to={`/app/crews?timecard=${id}`} className="text-amber-700 text-xs underline">
                              View logs
                            </Link>
                          ) : null}
                          {disconnected ? <Badge color="red">DISCONNECTED</Badge> : null}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-neutral-700 max-w-xs space-y-1">
                        {row.error_code ? (
                          <div className="text-[11px] text-neutral-500 font-mono">code: {row.error_code}</div>
                        ) : null}
                        {row.last_error || row.error ? truncate(row.last_error || row.error, 160) : '—'}
                        {(row.error_code || row.last_error || row.error) && (
                          <button
                            type="button"
                            onClick={() => loadRunbook(row.error_code)}
                            className="text-xs text-amber-700 underline"
                          >
                            How to fix
                          </button>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => handleReconRetry(id)}
                          disabled={!canRetry}
                          className={primaryBtnCls}
                        >
                          {reconRetrying[id] ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Retrying…
                            </span>
                          ) : (
                            'Retry'
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={sectionTitleCls}>Export Jobs</span>
          <button
            className={secondaryBtnCls}
            onClick={loadExports}
            disabled={exportsLoading}
            title="Refresh jobs"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${exportsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-xs text-neutral-600 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Recent exports (limit 25)
          </div>
          <label className="text-xs text-neutral-700 flex items-center gap-2">
            Status
            <select
              className="border border-neutral-300 rounded-md px-2 py-1 text-xs"
              value={exportsFilter}
              onChange={(e) => setExportsFilter(e.target.value)}
              disabled={exportsLoading}
            >
              <option value="all">All</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
              <option value="succeeded">Success</option>
              <option value="exported">Exported</option>
              <option value="pending">Pending</option>
            </select>
          </label>
        </div>

        {exportsError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {exportsError}
          </div>
        )}

        {exportsLoading ? (
          <div className="text-sm text-neutral-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading jobs…
          </div>
        ) : exportsList.length === 0 ? (
          <div className="text-sm text-neutral-600">No export jobs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-700 border-b">
                  <th className="py-2 pr-4 font-semibold">Timecard</th>
                  <th className="py-2 pr-4 font-semibold">Export Version</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Attempts</th>
                  <th className="py-2 pr-4 font-semibold">Last Error</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exportsList.map((job) => {
                  const status = job.status || job.state;
                  const color = statusColor(status);
                  const jobId = job.id || job.job_id || job.gusto_job_id;
                  const failed = color === 'red';
                  const success = color === 'green';
                  const attempts = job.attempts ?? job.retry_count ?? 0;
                  return (
                    <tr key={jobId || job.created_at} className="align-top">
                      <td className="py-3 pr-4 text-neutral-800">{job.timecard_id || job.timecardId || '—'}</td>
                      <td className="py-3 pr-4 text-neutral-800">{job.export_version || job.version || job.export_version_number || '—'}</td>
                      <td className="py-3 pr-4">
                        <Badge color={color}>{status || 'unknown'}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-neutral-800">{attempts}</td>
                      <td className="py-3 pr-4 text-neutral-700 max-w-xs">
                        {job.last_error || job.error ? (
                          <span className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                            <span>{truncate(job.last_error || job.error, 160)}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                        {(job.error_code || job.last_error || job.error) && (
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            {job.error_code ? (
                              <span className="font-mono text-neutral-500">code: {job.error_code}</span>
                            ) : null}
                            <button
                              type="button"
                              className="text-amber-700 underline"
                              onClick={() => loadRunbook(job.error_code)}
                            >
                              How to fix
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        {failed ? (
                          <button
                            className={primaryBtnCls}
                            onClick={() => handleRetry(jobId)}
                            disabled={!!retrying[jobId]}
                          >
                            {retrying[jobId] ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Retrying…
                              </span>
                            ) : (
                              'Retry'
                            )}
                          </button>
                        ) : success ? (
                          <Badge color="green">Exported</Badge>
                        ) : (
                          <Badge color="yellow">{status || 'Pending'}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast show={settingsToast} onClose={() => setSettingsToast(false)} duration={2400}>
        Settings saved
      </Toast>
      <Toast show={payPeriodToast} onClose={() => setPayPeriodToast(false)} duration={2400}>
        Pay period saved
      </Toast>
      <Toast show={!!bulkResult} onClose={() => setBulkResult(null)} duration={3200}>
        {bulkResult?.error
          ? bulkResult.error
          : `Bulk retry complete${bulkResult?.success ? `: ${bulkResult.success} succeeded` : ''}${bulkResult?.skipped ? ` • Skipped: ${bulkResult.skipped}` : ''}${
              bulkResult?.message ? ` (${bulkResult.message})` : ''
            }`}
      </Toast>
      <Modal open={runbookOpen} onClose={() => setRunbookOpen(false)}>
        <div className="space-y-3">
          <div className="text-lg font-semibold text-neutral-900">How to fix</div>
          {runbookLoading ? (
            <div className="text-sm text-neutral-700 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading runbook…
            </div>
          ) : runbookError ? (
            <div className="text-sm text-rose-700">{runbookError}</div>
          ) : runbookContent ? (
            <div className="space-y-2 text-sm text-neutral-800">
              {runbookContent.message ? <div className="font-semibold">{runbookContent.message}</div> : null}
              {Array.isArray(runbookContent.steps) ? (
                <ol className="list-decimal list-inside space-y-1">
                  {runbookContent.steps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
              ) : null}
              {runbookContent.details ? (
                <details className="text-xs text-neutral-600">
                  <summary className="cursor-pointer text-neutral-700">Details</summary>
                  <div className="mt-1 whitespace-pre-wrap">{runbookContent.details}</div>
                </details>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-neutral-700">No runbook available.</div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRunbookOpen(false)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
