// src/pages/Invoices.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  RefreshCw,
  Hash,
  Repeat,
  Search,
  X,
  Filter,
  AlertTriangle,
  Link2,
} from 'lucide-react';
import Toast from '../components/Toast';

const centsToUSD = (cents, currency = 'USD') =>
  typeof cents === 'number'
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
    : '';

const ymd = (d) =>
  (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || '').slice(0, 10));

// Human label for pattern+interval
const labelFor = (pattern, interval) => {
  const p = String(pattern || '').toLowerCase();
  const n = Number(interval || 1);
  if (!p || p === 'once') return 'One-off';
  if (p === 'weekly') return 'Weekly';
  if (p === 'every_x_weeks') return `Every ${n} week${n === 1 ? '' : 's'}`;
  if (p === 'monthly') return 'Monthly';
  if (p === 'every_x_months') return `Every ${n} month${n === 1 ? '' : 's'}`;
  if (p === 'every_6_months') return 'Every 6 months';
  return 'Recurring';
};

// Recurrence detection precedence
const recurrenceInfoFrom = (inv = {}) => {
  const p = inv.recurrence_pattern;
  if (p != null) {
    const isRecurring = String(p).toLowerCase() !== 'once';
    const label = inv.recurrence_label || labelFor(p, inv.recurrence_interval);
    return { isRecurring, label, via: 'pattern' };
  }
  if (inv.is_recurring === true) return { isRecurring: true, label: inv.recurrence_label || 'Recurring', via: 'is_recurring' };
  if (inv.schedule_rule_id)  return { isRecurring: true, label: inv.recurrence_label || 'Recurring', via: 'schedule_rule_id' };
  const bySource = String(inv.source || '').toLowerCase() === 'recurring';
  return { isRecurring: bySource, label: inv.recurrence_label || (bySource ? 'Recurring' : 'One-off'), via: 'source' };
};

