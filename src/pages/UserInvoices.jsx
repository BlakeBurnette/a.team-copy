// src/pages/UserInvoices.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Calendar, CheckCircle2, Clock, CreditCard, DollarSign, Info, RefreshCw, Save,
} from 'lucide-react';
import Toast from '../components/Toast';
import Dropdown from '../components/Dropdown';

function centsToUSD(cents, currency = 'USD', locale) {
  if (typeof cents !== 'number') return '';
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
const ymd = (d) => (d ? String(d).slice(0, 10) : '');

/**
 * Build the allowed autopay days, EXCLUDING today:
 *   allowed = [1..orgDueDay] \ {today}  ∪  [today+1 .. 28]
 * All values are clamped to 1..28.
 */
function buildAllowedDays(todayDay, orgDueDay) {
  const today = Math.min(Math.max(Number(todayDay) || 1, 1), 31);
  const due = Math.min(Math.max(Number(orgDueDay) || 28, 1), 28);

  const set = new Set();
  for (let i = 1; i <= due; i += 1) if (i !== today) set.add(i);
  for (let i = Math.min(today + 1, 29); i <= 28; i += 1) set.add(i);
  return [...set].sort((a, b) => a - b);
}

// Pull brand/last4 from /api/users/billing/status response
function derivePmSnapshot(status) {
  if (!status) return { has_default_pm: false, pm_brand: '', pm_last4: '' };

  const list = Array.isArray(status.paymentMethods) ? status.paymentMethods : [];
  const defaultId = status.default_payment_method || null;

  const chosen =
    (defaultId && list.find((p) => p.id === defaultId)) ||
    list.find((p) => p.is_default) ||
    list[0];

  if (!chosen) return { has_default_pm: false, pm_brand: '', pm_last4: '' };

  const brand = chosen.brand || chosen.card?.brand || '';
  const last4 = chosen.last4 || chosen.card?.last4 || '';
  return { has_default_pm: true, pm_brand: brand, pm_last4: last4 };
}

// --- Helpers to support either /api/users/* or /api/user/* backends for billing settings ---
async function getBillingSettings() {
  try {
    return (await axios.get('/api/users/billing-settings', { withCredentials: true })).data;
  } catch (e1) {
    try {
      return (await axios.get('/api/user/billing-settings', { withCredentials: true })).data;
    } catch {
      return null; // tolerate missing route
    }
  }
}
async function patchBillingSettings(payload) {
  try {
    await axios.patch('/api/users/billing-settings', payload, { withCredentials: true });
  } catch (e1) {
    await axios.patch('/api/user/billing-settings', payload, { withCredentials: true });
  }
}

export default function UserInvoices() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};

  // page state
  const [dataLoading, setDataLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2600 });
  const showToast = (msg, duration = 2600) => setToast({ show: true, msg, duration });

  // org (for due-day clamp)
  const [org, setOrg] = useState(null);
  const orgDueDay = useMemo(() => {
    const d = Number(org?.invoice_due_day);
    return Number.isFinite(d) ? Math.min(Math.max(d, 1), 28) : 28;
  }, [org?.invoice_due_day]);

  // today
  const todayDay = useMemo(() => new Date().getDate(), []);

  // allowed autopay days (exclude today)
  const allowedDays = useMemo(
    () => buildAllowedDays(todayDay, orgDueDay),
    [todayDay, orgDueDay]
  );
  const allowedOptions = useMemo(
    () => allowedDays.map((n) => ({ value: String(n), label: String(n) })),
    [allowedDays]
  );

  // billing settings
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    autopay_enabled: false,
    preferred_charge_day: '',
    has_default_pm: false,
    pm_brand: '',
    pm_last4: '',
    consent_accepted_at: null,
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  // invoices
  const [rows, setRows] = useState([]);
  const group = useMemo(() => {
    const upcoming = [];
    const paid = [];
    const failed = [];
    for (const r of rows) {
      const s = String(r.status || '').toLowerCase();
      if (s === 'paid') paid.push(r);
      else if (s === 'failed') failed.push(r);
      else upcoming.push(r);
    }
    upcoming.sort(
      (a, b) =>
        new Date(ymd(a.effective_due_date || a.due_date)) -
        new Date(ymd(b.effective_due_date || b.due_date))
    );
    paid.sort(
      (a, b) =>
        new Date(ymd(b.updated_at || b.created_at)) -
        new Date(ymd(a.updated_at || a.created_at))
    );
    failed.sort(
      (a, b) =>
        new Date(ymd(b.updated_at || b.created_at)) -
        new Date(ymd(a.updated_at || a.created_at))
    );
    return { upcoming, failed, paid };
  }, [rows]);

  const fetchAll = async () => {
    setDataLoading(true);
    try {
      // Consolidated invoices route (role-aware) + existing billing endpoints
      const [orgRes, statusRes, settingsData, invRes] = await Promise.allSettled([
        axios.get('/api/user/my-organization', { withCredentials: true }),
        axios.get('/api/users/billing/status', { withCredentials: true }),
        getBillingSettings(),
        axios.get('/api/invoices?flat=1', { withCredentials: true }),
      ]);

      const orgData = orgRes.status === 'fulfilled' ? orgRes.value?.data : null;
      setOrg(orgData || null);

      const s = settingsData && settingsData.value ? settingsData.value : {};
      setSettings(s || null);

      const statusData =
        statusRes.status === 'fulfilled' ? statusRes.value?.data : null;
      const pmSnapshot = derivePmSnapshot(statusData);

      // Preferred day normalize
      const preferred = s?.preferred_charge_day ?? '';
      const normalizedPreferred =
        preferred === '' || preferred == null
          ? ''
          : allowedDays.includes(Number(preferred))
          ? Number(preferred)
          : '';

      setForm({
        autopay_enabled: !!s?.autopay_enabled,
        preferred_charge_day: normalizedPreferred,
        has_default_pm: pmSnapshot.has_default_pm || !!s?.has_default_pm,
        pm_brand: pmSnapshot.pm_brand || s?.pm_brand || '',
        pm_last4: pmSnapshot.pm_last4 || s?.pm_last4 || '',
        consent_accepted_at: s?.consent_accepted_at || null,
      });
      setConsentChecked(false);

      const invList =
        invRes.status === 'fulfilled' && Array.isArray(invRes.value?.data)
          ? invRes.value.data
          : [];
      setRows(invList);
    } catch (e) {
      console.error('[UserInvoices] load failed:', e?.response?.data || e);
      showToast('Failed to load billing info');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If orgDueDay changes and current selection becomes invalid, clear it.
  useEffect(() => {
    setForm((f) => {
      if (f.preferred_charge_day === '' || allowedDays.includes(Number(f.preferred_charge_day))) {
        return f;
      }
      return { ...f, preferred_charge_day: '' };
    });
  }, [allowedDays]);

  const onSaveSettings = async () => {
    setSaving(true);
    try {
      if (form.autopay_enabled && !form.has_default_pm) {
        showToast('Add a payment method before enabling autopay', 3200);
        setSaving(false);
        return;
      }

      const chosen = form.preferred_charge_day === '' ? null : Number(form.preferred_charge_day);

      if (chosen !== null && !allowedDays.includes(chosen)) {
        showToast(
          `Please choose a day between 1–${orgDueDay} (excluding today) or after today up to 28.`,
          3600
        );
        setSaving(false);
        return;
      }

      const needsConsent = form.autopay_enabled && !form.consent_accepted_at;
      if (needsConsent && !consentChecked) {
        showToast('Please authorize automatic payments to continue', 3200);
        setSaving(false);
        return;
      }

      const headers = await authHeader();
      const payload = {
        autopay_enabled: !!form.autopay_enabled,
        preferred_charge_day: chosen === null ? null : Math.max(1, Math.min(chosen, 28)),
      };

      if (needsConsent && consentChecked) {
        payload.consent = {
          accepted: true,
          text: legalText({ chargeDay: chosen || orgDueDay }),
        };
      }

      await patchBillingSettings(payload);
      showToast('Billing settings saved');
      await fetchAll();
    } catch (e) {
      console.error('[UserInvoices] save settings failed:', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Failed to save billing settings');
    } finally {
      setSaving(false);
    }
  };

  const openSetupLink = async () => {
    try {
      const { data } = await axios.post('/api/users/billing/portal', {}, { withCredentials: true });
      const url = data?.url;
      if (!url) throw new Error('No setup link returned');
      window.location.assign(url);
    } catch (e) {
      console.error('[UserInvoices] open setup link failed:', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Could not open secure card form');
    }
  };

  // legal text builder (snapshot for consent)
  const legalText = ({ chargeDay }) => {
    const orgName = org?.name || 'the service provider';
    const day = Math.min(Number(chargeDay || orgDueDay) || orgDueDay, orgDueDay);
    return `I authorize ${orgName} to charge my saved payment method for service payments on or after day ${day} of each billing period and no later than the stated due date. Charges are automatic off-session; you can revoke this authorization by turning off autopay before a charge is attempted.`;
  };

  return (
    <div className="space-y-6">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      {/* Header / refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Payments & Billing</h1>
        <button
          type="button"
          onClick={fetchAll}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50"
        >
          <RefreshCw className={dataLoading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          Refresh
        </button>
      </div>

      {/* Billing settings */}
      <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Autopay Settings</h2>
          {orgDueDay ? (
            <div className="text-xs text-neutral-600 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Your payments are drafted on/before day{' '}
              <span className="font-semibold">{orgDueDay}</span> of each period.
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Payment method card */}
          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Payment Method</div>
            {dataLoading ? (
              <div className="text-neutral-500">Loading…</div>
            ) : form.has_default_pm ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-neutral-500" />
                  <span>
                    {form.pm_brand || 'Card'} •••• {form.pm_last4 || '••••'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openSetupLink}
                  className="px-3 py-1.5 rounded-md border bg-white hover:bg-neutral-50 text-sm"
                >
                  Update
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-700">No card on file.</div>
                <button
                  type="button"
                  onClick={openSetupLink}
                  className="px-3 py-1.5 rounded-md border bg-white hover:bg-neutral-50 text-sm"
                >
                  Add Card
                </button>
              </div>
            )}
            <div className="mt-2 text-[11px] text-neutral-500">
              Your card is stored and processed securely by our payment processor.
            </div>
          </div>

          {/* Autopay controls */}
          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Autopay</div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={!!form.autopay_enabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, autopay_enabled: e.target.checked }))
                  }
                />
                <span className="text-sm">Enable automatic payments</span>
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Dropdown
                label="Preferred charge day"
                options={allowedOptions}
                value={String(form.preferred_charge_day ?? '')}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    preferred_charge_day: v === '' ? '' : Number(v),
                  }))
                }
                placeholder="Choose day"
                fullWidth
              />
              <div className="text-xs text-neutral-600 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5" />
                <span>
                  Charges run on the selected day for the upcoming billing period
                  (never today and never after day {orgDueDay}).
                </span>
              </div>
            </div>

            {/* Consent box only when enabling & no prior consent */}
            {form.autopay_enabled && !form.consent_accepted_at && (
              <div className="mt-4">
                <div className="p-3 rounded-lg border bg-neutral-50 text-xs text-neutral-800">
                  {legalText({
                    chargeDay: form.preferred_charge_day || orgDueDay,
                  })}
                </div>
                <label className="mt-2 inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    required
                  />
                  <span>I agree and authorize these payments.</span>
                </label>
              </div>
            )}

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={onSaveSettings}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Settings
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming / Due */}
      <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Upcoming & Due</h2>
          <div className="text-sm text-neutral-600">{group.upcoming.length} items</div>
        </div>

        {dataLoading ? (
          <div className="text-neutral-500">Loading…</div>
        ) : group.upcoming.length === 0 ? (
          <div className="text-neutral-600">No upcoming payments.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {group.upcoming.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} autopayOn={!!form.autopay_enabled} />
            ))}
          </div>
        )}
      </section>

      {/* Failed (if any) */}
      {group.failed.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Failed</h2>
            <div className="text-sm text-neutral-600">{group.failed.length} items</div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {group.failed.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} failed />
            ))}
          </div>
          <div className="mt-2 text-xs text-neutral-600">
            To retry, ensure your card is up-to-date above. We’ll re-attempt automatically up to 2 times.
          </div>
        </section>
      )}

      {/* Paid history */}
      <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Paid</h2>
          <div className="text-sm text-neutral-600">{group.paid.length} items</div>
        </div>
        {dataLoading ? (
          <div className="text-neutral-500">Loading…</div>
        ) : group.paid.length === 0 ? (
          <div className="text-neutral-600">No completed payments yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {group.paid.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} readOnly />
            ))}
          </div>
        )}
        <div className="mt-3 text-xs text-neutral-600">
          Need receipts? See{' '}
          <a href="/app/user/payments" className="text-zinc-600 underline">
            Payments
          </a>
          .
        </div>
      </section>
    </div>
  );
}

