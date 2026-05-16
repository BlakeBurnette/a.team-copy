// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useUserProfile } from '../context/AuthContext';
import ResponsiveTabs from '../components/ResponsiveTabs';
import Toast from '../components/Toast';
import Dropdown from '../components/Dropdown';
import useUserSettings from '../hooks/useUserSettings';

// Reuse Admin components
import ZipcodeListInput from '../components/admin/ZipcodeListInput';
import ScheduleHoursEditor from '../components/admin/ScheduleHoursEditor';
import { INDUSTRY_OPTIONS } from '../components/admin/constants';

// Billing component
import PlatformBillingPanel from '../components/owner/PlatformBillingPanel';
import OnboardingChecklist from '../components/OnboardingChecklist';

// NEW: Messaging Settings tab
import MessagingSettings from './settings/MessagingSettings';
import ChecklistsSettings from './settings/Checklists';
import QuotesSettings from './settings/Quotes';
import QuickBooksSettings from './settings/QuickBooksSettings';
import { buildExportSchedulePayload } from './timecards/timecardUtils';
import { VERTICALS } from '../config/verticals';

const FieldLabel = ({ children }) => (
  <label className="block mb-1 font-semibold">{children}</label>
);

const Card = ({ title, children, actions }) => (
  <div className="bg-white rounded-lg shadow border border-neutral-200">
    <div className="px-4 py-3 border-b">
      <h3 className="text/base font-semibold">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
    {actions && <div className="px-4 py-3 border-t flex gap-2 flex-wrap">{actions}</div>}
  </div>
);