export default function Invoices() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};

  const [dataLoading, setDataLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [caps, setCaps] = useState({ can_edit_due_date: false, can_send: false, can_mark_paid: false });
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2600 });
  const [srLoading, setSrLoading] = useState(false);
  const [srError, setSrError] = useState('');
  const [srRows, setSrRows] = useState([]);
  const [resending, setResending] = useState(new Set());

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(''); // '', draft, scheduled, sent, paid, failed, void
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const showToast = (msg, duration = 2600) => setToast({ show: true, msg, duration });

  const fetchServiceRecordsNeedingPayment = async () => {
    setSrLoading(true);
    setSrError('');
    try {
      const params = new URLSearchParams();
      params.set('payment_state', 'requires_payment_method,requires_action,failed');
      params.set('balance_gt', '0');
      const url = `/api/service-records?${params.toString()}`;
      const { data } = await axios.get(url, { withCredentials: true });
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setSrRows(list);
    } catch (e) {
      console.error('[ServiceRecords] fetch failed', e?.response?.data || e);
      setSrError('Failed to load service records needing payment');
      setSrRows([]);
    } finally {
      setSrLoading(false);
    }
  };

  const fetchInvoices = async (opts = {}) => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams();
      // backend understands: q, status, date_from, date_to
      if (opts.q != null ? opts.q : q) params.set('q', (opts.q != null ? opts.q : q).trim());
      if (opts.status != null ? opts.status : status) params.set('status', (opts.status != null ? opts.status : status));
      if (opts.dateFrom != null ? opts.dateFrom : dateFrom) params.set('date_from', (opts.dateFrom != null ? opts.dateFrom : dateFrom));
      if (opts.dateTo != null ? opts.dateTo : dateTo) params.set('date_to', (opts.dateTo != null ? opts.dateTo : dateTo));

      const url = params.toString() ? `/api/invoices?${params.toString()}` : '/api/invoices';
      const { data } = await axios.get(url, { withCredentials: true });

      if (data && Array.isArray(data.items)) {
        setRows(data.items);
        setCaps({
          can_edit_due_date: !!data.caps?.can_edit_due_date,
          can_send: !!data.caps?.can_send,
          can_mark_paid: !!data.caps?.can_mark_paid,
        });
      } else if (Array.isArray(data)) {
        setRows(data);
        setCaps({ can_edit_due_date: false, can_send: false, can_mark_paid: false });
      } else {
        setRows([]);
        setCaps({ can_edit_due_date: false, can_send: false, can_mark_paid: false });
      }
    } catch (e) {
      console.error('[Invoices] fetch failed', e?.response?.data || e);
      showToast('Failed to load invoices');
      setRows([]);
      setCaps({ can_edit_due_date: false, can_send: false, can_mark_paid: false });
    } finally {
      setDataLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchInvoices();
    fetchServiceRecordsNeedingPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grouping
  const group = useMemo(() => {
    const open = [];
    const paid = [];
    for (const r of rows) {
      const s = String(r.status || '').toLowerCase();
      if (s === 'paid') paid.push(r);
      else open.push(r);
    }
    open.sort((a, b) =>
      ymd(a.effective_due_date || a.due_date).localeCompare(ymd(b.effective_due_date || b.due_date))
    );
    paid.sort((a, b) =>
      ymd(b.updated_at || b.created_at).localeCompare(ymd(a.updated_at || a.created_at))
    );
    return { open, paid };
  }, [rows]);

  const onSubmit = (e) => {
    e?.preventDefault?.();
    fetchInvoices();
  };

  const onClear = () => {
    setQ('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    fetchInvoices({ q: '', status: '', dateFrom: '', dateTo: '' });
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Invoices</h1>
          <button
            type="button"
            onClick={() => { fetchInvoices(); fetchServiceRecordsNeedingPayment(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50"
          >
            <RefreshCw className={dataLoading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            Refresh
          </button>
        </div>

        {/* Service records needing payment */}
        <div className="bg-white border border-amber-100 rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-neutral-800">Service records needing payment</h2>
            </div>
            <button
              type="button"
              onClick={fetchServiceRecordsNeedingPayment}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-white hover:bg-neutral-50 text-xs"
            >
              <RefreshCw className={srLoading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
              Refresh
            </button>
          </div>
          {srLoading ? (
            <div className="text-sm text-neutral-600">Loading service records…</div>
          ) : srError ? (
            <div className="text-sm text-red-600">{srError}</div>
          ) : srRows.length === 0 ? (
            <div className="text-sm text-neutral-500">No service records require payment right now.</div>
          ) : (
            <div className="space-y-2">
              {srRows.map((sr) => {
                const balance = centsToUSD(sr.balance_cents, sr.currency || 'USD');
                const total = centsToUSD(sr.total_cents, sr.currency || 'USD');
                const disabled = resending.has(sr.service_record_id || sr.id);
                const srId = sr.service_record_id || sr.id;
                return (
                  <div key={srId} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-semibold text-neutral-800">
                        Service Record #{srId}
                      </div>
                      <div className="text-xs text-neutral-600 flex flex-wrap gap-2">
                        {sr.customer_name && <span>{sr.customer_name}</span>}
                        {sr.property && sr.property.normalized_address && (
                          <span className="truncate">{sr.property.normalized_address}</span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-600 flex flex-wrap gap-3">
                        <span>Status: {sr.payment_state || 'unknown'}</span>
                        <span>Total: {total || '$0.00'}</span>
                        <span>Balance: {balance || '$0.00'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/app/service-records/${srId}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm bg-white hover:bg-neutral-50"
                      >
                        <Link2 className="w-4 h-4" /> View service record
                      </a>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
                        disabled={disabled}
                        onClick={async () => {
                          if (!srId) return;
                          setResending((prev) => new Set(prev).add(srId));
                          try {
                            await axios.post(`/api/service-records/${srId}/resend-payment-link`, {}, { withCredentials: true });
                            showToast('Payment link sent');
                          } catch (e) {
                            const msg = e?.response?.data?.error || 'Failed to resend payment link';
                            showToast(msg, 3200);
                          } finally {
                            setResending((prev) => {
                              const next = new Set(prev);
                              next.delete(srId);
                              return next;
                            });
                          }
                        }}
                      >
                        Resend payment link
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={onSubmit} className="w-full bg-white border border-neutral-200 rounded-xl shadow-sm p-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Keyword */}
            <div className="md:col-span-5">
              <label className="block text-xs text-neutral-600 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-2.5 text-neutral-400" />
                <input
                  className="w-full pl-8 pr-10 py-2 border rounded-lg"
                  placeholder="Name, email, #invoice, cust:ID"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q ? (
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="absolute right-2 top-2.5 text-neutral-400 hover:text-neutral-600"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Status */}
            <div className="md:col-span-3">
              <label className="block text-xs text-neutral-600 mb-1">Status</label>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-2 top-2.5 text-neutral-400" />
                <select
                  className="w-full pl-8 pr-3 py-2 border rounded-lg bg-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="sent">Sent</option>
                  <option value="open">Open</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="void">Void</option>
                </select>
              </div>
            </div>

            {/* Date range */}
            <div className="md:col-span-2">
              <label className="block text-xs text-neutral-600 mb-1">Due from</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-neutral-600 mb-1">Due to</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="md:col-span-12 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClear}
                className="px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50"
              >
                Clear
              </button>
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-zinc-800 text-white"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Open / Unpaid */}
      <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Open</h2>
          <div className="text-sm text-neutral-600">{group.open.length} items</div>
        </div>

        {dataLoading ? (
          <div className="text-neutral-500">Loading…</div>
        ) : group.open.length === 0 ? (
          <div className="text-neutral-600">No open invoices.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {group.open.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </section>

      {/* Paid */}
      <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Paid</h2>
          <div className="text-sm text-neutral-600">{group.paid.length} items</div>
        </div>

        {dataLoading ? (
          <div className="text-neutral-500">Loading…</div>
        ) : group.paid.length === 0 ? (
          <div className="text-neutral-600">No paid invoices.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {group.paid.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} readOnly />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InvoiceRow({ inv, readOnly = false }) {
  const due = ymd(inv.effective_due_date || inv.due_date);
  const period = `${ymd(inv.period_start) || '—'} → ${ymd(inv.period_end) || '—'}`;
  const isPaid = String(inv.status || '').toLowerCase() === 'paid';
  const serviceRecordId = inv.service_record_id || inv.serviceRecordId || null;
  const detailHref = serviceRecordId ? `/app/service-records/${serviceRecordId}` : `/app/invoices/${inv.id}`;

  const addr =
    inv.street || inv.city || inv.state
      ? [inv.street, [inv.city, inv.state].filter(Boolean).join(', ')]
          .filter(Boolean)
          .join(', ')
      : '';

  const { isRecurring, label: recurrenceLabel } = recurrenceInfoFrom(inv);

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        {/* Left: title & money */}
        <div className="min-w-0">
          <div className="font-semibold text-[#111827] truncate">
            <a
              className="underline decoration-neutral-300 hover:decoration-neutral-600"
              href={detailHref}
              title={serviceRecordId ? `Open service record #${serviceRecordId}` : `Open invoice #${inv.id}`}
            >
              {inv.customer_name || `Customer #${inv.customer_id}`}
            </a>
          </div>

          <div className="mt-0.5 text-sm text-neutral-600 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {centsToUSD(inv.total_cents, inv.currency || 'USD') || '$0.00'}
            </span>

            <span className="inline-flex items-center gap-1">
              <Hash className="w-4 h-4" />
              #{inv.id}
            </span>

            {addr ? <span className="truncate">{addr}</span> : null}
          </div>
        </div>

        {/* Right: status, due, recurrence */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
              isPaid
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}
            title={inv.status}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPaid ? 'Paid' : 'Open'}
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border text-blue-800 bg-blue-50 border-blue-200">
            <Clock className="w-4 h-4" />
            Due {due || '—'}
            {inv.due_date_overridden ? ' (override)' : ''}
          </span>

          {/* Recurring vs One-off badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
              isRecurring
                ? 'text-blue-800 bg-blue-50 border-blue-200'
                : 'text-neutral-700 bg-neutral-100 border-neutral-200'
            }`}
            title={isRecurring ? (inv.recurrence_label || 'Recurring invoice') : 'One-off invoice'}
          >
            <Repeat className="w-4 h-4" />
            {recurrenceLabel}
          </span>
        </div>
      </div>

      <div className="mt-1 text-xs text-neutral-600 flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5" />
        <span>Period {period}</span>
      </div>
    </div>
  );
}