function InvoiceRow({ inv, autopayOn = false, failed = false }) {
  const due = ymd(inv.effective_due_date || inv.due_date);
  const period = `${ymd(inv.period_start) || '—'} → ${ymd(inv.period_end) || '—'}`;
  const isPaid = String(inv.status || '').toLowerCase() === 'paid';
  const isFailed = failed || String(inv.status || '').toLowerCase() === 'failed';

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-[#111827] truncate">
            {inv.customer_name || 'Payment item'}
          </div>
          <div className="text-sm text-neutral-600">
            <DollarSign className="inline w-4 h-4 mr-1" />
            {centsToUSD(inv.total_cents, inv.currency) || '$0.00'}
          </div>
          <div className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Period {period}</span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
              isPaid
                ? 'text-green-700 bg-green-50 border-green-200'
                : isFailed
                ? 'text-red-700 bg-red-50 border-red-200'
                : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}
            title={inv.status}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPaid ? 'Paid' : isFailed ? 'Failed' : 'Open'}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border text-blue-800 bg-blue-50 border-blue-200">
            <Clock className="w-4 h-4" />
            Due {due || '—'}
            {inv.due_date_overridden ? ' (override)' : ''}
          </span>
          {!isPaid && !isFailed && (
            <div className="text-[11px] text-neutral-600">
              {autopayOn ? 'Will charge automatically' : 'Manual payment required'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
