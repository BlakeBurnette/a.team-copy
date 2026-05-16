// src/pages/schedule/components/AddServicePanel.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Plus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
// ⬇️ swap to the styled dropdown you use elsewhere
import InlineSelect from '../../../components/admin/InlineSelect';
import MobileSafeDate from '../../../components/MobileSafeDate';
import { startOfToday, addDays } from 'date-fns';
import { ymd } from '../scheduleUtils';
import Toast from '../../../components/Toast';
import Modal from '../../../components/Modal';

const patterns = [
  { value: 'once', label: 'One-off' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'every_x_weeks', label: 'Every X Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'every_x_months', label: 'Every X Months' },
  { value: 'every_6_months', label: 'Every 6 Months' },
];

// Client-side duplicate guard window (ms) after a successful add
const RECENT_DUPLICATE_WINDOW_MS = 8000;

// Generates an idempotency key for server-side idempotency
function makeIdempoKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

// Build a deterministic key for a “logical” schedule add.
function payloadKeyOf({
  customer_id,
  service_key,
  team_id,
  pattern,
  interval,
  start_date,
  end_date,
  checklists = [],
}) {
  const t = team_id == null ? '' : String(team_id);
  const clKey = Array.isArray(checklists)
    ? checklists.map((c) => String(c?.checklist_template_id || '') + (c?.is_required ? ':1' : ':0')).join(',')
    : '';
  return [
    String(customer_id),
    String(service_key),
    t,
    String(pattern),
    String(Number(interval) || 1),
    String(start_date),
    String(end_date),
    clKey,
  ].join('|');
}

export default function AddServicePanel({ teamOptions = [], onSuccess }) {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const [toast, setToast] = useState({ show: false, message: '', duration: 2500 });
  const showToast = (message, duration = 2500) =>
    setToast({ show: true, message, duration });

  // Allow extra headers (Idempotency-Key) to be merged in
  const headersAuth = async (extra = {}) => {
    return { ...extra };
  };

  // local form state
  const [candidates, setCandidates] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedServiceKey, setSelectedServiceKey] = useState('');
  const [selectedTeamForCreate, setSelectedTeamForCreate] = useState('');
  const [recurrence, setRecurrence] = useState({ pattern: 'once', interval: 1 });
  const [startDate, setStartDate] = useState(ymd(startOfToday()));
  const [endDate, setEndDate] = useState(ymd(addDays(startOfToday(), 180)));
  const [notes, setNotes] = useState('');
  const [lockFromCustomer, setLockFromCustomer] = useState(false);
  const [checklistEnabled, setChecklistEnabled] = useState(false);
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [checklistAttachments, setChecklistAttachments] = useState([]);
  const [existingVisits, setExistingVisits] = useState([]); // Track existing scheduled visits
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [recurringWarningModal, setRecurringWarningModal] = useState({ open: false, rules: [], customerName: '' });

  // duplicate protection
  const [adding, setAdding] = useState(false);
  const inflightKeys = useRef(new Set());                 // payloadKey -> in-flight
  const recentKeys = useRef(new Map());                   // payloadKey -> expiry timestamp
  const idempoKeyRef = useRef(null);                      // last Idempotency-Key for current submission

  // clean up expired recent entries occasionally
  const pruneRecent = () => {
    const now = Date.now();
    for (const [k, exp] of recentKeys.current.entries()) {
      if (exp <= now) recentKeys.current.delete(k);
    }
  };

  // load candidates (customers + services)
  useEffect(() => {
    (async () => {
      try {
        console.time('[AddServicePanel] GET /api/schedule/candidates');
        const headers = await headersAuth();
        const { data, headers: respHeaders, status } = await axios.get('/api/schedule/candidates', {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        });
        const arr = Array.isArray(data) ? data : [];
        console.log('[AddServicePanel] candidates status:', status, 'X-Count:', respHeaders?.['x-candidates-count']);
        console.log('[AddServicePanel] candidates length:', arr.length);
        if (arr.length) {
          console.log('[AddServicePanel] candidates sample:', arr.slice(0, 2));
          const stats = arr.slice(0, 5).map(c => ({
            id: c.id,
            name: c.name,
            services_len: Array.isArray(c.services) ? c.services.length : 0,
          }));
          console.log('[AddServicePanel] first 5 service counts:', stats);
        }
        setCandidates(arr);
        console.timeEnd('[AddServicePanel] GET /api/schedule/candidates');
      } catch (e) {
        showToast('Failed to load customers');
        console.log('[AddServicePanel] candidates error:', e?.response?.status, e?.response?.data || e);
        console.timeEnd('[AddServicePanel] GET /api/schedule/candidates');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load existing scheduled visits to check for duplicates
  useEffect(() => {
    (async () => {
      try {
        const headers = await headersAuth();
        // Fetch schedule for a reasonable range (e.g., next 30 days)
        const rangeStart = ymd(startOfToday());
        const rangeEnd = ymd(addDays(startOfToday(), 30));
        const { data } = await axios.get('/api/schedule', {
          headers,
          withCredentials: true,
          params: { start: rangeStart, end: rangeEnd },
          validateStatus: () => true,
        });
        const visits = Array.isArray(data) ? data : (Array.isArray(data?.schedule) ? data.schedule : []);
        setExistingVisits(visits);
      } catch (e) {
        console.log('[AddServicePanel] Failed to load existing visits:', e);
        // Non-critical, just log and continue
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const servicesForSelectedCustomer = useMemo(() => {
    const cid = Number(selectedCustomerId);
    if (!cid) return [];
    const c = (candidates || []).find(x => Number(x.id) === cid);
    const list = Array.isArray(c?.services) ? c.services : [];
    console.log('[AddServicePanel] servicesForSelectedCustomer raw:', list);
    return list;
  }, [selectedCustomerId, candidates]);

  // tolerant, de-duped options from various backend shapes
  const serviceOptions = useMemo(() => {
    const list = servicesForSelectedCustomer || [];
    const seen = new Set();
    const opts = list.map((s) => {
      const rawValue = s.key ?? s.id ?? s.service_key ?? s.slug ?? s.code ?? s.uuid ?? null;
      const value = rawValue != null ? String(rawValue) : null;
      const label = s.label ?? s.name ?? s.title ?? (value ? `Service ${value}` : '');
      return value ? { value, label } : null;
    }).filter(Boolean);
    const deduped = opts.filter(o => (seen.has(o.value) ? false : (seen.add(o.value), true)));
    console.log('[AddServicePanel] serviceOptions:', deduped);
    return deduped;
  }, [servicesForSelectedCustomer]);

  // Recurrence options - always show all options
  // Customer preference is auto-selected via useEffect, but user can override
  const recurrenceOptions = useMemo(() => {
    return patterns.map(p => ({ value: p.value, label: p.label }));
  }, []);

  // auto-select first service when customer changes
  useEffect(() => {
    if (serviceOptions.length > 0) {
      setSelectedServiceKey(prev =>
        prev && serviceOptions.some(s => s.value === prev)
          ? prev
          : String(serviceOptions[0].value)
      );
    } else {
      setSelectedServiceKey('');
    }
  }, [serviceOptions]);

  // Load checklist settings/templates
  useEffect(() => {
    (async () => {
      try {
        const headers = await headersAuth();
        const { data } = await axios.get('/api/checklists/settings', {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        });
        if (data?.enabled === undefined && data?.status === 404) {
          setChecklistEnabled(false);
          setChecklistTemplates([]);
          setSelectedChecklistTemplateId('');
          return;
        }
        if (data?.enabled === undefined && data?.status === 404) {
          setChecklistEnabled(false);
          setChecklistTemplates([]);
          setChecklistAttachments([]);
          return;
        }
        const enabled = Boolean(data?.enabled);
        setChecklistEnabled(enabled);
        if (enabled) {
          const tplRes = await axios.get('/api/checklist-templates', { headers, withCredentials: true });
          const list = Array.isArray(tplRes.data)
            ? tplRes.data
            : Array.isArray(tplRes.data?.templates)
              ? tplRes.data.templates
              : [];
          setChecklistTemplates(list);
          setChecklistAttachments((prev) =>
            prev.filter((a) => list.some((t) => String(t.id) === String(a.checklistTemplateId)))
          );
        } else {
          setChecklistTemplates([]);
          setChecklistAttachments([]);
        }
      } catch (e) {
        console.log('[AddServicePanel] checklist settings error:', e?.response?.data || e);
        setChecklistEnabled(false);
        setChecklistTemplates([]);
        setChecklistAttachments([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // respect customer recurrence preference, if present
  useEffect(() => {
    const cid = Number(selectedCustomerId);
    if (!cid) { setLockFromCustomer(false); return; }
    const c = (candidates || []).find(x => Number(x.id) === cid);
    console.log('[AddServicePanel] selected customer:', { id: cid, name: c?.name });
    console.log('[AddServicePanel] selected customer services:', c?.services);
    const freq = (c?.pref_frequency || c?.frequency || c?.service_frequency || '').toLowerCase();
    const intval = Number(c?.pref_interval || c?.service_interval);
    const lockable = new Set(['weekly','every_x_weeks','monthly','every_x_months','every_6_months']);

    if (lockable.has(freq)) {
      const needsMinTwo = freq === 'every_x_weeks' || freq === 'every_x_months';
      const baseInterval = Number.isFinite(intval) && intval > 0 ? intval : (needsMinTwo ? 2 : 1);
      setRecurrence({ pattern: freq, interval: needsMinTwo ? Math.max(2, baseInterval) : baseInterval });
      setLockFromCustomer(true);
    } else if (freq === 'once') {
      setRecurrence({ pattern: 'once', interval: 1 });
      setLockFromCustomer(true);
    } else {
      // No preference or invalid - default to once
      setRecurrence({ pattern: 'once', interval: 1 });
      setLockFromCustomer(false);
    }
  }, [selectedCustomerId, candidates]);

  // Ensure selected recurrence is still valid when options change
  useEffect(() => {
    const validValues = recurrenceOptions.map(o => o.value);
    if (!validValues.includes(recurrence.pattern)) {
      // Current selection is no longer valid - reset to customer preference or "once"
      const cid = Number(selectedCustomerId);
      const customer = candidates.find(c => Number(c.id) === cid);
      const preferredFreq = customer?.pref_frequency || customer?.frequency || customer?.service_frequency || '';

      if (preferredFreq && validValues.includes(preferredFreq.toLowerCase())) {
        const freq = preferredFreq.toLowerCase();
        const intval = Number(customer?.pref_interval || customer?.service_interval);
        const needsMinTwo = freq === 'every_x_weeks' || freq === 'every_x_months';
        const baseInterval = Number.isFinite(intval) && intval > 0 ? intval : (needsMinTwo ? 2 : 1);
        setRecurrence({
          pattern: freq,
          interval: needsMinTwo ? Math.max(2, baseInterval) : baseInterval
        });
      } else {
        setRecurrence({ pattern: 'once', interval: 1 });
      }
    }
  }, [recurrenceOptions, recurrence.pattern, selectedCustomerId, candidates]);

  // keep end date aligned with pattern
  useEffect(() => {
    const d = new Date(startDate + 'T00:00:00');
    if (isNaN(d)) return;
    if (recurrence.pattern === 'once') {
      setEndDate(startDate);
    } else {
      const end = new Date(d);
      end.setFullYear(end.getFullYear() + 1);
      setEndDate(ymd(end));
    }
  }, [startDate, recurrence.pattern]);

  // Check for duplicate customer visits on the same day
  useEffect(() => {
    if (!selectedCustomerId || !startDate) {
      setDuplicateWarning('');
      return;
    }

    const cid = Number(selectedCustomerId);
    const duplicate = existingVisits.find(visit => {
      const visitCustomerId = Number(visit.customer_id || visit.customerId || visit.customer?.id);
      const visitDate = visit.start_date || visit.date || visit.scheduled_date;
      return visitCustomerId === cid && visitDate === startDate;
    });

    if (duplicate) {
      const customer = candidates.find(c => Number(c.id) === cid);
      const customerName = customer?.name || customer?.street || `Customer #${cid}`;
      setDuplicateWarning(`⚠️ ${customerName} already has a visit scheduled on ${startDate}. Consider adding services to the existing visit instead.`);
    } else {
      setDuplicateWarning('');
    }
  }, [selectedCustomerId, startDate, existingVisits, candidates]);

  const customerLabel = (c) => {
    // Try various name field combinations
    const firstName = c?.first_name || c?.firstName || '';
    const lastName = c?.last_name || c?.lastName || '';
    const fullName = c?.name || c?.full_name || c?.fullName || '';

    // Street address (just the street portion, not city/state/zip)
    const street = c?.street || c?.street_address || c?.address || '';
    const email = c?.email || c?.primary_email || c?.primaryEmail || '';

    // Build display name
    let displayName = '';
    if (firstName && lastName) {
      displayName = `${firstName} ${lastName}`.trim();
    } else if (firstName) {
      displayName = firstName;
    } else if (lastName) {
      displayName = lastName;
    } else if (fullName) {
      displayName = fullName;
    }

    // Return formatted label - prioritize street address over email
    if (displayName && street) return `${displayName} (${street})`;
    if (displayName && email) return `${displayName} (${email})`;
    if (displayName) return displayName;
    if (street) return street;
    if (email) return email;

    // Debug log when no name is found
    if (!displayName && candidates.length > 0) {
      console.warn('[AddServicePanel] Customer missing name fields:', { id: c?.id, fields: Object.keys(c || {}) });
    }

    return `Customer #${c?.id ?? ''}`.trim();
  };

  // options
  const customerOptions = useMemo(
    () => (Array.isArray(candidates) ? candidates : []).map(c => ({
      value: String(c.id),
      label: customerLabel(c),
    })),
    [candidates]
  );

  const teamOptionsWithUnassigned = useMemo(
    () => [{ value: '', label: '— Unassigned —' }, ...teamOptions],
    [teamOptions]
  );

  const checklistOptions = useMemo(() => {
    const list = Array.isArray(checklistTemplates) ? checklistTemplates : [];
    const active = list.filter((t) => t.is_active !== false);
    return active.map((t) => ({ value: String(t.id), label: t.name || `Template ${t.id}` }));
  }, [checklistTemplates]);

  const addChecklistAttachment = (templateId) => {
    if (!templateId) return;
    const tpl = checklistTemplates.find((t) => String(t.id) === String(templateId));
    if (!tpl) return;
    setChecklistAttachments((prev) => {
      if (prev.some((p) => String(p.checklistTemplateId) === String(templateId))) return prev;
      return [
        ...prev,
        {
          checklistTemplateId: String(templateId),
          templateName: tpl.name || `Template ${templateId}`,
          isRequiredForService: Boolean(tpl.is_required),
        },
      ];
    });
  };

  const updateChecklistAttachment = (templateId, updates) => {
    setChecklistAttachments((prev) =>
      prev.map((a) => (String(a.checklistTemplateId) === String(templateId) ? { ...a, ...updates } : a))
    );
  };

  const removeChecklistAttachment = (templateId) => {
    setChecklistAttachments((prev) => prev.filter((a) => String(a.checklistTemplateId) !== String(templateId)));
  };

  // Helper to format pattern for display
  const formatPattern = (pattern, interval) => {
    switch (pattern) {
      case 'weekly': return 'Weekly';
      case 'every_x_weeks': return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      case 'monthly': return 'Monthly';
      case 'every_x_months': return interval === 1 ? 'Monthly' : `Every ${interval} months`;
      case 'every_6_months': return 'Every 6 months';
      default: return pattern;
    }
  };

  const onAdd = async (skipRecurringCheck = false) => {
    const cid = Number(selectedCustomerId);
    const teamId = selectedTeamForCreate ? Number(selectedTeamForCreate) : null;
    const serviceKey = selectedServiceKey || '';

    if (!cid) return showToast('Select a customer', 2500);
    if (!serviceKey) return showToast('Select a service', 2500);

    // Check for existing recurring rules if adding a recurring schedule
    if (!skipRecurringCheck && recurrence.pattern !== 'once') {
      const customer = candidates.find(c => Number(c.id) === cid);
      const existingRules = customer?.recurring_rules || [];
      console.log('[AddServicePanel] Recurring check:', { cid, pattern: recurrence.pattern, existingRules });
      if (existingRules.length > 0) {
        setRecurringWarningModal({
          open: true,
          rules: existingRules,
          customerName: customer?.name || customer?.street || `Customer #${cid}`,
        });
        return; // Don't proceed - wait for user decision
      }
    }

    const logicalPayload = {
      customer_id: cid,
      service_key: serviceKey,
      team_id: teamId,
      pattern: recurrence.pattern,
      interval: Number(recurrence.interval) || 1,
      start_date: startDate,
      end_date: recurrence.pattern === 'once' ? startDate : endDate,
      checklists: checklistAttachments.map((a) => ({
        checklist_template_id: a.checklistTemplateId,
        is_required: Boolean(a.isRequiredForService),
      })),
    };
    const pkey = payloadKeyOf(logicalPayload);

    // prune old recent entries
    pruneRecent();

    // If this exact logical add is already in-flight or was just added, bail out
    if (inflightKeys.current.has(pkey)) {
      return showToast('Already adding this…', 1500);
    }
    if (recentKeys.current.has(pkey)) {
      return showToast('Already added recently', 1500);
    }

    try {
      setAdding(true);
      inflightKeys.current.add(pkey);

      // Server idempotency key (pairs with the same payload key)
      const idKey = idempoKeyRef.current || (idempoKeyRef.current = makeIdempoKey());
      const headers = await headersAuth({ 'Idempotency-Key': idKey });

      const payload = {
        ...logicalPayload,
        notes: notes || null,
        idempotency_key: idKey, // mirrors the header for logging/debug
      };

      console.log('[AddServicePanel] POST /api/schedule payload:', payload);
      const resp = await axios.post('/api/schedule', payload, { headers, withCredentials: true });
      console.log('[AddServicePanel] add result status:', resp?.status);

      // success: clear idem key, mark recent
      idempoKeyRef.current = null;
      recentKeys.current.set(pkey, Date.now() + RECENT_DUPLICATE_WINDOW_MS);

      setNotes('');
      showToast('Added to schedule', 2000);

      // Refresh existing visits list to update duplicate detection
      try {
        const headers = await headersAuth();
        const rangeStart = ymd(startOfToday());
        const rangeEnd = ymd(addDays(startOfToday(), 30));
        const { data } = await axios.get('/api/schedule', {
          headers,
          withCredentials: true,
          params: { start: rangeStart, end: rangeEnd },
          validateStatus: () => true,
        });
        const visits = Array.isArray(data) ? data : (Array.isArray(data?.schedule) ? data.schedule : []);
        setExistingVisits(visits);
      } catch (e) {
        console.log('[AddServicePanel] Failed to refresh visits:', e);
      }

      // Refresh candidates to update recurring_rules for duplicate detection
      try {
        const headers = await headersAuth();
        const { data } = await axios.get('/api/schedule/candidates', {
          headers,
          withCredentials: true,
          validateStatus: () => true,
        });
        const arr = Array.isArray(data) ? data : [];
        setCandidates(arr);
      } catch (e) {
        console.log('[AddServicePanel] Failed to refresh candidates:', e);
      }

      await onSuccess?.();
    } catch (e) {
      const status = e?.response?.status;
      const msg = String(e?.response?.data?.error || '').toLowerCase();
      console.log('[AddServicePanel] add error:', status, e?.response?.data || e);

      // Treat server-side “duplicate”/idempotent hits as success UX
      if (status === 409 || msg.includes('duplicate') || msg.includes('already exists') || msg.includes('idempot')) {
        idempoKeyRef.current = null;
        recentKeys.current.set(pkey, Date.now() + RECENT_DUPLICATE_WINDOW_MS);
        showToast('Already added (idempotent)', 2000);
        await onSuccess?.();
      } else {
        // keep the idempotency key so a manual retry reuses it
        showToast(e?.response?.data?.error || 'Failed to add to schedule', 3500);
      }
    } finally {
      inflightKeys.current.delete(pkey);
      setAdding(false);
    }
  };

  // consistent button style with TeamsManager (feel free to tweak)
  const selectBtn = "w-full border rounded-lg px-3 py-2 text-left bg-white";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Add to Schedule</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-neutral-600 mb-1">Customer</label>
          <InlineSelect
            value={selectedCustomerId || ''}
            options={customerOptions}
            onChange={(v) => setSelectedCustomerId(String(v || ''))}
            placeholder="Select a customer…"
            buttonClassName={selectBtn}
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-600 mb-1">Team</label>
          <InlineSelect
            value={selectedTeamForCreate}
            options={teamOptionsWithUnassigned}
            onChange={(v) => setSelectedTeamForCreate(String(v ?? ''))}
            placeholder="— Unassigned —"
            buttonClassName={selectBtn}
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-600 mb-1">Service</label>
          <InlineSelect
            value={selectedServiceKey || ''}
            options={serviceOptions}
            onChange={(v) => setSelectedServiceKey(String(v || ''))}
            placeholder={
              !selectedCustomerId
                ? 'Select a customer first'
                : serviceOptions.length
                ? 'Select a service…'
                : 'No services for this customer'
            }
            disabled={!selectedCustomerId || !serviceOptions.length}
            buttonClassName={`${selectBtn} ${(!selectedCustomerId || !serviceOptions.length) ? 'bg-neutral-50 cursor-not-allowed' : ''}`}
          />
        </div>

        {checklistEnabled && checklistOptions.length > 0 && (
          <div className="md:col-span-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm text-neutral-600">Checklists for this service</label>
                <div className="text-xs text-neutral-500">Attach multiple; required ones gate completion.</div>
              </div>
              <InlineSelect
                value=""
                options={checklistOptions}
                onChange={(v) => addChecklistAttachment(String(v || ''))}
                placeholder="Add checklist…"
                buttonClassName={selectBtn}
              />
            </div>
            {checklistAttachments.length === 0 ? (
              <div className="text-sm text-neutral-600">No checklists attached.</div>
            ) : (
              <div className="space-y-2">
                {checklistAttachments.map((att) => (
                  <div key={att.checklistTemplateId} className="border rounded-lg p-3 bg-neutral-50 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-neutral-800">{att.templateName}</div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          checked={att.isRequiredForService}
                          onChange={(e) =>
                            updateChecklistAttachment(att.checklistTemplateId, { isRequiredForService: e.target.checked })
                          }
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => removeChecklistAttachment(att.checklistTemplateId)}
                        className="text-xs text-red-600 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <MobileSafeDate label="Start date" value={startDate} onChange={setStartDate} />
        <MobileSafeDate
          label="End date"
          value={recurrence.pattern === 'once' ? startDate : endDate}
          onChange={setEndDate}
          disabled={recurrence.pattern === 'once'}
        />

        <div>
          <label className="block text-sm text-neutral-600 mb-1">Recurrence</label>
          <InlineSelect
            value={recurrence.pattern}
            options={recurrenceOptions}
            onChange={(v) => setRecurrence((r) => {
              const newPattern = String(v);
              const needsInterval = newPattern === 'every_x_weeks' || newPattern === 'every_x_months';
              return {
                ...r,
                pattern: newPattern,
                interval: needsInterval && r.interval < 2 ? 2 : r.interval,
              };
            })}
            buttonClassName={`${selectBtn} ${lockFromCustomer ? 'bg-neutral-50' : ''}`}
          />
          {lockFromCustomer && (
            <div className="text-sm text-neutral-500 mt-1">
              Auto-selected from customer's preference
            </div>
          )}
        </div>

        {(recurrence.pattern === 'every_x_weeks' || recurrence.pattern === 'every_x_months') && (
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Interval</label>
            <input
              type="number"
              min={2}
              className={`w-full border rounded-lg px-3 py-2 ${lockFromCustomer ? 'bg-neutral-50' : ''}`}
              value={recurrence.interval}
              onChange={(e) => setRecurrence((r) => ({ ...r, interval: Math.max(2, Number(e.target.value) || 2) }))}
            />
            {lockFromCustomer && (
              <div className="text-sm text-neutral-500 mt-1">Locked from customer preference</div>
            )}
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm text-neutral-600 mb-1">Notes</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {duplicateWarning && (
          <div className="md:col-span-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            {duplicateWarning}
          </div>
        )}

        <div className="md:col-span-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onAdd()}
            disabled={adding || !!duplicateWarning}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white active:scale-95 transition ${
              adding || duplicateWarning ? 'bg-neutral-400 cursor-not-allowed' : 'bg-zinc-600 hover:bg-blue-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      <Toast show={toast.show} duration={toast.duration} onClose={() => setToast(t => ({ ...t, show: false }))}>
        {toast.message}
      </Toast>

      {/* Recurring schedule warning modal */}
      <Modal open={recurringWarningModal.open} onClose={() => setRecurringWarningModal(m => ({ ...m, open: false }))}>
        <div className="space-y-4 max-w-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Existing Recurring Schedule</h3>
              <p className="text-sm text-neutral-600 mt-1">
                <span className="font-medium">{recurringWarningModal.customerName}</span> already has recurring service scheduled:
              </p>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg border p-3 space-y-2">
            {recurringWarningModal.rules.map((rule) => (
              <div key={rule.rule_id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{rule.service_name}</span>
                  <span className="text-neutral-500 ml-2">({formatPattern(rule.pattern, rule.interval)})</span>
                </div>
                <div className="text-neutral-500 text-xs">
                  {rule.start_date && `Started ${rule.start_date}`}
                  {rule.end_date && ` · Ends ${rule.end_date}`}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-neutral-600">
            Did you mean to edit the existing schedule, or add a new one?
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRecurringWarningModal(m => ({ ...m, open: false }))}
              className="px-4 py-2 rounded-lg border text-sm bg-white hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setRecurringWarningModal(m => ({ ...m, open: false }));
                onAdd(true); // Skip the recurring check and proceed
              }}
              className="px-4 py-2 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-700"
            >
              Add New Anyway
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