const StatusPill = ({ color = 'gray', children }) => {
  const map = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  };
  const cls = map[color] || map.gray;
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${cls}`}>
      {children}
    </span>
  );
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function cx(...xs) {
  return xs.filter(Boolean).join(' ');
}

const Toggle = ({ checked, onChange, disabled }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" checked={!!checked} onChange={onChange} disabled={disabled} />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
  </label>
);

function SettlementSettingsPanel({ rules, loading, error, saving, saved, onChange, onSave, role }) {
  const canEdit = role === 'owner';
  const isManager = role === 'manager';

  const update = (k, v) => onChange?.(k, v);

  const netOptions = [
    { label: 'Net-7', value: 7 },
    { label: 'Net-14', value: 14 },
    { label: 'Net-30', value: 30 },
    { label: 'Net-60', value: 60 },
    { label: 'Net-120', value: 120 },
  ];

  return (
    <div className="space-y-4">
      <Card title="Payment & Settlement">
        {loading && <div className="text-sm text-neutral-600">Loading settlement rules…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !rules && !error && <div className="text-sm text-neutral-600">No settlement rules loaded.</div>}

        {rules && (
          <div className="space-y-4">
            <div className="p-3 border rounded-lg bg-neutral-50">
              <div className="font-semibold text-sm text-neutral-800 mb-1">Auto-charge on completion</div>
              <div className="text-sm text-neutral-600">
                Default path: automatically charge the saved payment method when a service is marked complete. This is always available.
              </div>
            </div>

            {/* Net terms */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-neutral-800">Enable Net Terms (Net-X)</div>
                  <div className="text-xs text-neutral-600">Allow invoices to be due after completion.</div>
                </div>
                <Toggle
                  checked={rules.net_terms_enabled}
                  onChange={(e) => update('net_terms_enabled', e.target.checked)}
                  disabled={!canEdit}
                />
              </div>
              {rules.net_terms_enabled && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Default Net term</label>
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={rules.net_term_days || 30}
                    onChange={(e) => update('net_term_days', Number(e.target.value))}
                    disabled={!canEdit}
                  >
                    {netOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Down payment */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-neutral-800">Enable Down Payments</div>
                  <div className="text-xs text-neutral-600">Collect a percentage before work begins.</div>
                </div>
                <Toggle
                  checked={rules.down_payment_enabled}
                  onChange={(e) => update('down_payment_enabled', e.target.checked)}
                  disabled={!canEdit}
                />
              </div>
              {rules.down_payment_enabled && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Down payment (% of total)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    step={1}
                    value={rules.down_payment_percent ?? 30}
                    onChange={(e) => update('down_payment_percent', Number(e.target.value))}
                    disabled={!canEdit}
                    className="border rounded-lg px-3 py-2 text-sm w-32"
                  />
                  <div className="text-xs text-neutral-600">Down payment is due 7 days before the service start date.</div>
                </div>
              )}
            </div>

            {/* Multi-payment */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-neutral-800">Enable Multi-Payment Plans</div>
                  <div className="text-xs text-neutral-600">Split the remaining balance into installments.</div>
                </div>
                <Toggle
                  checked={rules.multi_payment_enabled}
                  onChange={(e) => update('multi_payment_enabled', e.target.checked)}
                  disabled={!canEdit}
                />
              </div>
              {rules.multi_payment_enabled && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">Default installments</label>
                    <input
                      type="number"
                      min={2}
                      max={24}
                      step={1}
                      value={rules.default_installments ?? 4}
                      onChange={(e) => update('default_installments', Number(e.target.value))}
                      disabled={!canEdit}
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">Days between installments</label>
                    <input
                      type="number"
                      min={7}
                      max={120}
                      step={1}
                      value={rules.default_installment_interval_days ?? 30}
                      onChange={(e) => update('default_installment_interval_days', Number(e.target.value))}
                      disabled={!canEdit}
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                    />
                  </div>
                  <div className="sm:col-span-2 text-xs text-neutral-600">
                    Multi-payment plans split the remaining balance into equal installments using these defaults. Actual plans can be customized per agreement.
                  </div>
                </div>
              )}
            </div>

            {/* Milestones */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-neutral-800">Allow milestone-based payment schedules</div>
                  <div className="text-xs text-neutral-600">Milestones are configured per job/contract; enable them here.</div>
                </div>
                <Toggle
                  checked={rules.milestones_enabled}
                  onChange={(e) => update('milestones_enabled', e.target.checked)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            {/* Late fee policy (read-only) */}
            <div className="border rounded-lg p-3 space-y-1 bg-neutral-50">
              <div className="font-semibold text-sm text-neutral-800">Late fee policy</div>
              <div className="text-sm text-neutral-700">
                ${((rules.late_fee_flat_cents || 0) / 100).toFixed(2)} late fee after {rules.late_fee_flat_grace_days || 0} days past due.
              </div>
              <div className="text-sm text-neutral-700">
                {(rules.late_fee_percent || 0)}% per month after {rules.late_fee_percent_grace_days || 0} days past due.
              </div>
              <div className="text-xs text-neutral-500">Late fees are read-only for now.</div>
            </div>

            {saved && <div className="text-sm text-green-700">Saved.</div>}
            {canEdit && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onSave?.()}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-neutral-800 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Settlement Settings'}
                </button>
              </div>
            )}
            {isManager && !canEdit && (
              <div className="text-xs text-neutral-500">Managers can view these settings but only owners can edit.</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

const Settings = () => {
  const authCtx = useUserProfile();
  const profile = authCtx?.profile || authCtx;
  const role = String(profile?.role || '').toLowerCase();
  const authLoading = authCtx?.loading || authCtx?.loadingProfile;
  const location = useLocation();
  const {
    settings: userSettings,
    loading: userSettingsLoading,
    error: userSettingsError,
    update: updateUserSettings,
  } = useUserSettings({ autoFetch: role === 'user' });

  // Tabs
  const canSeeOrgTab = ['owner', 'manager', 'admin'].includes(profile?.role);
  const canSeeQuotesTab = ['owner', 'admin'].includes(profile?.role);
  const tabs = useMemo(() => {
    const list = [];
    if (canSeeOrgTab) list.push('Organization', 'Billing', 'Messaging', 'Checklists', 'Settlement');
    if (canSeeQuotesTab) list.push('Quotes');
    list.push('User');
    return list;
  }, [canSeeOrgTab, canSeeQuotesTab]);
  const [tab, setTab] = useState('');

  // Snap to correct tab after role loads or URL changes
  const defaultTab = useMemo(() => tabs[0] || 'User', [tabs]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const tabParam = params.get('tab');
    const desired = (tabParam && tabs.includes(tabParam)) ? tabParam : defaultTab;
    if (desired && desired !== tab) setTab(desired);
    // note: do not include `tab` in deps to avoid resetting user selection on click
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, tabs, defaultTab]);

  // Toast
  const [toast, setToast] = useState({ show: false, msg: '' });
  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };
  const createQuoteListRequested = useMemo(
    () => new URLSearchParams(location.search || '').get('createQuoteList') === '1',
    [location.search]
  );

  // Org state
  const [org, setOrg] = useState(null);
  const [orgEdits, setOrgEdits] = useState({});
  const hasOrgEdits = useMemo(() => Object.keys(orgEdits).length > 0, [orgEdits]);
  const applyOrgPatch = (patch) => setOrg((prev) => (prev ? { ...prev, ...patch } : prev));

  // Payments/Payouts live status
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [stripeMeta, setStripeMeta] = useState({
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: false,
    requirements_currently_due_len: 0,
  });
  const [stripeLoading, setStripeLoading] = useState(false);

  // User state
  const [userForm, setUserForm] = useState({
    name: '',
    avatar_url: '',
    phone_number: '',
    timezone: '',
    locale: '',
    theme: 'system',
    notifications: {
      email: true,
      sms: false,
      product_updates: false,
      billing_alerts: true,
    },
  });
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState('');

  // Mobile quick-edit drawer
  const [orgDrawerOpen, setOrgDrawerOpen] = useState(false);

  // Settlement state
  const [settlement, setSettlement] = useState(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementError, setSettlementError] = useState('');
  const [settlementSaving, setSettlementSaving] = useState(false);
  const [settlementSaved, setSettlementSaved] = useState(false);

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  }, []);
  const [timecardSchedule, setTimecardSchedule] = useState({
    timecard_export_frequency: 'weekly',
    timecard_export_weekdays: [1],
    timecard_export_day_of_month: 1,
    timecard_export_timezone: browserTz,
    next_run_at: null,
    last_run_at: null,
  });
  const [timecardScheduleLoading, setTimecardScheduleLoading] = useState(false);
  const [timecardScheduleSaving, setTimecardScheduleSaving] = useState(false);
  const [timecardScheduleError, setTimecardScheduleError] = useState('');
  const [timecardScheduleSaved, setTimecardScheduleSaved] = useState(false);

  const authHeader = useMemo(() => ({}), []);

  /* ----------------------------- Load current user ---------------------------- */
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      setUserLoading(true);
      setUserError('');
      try {
        const { data } = await axios.get('/api/users/me', {
          headers: authHeader,
          withCredentials: true,
        });
        if (!mounted) return;
        const prefs = data?.notification_prefs || {};
        setUserForm({
          name: data?.name || '',
          avatar_url: data?.avatar_url || data?.avatar || '',
          phone_number: data?.phone_number || data?.phone || '',
          timezone: data?.timezone || '',
          locale: data?.locale || '',
          theme: data?.theme || 'system',
          notifications: {
            email: prefs.email_general !== false,
            sms: !!prefs.sms_general,
            product_updates: !!prefs.product_updates,
            billing_alerts: prefs.billing_alerts !== false,
          },
        });
        setUserError('');
      } catch (e) {
        console.error('Failed to load user profile', e?.response?.data || e);
        const msg = e?.response?.data?.error || e?.message || 'Failed to load profile';
        setUserError(msg);
      } finally {
        if (mounted) setUserLoading(false);
      }
    };
    loadUser();
    return () => {
      mounted = false;
    };
  }, [authHeader]);

  /* ------------------------- Load Organization (owner) ------------------------- */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!canSeeOrgTab) return;
      try {
        const res = await axios.get('/api/owner/my-organization', {
          headers: authHeader,
          withCredentials: true,
        });
        if (!mounted) return;
        const data = res.data || null;

        setOrg(data);
        setOrgEdits({});

        const stub = !!(data?.stripe_onboarding_completed) || !!(data?.stripe_account_id);
        setStripeOnboarded(stub);
      } catch (err) {
        console.error('Failed to load owner organization:', err?.response?.data || err);
        setOrg(null);
        setStripeOnboarded(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [profile?.role, canSeeOrgTab, authHeader]);

  /* ------------------------- Load Payments/Payouts status ---------------------- */
  const refreshStripeStatus = async () => {
    if (!canSeeOrgTab || !org?.id) return;
    setStripeLoading(true);
    try {
      const { data } = await axios.get('/api/organization/billing-status', {
        headers: authHeader,
        withCredentials: true,
      });
      if (data?.ok) {
        // Use actual Stripe fields returned by the API
        setStripeOnboarded(!!data.stripe_onboarding_complete || !!data.charges_enabled);
        setStripeMeta({
          charges_enabled: !!data.charges_enabled,
          payouts_enabled: !!data.payouts_enabled,
          details_submitted: !!data.details_submitted,
          requirements_currently_due_len: 0,
        });
      }
    } catch (e) {
      console.error('stripe/status failed', e?.response?.data || e);
    } finally {
      setStripeLoading(false);
    }
  };

  useEffect(() => {
    refreshStripeStatus();
  }, [canSeeOrgTab, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------- Helpers / Handlers --------------------------- */
  const orgVal = (k) => {
    const fromEdits = orgEdits[k];
    const fromOrg = org?.[k];
    const val = fromEdits !== undefined ? fromEdits : fromOrg;
    if (val === null || val === undefined) {
      if (k === 'service_area_zipcodes') return [];
      if (k === 'business_hours') return {};
      return '';
    }
    return val;
  };

  const setOrgVal = (k, v) =>
    setOrgEdits((p) => ({ ...p, [k]: v }));

  const resetOrg = () => setOrgEdits({});

  const toggleWorkStart = async (checked) => {
    if (!org) return;
    try {
      const payload = { enable_work_start: !!checked };
      const { data } = await axios.patch('/api/org/settings', payload, {
        headers: authHeader,
        withCredentials: true,
      });
      setOrg((prev) => ({ ...(prev || {}), ...(data || {}), settings: { ...(prev?.settings || {}), ...(data || {}) } }));
      setOrgEdits((prev) => ({ ...(prev || {}), enable_work_start: !!checked }));
      showToast('Setting updated');
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to update setting';
      showToast(msg);
    }
  };

  const saveOrg = async () => {
    if (!org) return;
    try {
      const payload = { id: Number(org.id) };
      Object.entries(orgEdits).forEach(([k, v]) => {
        payload[k] = v === '' ? null : v;
      });

      await axios.post('/api/owner/organization/update', { ...payload }, { headers: authHeader, withCredentials: true });

      // Refresh
      const res = await axios.get('/api/owner/my-organization', {
        headers: authHeader,
        withCredentials: true,
      });
      const data = res.data || null;

      setOrg(data);
      setOrgEdits({});

      const stub = !!(data?.stripe_onboarding_completed) || !!(data?.stripe_account_id);
      setStripeOnboarded(stub);

      await refreshStripeStatus();
      showToast('Organization saved');
    } catch (err) {
      console.error('Save org failed:', err?.response?.data || err);
      showToast('Failed to save organization');
    }
  };

  /* ------------------------- Load Settlement Rules ------------------------- */
  const fetchSettlement = async () => {
    if (!canSeeOrgTab) return;
    setSettlementLoading(true);
    setSettlementError('');
    setSettlementSaved(false);
    try {
      const { data } = await axios.get('/api/org/settlement-rules', {
        headers: authHeader,
        withCredentials: true,
      });
      setSettlement({
        auto_charge_on_completion: true,
        net_terms_enabled: false,
        net_term_days: 30,
        down_payment_enabled: false,
        down_payment_percent: 30,
        multi_payment_enabled: false,
        default_installments: 4,
        default_installment_interval_days: 30,
        milestones_enabled: false,
        late_fee_flat_cents: 0,
        late_fee_flat_grace_days: 0,
        late_fee_percent: 0,
        late_fee_percent_grace_days: 0,
        ...(data || {}),
      });
    } catch (e) {
      setSettlement(null);
      if (e?.response?.status === 404) {
        setSettlementError('Settlement rules are not available yet on this environment.');
      } else {
        setSettlementError(e?.response?.data?.error || 'Failed to load settlement rules');
      }
    } finally {
      setSettlementLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeOrgTab]);

  const updateSettlement = (k, v) => {
    setSettlement((prev) => ({ ...(prev || {}), [k]: v }));
    setSettlementSaved(false);
  };

  const saveSettlement = async () => {
    if (!settlement) return;
    setSettlementSaving(true);
    setSettlementError('');
    setSettlementSaved(false);
    try {
      await axios.put('/api/org/settlement-rules', settlement, {
        headers: authHeader,
        withCredentials: true,
      });
      setSettlementSaved(true);
      showToast('Settlement settings saved');
    } catch (e) {
      if (e?.response?.status === 404) {
        setSettlementError('Settlement rules endpoint is not available yet.');
      } else {
        setSettlementError(e?.response?.data?.error || 'Failed to save settlement settings');
      }
    } finally {
      setSettlementSaving(false);
    }
  };

  /* ------------------------- Timecards export schedule ------------------------- */
  const loadTimecardSchedule = async () => {
    if (!canSeeOrgTab) return;
    setTimecardScheduleLoading(true);
    setTimecardScheduleError('');
    setTimecardScheduleSaved(false);
    try {
      const { data } = await axios.get('/api/org/settings/timecards', {
        headers: authHeader,
        withCredentials: true,
      });
      const weekdays = Array.isArray(data?.timecard_export_weekdays)
        ? data.timecard_export_weekdays.map(Number)
        : [];
      setTimecardSchedule((prev) => ({
        ...prev,
        ...(data || {}),
        timecard_export_weekdays: weekdays.length ? weekdays : prev.timecard_export_weekdays,
        timecard_export_day_of_month: data?.timecard_export_day_of_month ?? prev.timecard_export_day_of_month,
        timecard_export_timezone: data?.timecard_export_timezone || prev.timecard_export_timezone,
        next_run_at: data?.next_run_at ?? prev.next_run_at,
        last_run_at: data?.last_run_at ?? prev.last_run_at,
      }));
    } catch (e) {
      setTimecardScheduleError(e?.response?.data?.error || 'Failed to load timecards export schedule');
    } finally {
      setTimecardScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadTimecardSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeOrgTab]);

  const updateTimecardSchedule = (k, v) => {
    setTimecardSchedule((prev) => ({ ...(prev || {}), [k]: v }));
    setTimecardScheduleSaved(false);
  };

  const toggleWeekday = (day) => {
    setTimecardSchedule((prev) => {
      const set = new Set(Array.isArray(prev.weekdays) ? prev.weekdays.map(Number) : []);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...(prev || {}), weekdays: Array.from(set).sort((a, b) => a - b) };
    });
    setTimecardScheduleSaved(false);
  };

  const saveTimecardSchedule = async () => {
    if (!canSeeOrgTab) return;
    setTimecardScheduleSaving(true);
    setTimecardScheduleError('');
    setTimecardScheduleSaved(false);
    try {
      const payload = buildExportSchedulePayload(timecardSchedule);
      const { data } = await axios.put('/api/org/settings/timecards', payload, {
        headers: authHeader,
        withCredentials: true,
      });
      if (data) {
        setTimecardSchedule((prev) => ({ ...(prev || {}), ...(data || {}) }));
      }
      setTimecardScheduleSaved(true);
      showToast('Timecards export schedule saved');
    } catch (e) {
      setTimecardScheduleError(e?.response?.data?.error || 'Failed to save timecards export schedule');
    } finally {
      setTimecardScheduleSaving(false);
    }
  };

  const continueStripeOnboarding = async () => {
    try {
      const { data } = await axios.post('/api/owner/platform-billing/start-onboarding', {}, { headers: authHeader, withCredentials: true });
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      showToast('Could not create onboarding link');
    } catch (e) {
      console.error('start-onboarding error:', e?.response?.data || e);
      showToast('Could not create onboarding link');
    }
  };

  const openStripeDashboard = async () => {
    try {
      const { data } = await axios.post('/api/owner/platform-billing/dashboard-link', {}, { headers: authHeader, withCredentials: true });
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      showToast('Could not open Stripe Dashboard');
    } catch (e) {
      console.error('dashboard-link error:', e?.response?.data || e);
      showToast('Could not open Stripe Dashboard');
    }
  };

  const setUser = (k, v) => setUserForm((p) => ({ ...p, [k]: v }));
  const setNotify = (k, v) => setUserForm((p) => ({ ...p, notifications: { ...p.notifications, [k]: v } }));
  const neighborhoodOptIn = userSettings?.neighborhoodRecsOptIn === true;

  const toggleNeighborhoodOptIn = async () => {
    const desired = !neighborhoodOptIn;
    try {
      await updateUserSettings({ neighborhoodRecsOptIn: desired });
      showToast(desired ? 'Neighborhood recommendations enabled' : 'Neighborhood recommendations disabled');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Unable to update preference';
      showToast(msg);
    }
  };

  const saveUser = async () => {
    try {
      const { name, avatar_url, phone_number, timezone, locale, theme, notifications } = userForm;
      await axios.put(
        '/api/users/update-me',
        {
          name,
          avatar_url,
          phone_number,
          timezone,
          locale,
          theme,
          notification_prefs: {
            email_general: !!notifications.email,
            sms_general: !!notifications.sms,
            product_updates: !!notifications.product_updates,
            billing_alerts: !!notifications.billing_alerts,
          },
        },
        { headers: authHeader, withCredentials: true }
      );
      showToast('Profile updated');
    } catch (err) {
      console.error('Update-me failed:', err?.response?.data || err);
      showToast('Failed to update profile');
    }
  };

  const changePassword = async () => {
    window.location.assign('/change-password');
  };

  /* --------------------------------- Derived ---------------------------------- */
  const fullyEnabled =
    !!stripeMeta.charges_enabled &&
    !!stripeMeta.payouts_enabled &&
    !!stripeMeta.details_submitted &&
    Number(stripeMeta.requirements_currently_due_len || 0) === 0;

  const hasTodos =
    Number(stripeMeta.requirements_currently_due_len || 0) > 0 ||
    !stripeMeta.charges_enabled ||
    !stripeMeta.payouts_enabled ||
    !stripeMeta.details_submitted;
  const canEditExports = role === 'owner' || role === 'admin';

  /* --------------------------------- UI ---------------------------------- */

  const orgCard = canSeeOrgTab ? (
    <div className="space-y-6">
      {/* Onboarding checklist for new owners */}
      <OnboardingChecklist />

      <Card
        title={`Organization ${org?.name ? `– ${org.name}` : ''}`}
        actions={
          <>
            {!fullyEnabled && (
              <button onClick={continueStripeOnboarding} className="px-4 py-2 rounded border" type="button">
                Start/Continue Onboarding
              </button>
            )}

            {stripeOnboarded && (
              <button onClick={openStripeDashboard} className="px-4 py-2 rounded border" type="button">
                Open Stripe Dashboard
              </button>
            )}

            <button
              onClick={saveOrg}
              disabled={!hasOrgEdits}
              className={`px-4 py-2 rounded text-white ${hasOrgEdits ? 'bg-zinc-600' : 'bg-gray-400 cursor-not-allowed'}`}
              type="button"
            >
              Save Changes
            </button>
            <button onClick={resetOrg} disabled={!hasOrgEdits} className="px-4 py-2 rounded border" type="button">
              Reset
            </button>
          </>
        }
      >
        {!org ? (
          <div className="text-sm text-red-600">Owner access required. No organization found for your account.</div>
        ) : (
          <div className="space-y-6">
            {/* Payments & Payouts status */}
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Payments &amp; Payouts</FieldLabel>
              <div className="flex items-center gap-3">
                {fullyEnabled ? (
                  <StatusPill color="green">All set</StatusPill>
                ) : (
                  <StatusPill color="yellow">Setup required</StatusPill>
                )}
                <button
                  onClick={refreshStripeStatus}
                  className="text-zinc-600 underline text-sm"
                  disabled={stripeLoading}
                  type="button"
                >
                  {stripeLoading ? 'Refreshing…' : 'Refresh status'}
                </button>
              </div>
            </div>

            {/* To-do list (hidden when there's nothing to do) */}
            {hasTodos && (
              <div className="text-sm">
                <ul className="list-disc ml-5 text-neutral-700">
                  {!stripeMeta.details_submitted && <li>Submit business details</li>}
                  {!stripeMeta.charges_enabled && <li>Enable card payments</li>}
                  {!stripeMeta.payouts_enabled && <li>Enable payouts</li>}
                  {Number(stripeMeta.requirements_currently_due_len || 0) > 0 && (
                    <li>Additional info required (see onboarding flow)</li>
                  )}
                </ul>
                <div className="mt-2">
                  <button
                    onClick={continueStripeOnboarding}
                    className="text-zinc-600 underline text-sm"
                    type="button"
                  >
                    Open onboarding
                  </button>
                </div>
              </div>
            )}

            {/* Small diagnostics (optional) */}
            <div className="text-xs text-neutral-500">
              payments: {String(!!stripeMeta.charges_enabled)} · payouts: {String(!!stripeMeta.payouts_enabled)} ·{' '}
              details_submitted: {String(!!stripeMeta.details_submitted)} · due:{' '}
              {Number(stripeMeta.requirements_currently_due_len || 0)}
            </div>

            {/* Basic info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Industry</FieldLabel>
                <Dropdown
                  value={orgVal('industry')}
                  onChange={(v) => setOrgVal('industry', v)}
                  options={[{ value: '', label: '-- Select Industry --' }, ...INDUSTRY_OPTIONS.map((opt) => ({ value: opt, label: opt }))]}
                />
              </div>
              {role === 'admin' && (
              <div>
                <FieldLabel>Vertical</FieldLabel>
                <select
                  className="border p-2 w-full rounded"
                  value={orgVal('vertical')}
                  onChange={(e) => setOrgVal('vertical', e.target.value || null)}
                >
                  <option value="">Default (all modules)</option>
                  {Object.entries(VERTICALS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <div className="text-xs text-neutral-500 mt-1">Controls which sidebar modules are visible for this organization.</div>
              </div>
              )}
              <div>
                <FieldLabel>Website</FieldLabel>
                <input className="border p-2 w-full" value={orgVal('website')} onChange={(e) => setOrgVal('website', e.target.value)} placeholder="https://example.com" />
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <input className="border p-2 w-full" value={orgVal('phone_number')} onChange={(e) => setOrgVal('phone_number', e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <input className="border p-2 w-full" value={orgVal('email')} onChange={(e) => setOrgVal('email', e.target.value)} placeholder="info@example.com" />
              </div>
            </div>

            {/* Address */}
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <FieldLabel>Street</FieldLabel>
                <input className="border p-2 w-full" value={orgVal('street')} onChange={(e) => setOrgVal('street', e.target.value)} />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <input className="border p-2 w-full" value={orgVal('city')} onChange={(e) => setOrgVal('city', e.target.value)} />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <input className="border p-2 w-full uppercase" maxLength={2} value={orgVal('state')} onChange={(e) => setOrgVal('state', e.target.value.toUpperCase())} />
              </div>
              <div>
                <FieldLabel>ZIP</FieldLabel>
                <input className="border p-2 w-full" value={orgVal('zip')} onChange={(e) => setOrgVal('zip', e.target.value)} />
              </div>
            </div>

            {/* Service areas */}
            <div>
              <FieldLabel>Service Area Zipcodes</FieldLabel>
              <ZipcodeListInput value={orgVal('service_area_zipcodes')} onChange={(arr) => setOrgVal('service_area_zipcodes', arr)} />
            </div>

            {/* Business hours */}
            <div>
              <FieldLabel>Business Hours</FieldLabel>
              <ScheduleHoursEditor value={orgVal('business_hours')} onChange={(obj) => setOrgVal('business_hours', obj)} />
            </div>

            {/* Services (link to Services page) */}
            <div>
              <FieldLabel>Services</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/app/services"
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  Update Services
                </Link>
                  <span className="text-xs text-neutral-500">
                  Add, price, and reorder your services on the Services page.
                </span>
              </div>
            </div>

            {/* Service Fee Handling */}
            <div className="border rounded-lg p-3 bg-neutral-50 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-800">Service Fee Handling</div>
                  <div className="text-xs text-neutral-600 mt-1">
                    Choose who pays the payment processing service fee.
                  </div>
                </div>
                <Toggle
                  checked={orgVal('absorb_service_fee') === true}
                  onChange={(e) => setOrgVal('absorb_service_fee', e.target.checked)}
                />
              </div>
              <div className="text-sm text-neutral-700 space-y-1">
                {orgVal('absorb_service_fee') === true ? (
                  <>
                    <div className="font-medium text-amber-700">Fee absorbed by you</div>
                    <div className="text-xs text-neutral-600">
                      Customer pays the service amount only. The fee (1.99% max $10 for ACH, 3.9% + $0.60 for card) is deducted from your payout.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-emerald-700">Fee passed to customer (default)</div>
                    <div className="text-xs text-neutral-600">
                      Customer pays the service amount plus the Service Fee (1.99% max $10 for ACH, 3.9% + $0.60 for card). You receive the full service amount.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-3 bg-neutral-50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-neutral-800">Timecards export schedule</div>
                  <div className="text-xs text-neutral-600">Configure CSV exports for payroll/accounting. Trust metadata is preserved on every run.</div>
                  {timecardScheduleError ? (
                    <div className="text-xs text-rose-700 mt-1">{timecardScheduleError}</div>
                  ) : null}
                  {timecardScheduleSaved ? (
                    <div className="text-xs text-emerald-700 mt-1">Saved.</div>
                  ) : null}
                  {timecardSchedule.next_run_at || timecardSchedule.last_run_at ? (
                    <div className="text-xs text-neutral-500 mt-1">
                      {timecardSchedule.next_run_at ? `Next: ${timecardSchedule.next_run_at}` : null}
                      {timecardSchedule.next_run_at && timecardSchedule.last_run_at ? ' • ' : ''}
                      {timecardSchedule.last_run_at ? `Last: ${timecardSchedule.last_run_at}` : null}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={saveTimecardSchedule}
                  disabled={timecardScheduleSaving || !canEditExports}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm hover:bg-neutral-800 disabled:opacity-60"
                >
                  {timecardScheduleSaving ? 'Saving…' : 'Save export schedule'}
                </button>
              </div>

              {timecardScheduleLoading ? (
                <div className="text-sm text-neutral-700">Loading export schedule…</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-700">Frequency</label>
                    <select
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                      value={timecardSchedule.timecard_export_frequency || ''}
                      onChange={(e) => updateTimecardSchedule('timecard_export_frequency', e.target.value || '')}
                      disabled={!canEditExports}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 weeks</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom_weekdays">Custom weekdays</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-700">Timezone</label>
                    <input
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                      value={timecardSchedule.timecard_export_timezone || ''}
                      onChange={(e) => updateTimecardSchedule('timecard_export_timezone', e.target.value)}
                      placeholder="America/New_York"
                      disabled={!canEditExports}
                    />
                  </div>

                  {(timecardSchedule.timecard_export_frequency === 'weekly' || timecardSchedule.timecard_export_frequency === 'biweekly') && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-neutral-700">Day of week</label>
                      <select
                        className="border rounded-lg px-3 py-2 text-sm w-full"
                        value={(timecardSchedule.timecard_export_weekdays || [1])[0] ?? ''}
                        onChange={(e) => updateTimecardSchedule('timecard_export_weekdays', [Number(e.target.value)])}
                        disabled={!canEditExports}
                      >
                        {WEEKDAYS.map((d, idx) => (
                          <option key={d} value={idx}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {timecardSchedule.timecard_export_frequency === 'monthly' && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-neutral-700">Day of month</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        className="border rounded-lg px-3 py-2 text-sm w-full"
                        value={timecardSchedule.timecard_export_day_of_month ?? 1}
                        onChange={(e) => updateTimecardSchedule('timecard_export_day_of_month', Number(e.target.value))}
                        disabled={!canEditExports}
                      />
                      <div className="text-xs text-neutral-500">Exports run on this day each month. Defaults to 1.</div>
                    </div>
                  )}

                  {timecardSchedule.timecard_export_frequency === 'custom_weekdays' && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-medium text-neutral-700">Select weekdays</label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((d, idx) => {
                          const active = (timecardSchedule.timecard_export_weekdays || []).includes(idx);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleWeekday(idx)}
                              disabled={!canEditExports}
                              className={`px-3 py-2 rounded-lg border text-sm ${active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-800 border-neutral-300'}`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Mobile Quick-Edit Drawer */}
      {orgDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOrgDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Quick Edit</div>
              <button className="p-2 -mr-2" aria-label="Close quick edit" onClick={() => setOrgDrawerOpen(false)}>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Industry</FieldLabel>
                <Dropdown
                  value={orgVal('industry')}
                  onChange={(v) => setOrgVal('industry', v)}
                  options={[{ value: '', label: '-- Select Industry --' }, ...INDUSTRY_OPTIONS.map((opt) => ({ value: opt, label: opt }))]}
                />
              </div>

              <div>
                <FieldLabel>Website</FieldLabel>
                <input className="border p-2 w-full" value={orgVal('website')} onChange={(e) => setOrgVal('website', e.target.value)} placeholder="https://example.com" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <input className="border p-2 w-full" value={orgVal('phone_number')} onChange={(e) => setOrgVal('phone_number', e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <input className="border p-2 w-full" value={orgVal('email')} onChange={(e) => setOrgVal('email', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <button
                className="flex-1 rounded-lg border px-3 py-2"
                onClick={() => { setOrgEdits({}); }}
              >
                Clear
              </button>
              <button
                className="flex-1 rounded-lg bg-zinc-600 text-white px-3 py-2"
                onClick={() => { setOrgDrawerOpen(false); }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="text-sm text-gray-600">You do not have access to organization settings.</div>
  );

  const billingTab = (() => {
    if (authLoading) return <div className="text-sm text-neutral-600">Loading billing…</div>;
    if (!canSeeOrgTab || role !== 'owner') return <div className="text-sm text-gray-600">Owner access required to view billing.</div>;
    return (
      <div className="space-y-6">
        <PlatformBillingPanel authHeader={authHeader} />
        <div className="text-xs text-neutral-500">
          Monthly SaaS fee is based on your <strong>active users</strong> in this organization:
          $3/user (0–50), $2 (51–150), $1 (151–300), $0.50 (300+) with a hard cap of $349/month.
          We invoice automatically using your default payment method.
        </div>
      </div>
    );
  })();

  const messagingTab = canSeeOrgTab ? (
    <MessagingSettings />
  ) : (
    <div className="text-sm text-gray-600">You do not have access to messaging settings.</div>
  );

  const showNeighborhoodSettings = role === 'user';

  const userCard = (
    <div className="grid gap-6">
      <Card
        title="Profile"
        actions={
          <>
            <button onClick={saveUser} className="px-4 py-2 rounded bg-zinc-600 text-white" type="button">
              Save
            </button>
            <button onClick={changePassword} className="px-4 py-2 rounded border" type="button">
              Change Password
            </button>
            {(role === 'owner' || role === 'admin') && (
              <Link to="/backup-codes" className="px-4 py-2 rounded border">
                Backup Codes
              </Link>
            )}
          </>
        }
      >
        {userLoading ? (
          <div className="text-gray-600">Loading…</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {userError ? (
              <div className="md:col-span-2 text-sm text-red-600">{userError}</div>
            ) : null}
            <div>
              <FieldLabel>Name</FieldLabel>
              <input className="border p-2 w-full" value={userForm.name} onChange={(e) => setUser('name', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Avatar URL</FieldLabel>
              <input className="border p-2 w-full" value={userForm.avatar_url} onChange={(e) => setUser('avatar_url', e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <input className="border p-2 w-full" value={userForm.phone_number} onChange={(e) => setUser('phone_number', e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div className="flex items-end gap-3">
              {userForm.avatar_url ? (
                <img src={userForm.avatar_url} alt="avatar preview" className="w-16 h-16 rounded-full object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-full border flex items-center justify-center text-xs text-gray-500">No avatar</div>
              )}
            </div>
          </div>
        )}
      </Card>

      {showNeighborhoodSettings ? (
        <Card title="Neighborhood recommendations & offers">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-neutral-800">Neighborhood recommendations &amp; offers</div>
              <div className="text-sm text-neutral-600">
                See nearby services and get optional offers when providers already service your area. We never show competitor replacements for services you already use.
              </div>
              {userSettingsError ? (
                <div className="text-sm text-red-600">{userSettingsError}</div>
              ) : null}
            </div>
            <Toggle
              checked={neighborhoodOptIn}
              onChange={toggleNeighborhoodOptIn}
              disabled={userSettingsLoading}
            />
          </div>
        </Card>
      ) : null}

      {canSeeOrgTab ? (
        <Card title="Start Work">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-neutral-800">Enable Start Work</div>
              <div className="text-sm text-neutral-600">
                When enabled, owners and crew leaders can start a job from the schedule. If location permission is granted, we’ll record an arrival trust signal.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Toggle
                checked={!!(orgEdits?.enable_work_start ?? org?.enable_work_start ?? org?.settings?.enable_work_start)}
                onChange={(e) => toggleWorkStart(e.target.checked)}
                disabled={role !== 'owner'}
              />
              {role !== 'owner' ? (
                <span className="text-xs text-neutral-500">Owners only</span>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="Notifications">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={userForm.notifications.email} onChange={(e) => setNotify('email', e.target.checked)} />
            Email notifications
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={userForm.notifications.sms} onChange={(e) => setNotify('sms', e.target.checked)} />
            SMS notifications
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={userForm.notifications.product_updates} onChange={(e) => setNotify('product_updates', e.target.checked)} />
            Product updates
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={userForm.notifications.billing_alerts} onChange={(e) => setNotify('billing_alerts', e.target.checked)} />
            Billing alerts
          </label>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Email</div>
            <div className="font-medium">{profile?.email || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Role</div>
            <div className="font-medium">{profile?.role || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Organization</div>
            <div className="font-medium">{profile?.organization_id ? `#${profile.organization_id}` : '—'}</div>
          </div>
        </div>
      </Card>
    </div>
  );

  const activeTab = tab || defaultTab;

  const sections = useMemo(() => {
    const list = [];
    if (canSeeOrgTab) {
      list.push(
        { key: 'Organization', label: 'Organization', render: () => orgCard },
        { key: 'Billing', label: 'Billing', render: () => billingTab },
        { key: 'Messaging', label: 'Messaging', render: () => messagingTab },
        { key: 'Checklists', label: 'Checklists', render: () => <ChecklistsSettings /> },
        {
          key: 'Settlement',
          label: 'Settlement',
          render: () => (
            <SettlementSettingsPanel
              rules={settlement}
              loading={settlementLoading}
              error={settlementError}
              saving={settlementSaving}
              saved={settlementSaved}
              onChange={updateSettlement}
              onSave={saveSettlement}
              role={role}
            />
          ),
        },
        {
          key: 'Integrations',
          label: 'Integrations',
          render: () => <QuickBooksSettings showToast={showToast} />,
        }
      );
    }
    if (canSeeQuotesTab) {
      list.push({
        key: 'Quotes',
        label: 'Quotes',
        render: () => (
          <QuotesSettings
            authHeader={authHeader}
            org={org}
            role={role}
            onOrgPatched={applyOrgPatch}
            showToast={showToast}
            createQuoteListRequested={createQuoteListRequested}
            active={activeTab === 'Quotes'}
          />
        ),
      });
    }
    list.push({ key: 'User', label: 'User', render: () => userCard });
    return list;
  }, [
    canSeeOrgTab,
    canSeeQuotesTab,
    orgCard,
    billingTab,
    messagingTab,
    settlement,
    settlementError,
    settlementLoading,
    settlementSaving,
    settlementSaved,
    updateSettlement,
    saveSettlement,
    role,
    authHeader,
    org,
    applyOrgPatch,
    showToast,
    createQuoteListRequested,
    activeTab,
    userCard,
  ]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Toast show={toast.show} onClose={() => setToast({ show: false, msg: '' })}>
        {toast.msg}
      </Toast>

      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <ResponsiveTabs sections={sections} value={tab} onChange={setTab} />
    </div>
  );
};

export default Settings;
