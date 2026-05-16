// src/pages/Payments.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, ShieldAlert,
  CreditCard, DollarSign, Undo2, X, SlidersHorizontal, MinusCircle, AlertCircle
} from 'lucide-react';
import Dropdown from '../components/Dropdown';
import ARDashboard from './ARDashboard';

function cx(...xs){ return xs.filter(Boolean).join(' '); }

function formatMoney(amountMinor, currency = 'USD', locale) {
  const nf = new Intl.NumberFormat(locale || undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// NEW: include partially_refunded as a first-class tone target
const toneFor = (s) => (
  s === 'succeeded' ? 'success' :
  s === 'processing' ? 'info' :
  s === 'requires_capture' || s === 'requires_payment_method' ? 'warn' :
  s === 'canceled' || s === 'refunded' || s === 'partially_refunded' || s === 'failed' ? 'danger' :
  s === 'disputed' ? 'warn' : 'neutral'
);

// shared options for Dropdown
const STATUS_VALUES = ['any','succeeded','processing','requires_capture','requires_payment_method','canceled','failed','refunded','disputed','partially_refunded'];
const STATUS_OPTIONS = STATUS_VALUES.map(s => ({ value: s, label: s.replace('_',' ') }));
const LIMIT_OPTIONS = [10,20,50,100].map(n => ({ value: n, label: String(n) }));

// NEW: small helpers to normalize refunds from various backends
function getRefundedMinor(p) {
  // Support multiple shapes the backend might return:
  // - amount_refunded (Stripe-like)
  // - refunded_minor / amount_refunded_minor (custom)
  // - refunds_total_minor (aggregated)
  return (
    (p.amount_refunded != null ? Number(p.amount_refunded) : null) ??
    (p.amount_refunded_minor != null ? Number(p.amount_refunded_minor) : null) ??
    (p.refunded_minor != null ? Number(p.refunded_minor) : null) ??
    (p.refunds_total_minor != null ? Number(p.refunds_total_minor) : 0)
  );
}
function isRefundedLike(p) {
  const s = String(p.status || '').toLowerCase();
  const refundedMinor = getRefundedMinor(p);
  return s === 'refunded' || s === 'partially_refunded' || p.refunded === true || (refundedMinor > 0);
}
function isPartialRefund(p) {
  const refundedMinor = getRefundedMinor(p);
  return refundedMinor > 0 && refundedMinor < Number(p.amount || 0);
}

export default function Payments({ embedded = false }) {
  const [searchParams] = useSearchParams();

  // Tab state - read from URL param on mount; when embedded, always show payments only
  const [activeTab, setActiveTab] = useState(() => {
    if (embedded) return 'payments';
    const tabParam = searchParams.get('tab');
    return tabParam === 'receivables' ? 'receivables' : 'payments';
  });
  const [arCount, setArCount] = useState(0);

  // state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [accountId, setAccountId] = useState(null);

  const [payments, setPayments] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [prevStack, setPrevStack] = useState([]);

  // filters
  const [query, setQuery] = useState('');
  const dq = useDebounced(query);
  const [status, setStatus] = useState('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(20);

  // mobile filters drawer
  const [filtersOpen, setFiltersOpen] = useState(false);

  // refund
  const [showRefund, setShowRefund] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch A/R count for badge
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get('/api/accounts-receivable/summary', {
          withCredentials: true,
          validateStatus: () => true,
        });
        setArCount(data?.count || 0);
      } catch {
        setArCount(0);
      }
    })();
  }, [activeTab]);

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
      setPayments(data.items || []);
      setHasMore(!!data.has_more);
      setNextCursor(data.next_cursor || null);

      if (!replaceHistory && starting_after) setPrevStack((s)=>[...s, starting_after]);
      else if(!starting_after) setPrevStack([]);
    } catch (e) {
      console.error('[Payments] list error:', e?.response?.data || e);
      setErr(e?.response?.data?.error || e?.message || 'Failed to load Stripe payments');
    } finally { setLoading(false); }
  };

  const onRefresh = () => fetchPage({ replaceHistory: true });

  useEffect(() => { fetchPage({ replaceHistory: true }); /* eslint-disable-next-line */ }, [dq, status, from, to, limit]);

  const goNext = () => { if (hasMore && nextCursor) fetchPage({ starting_after: nextCursor }); };
  const goPrev = () => {
    if (!prevStack.length) return;
    const c=[...prevStack]; c.pop(); const prev=c.pop();
    setPrevStack(c);
    fetchPage({ starting_after: prev || null, replaceHistory: true });
  };

  const openRefund = (row) => {
    setRefundTarget(row);
    setRefundAmount((row.amount / 100).toFixed(2));
    setShowRefund(true);
  };
  const submitRefund = async () => {
    if (!refundTarget) return;
    const major = parseFloat(refundAmount);
    if (!Number.isFinite(major) || major <= 0) { setToast({ tone:'danger', msg:'Enter a valid refund amount.' }); return; }
    setRefundLoading(true);
    try {
      const payload = { payment_intent: refundTarget.payment_intent_id, amount_minor: Math.round(major*100) };
      const { data } = await axios.post('/api/owner/stripe/refund', payload, { headers: authHeader, withCredentials: true });
      if (!data?.ok) throw new Error(data?.error || 'Refund failed');
      setToast({ tone:'success', msg:`Refund requested: ${formatMoney(payload.amount_minor, refundTarget.currency)}` });
      setShowRefund(false); setRefundTarget(null);
      fetchPage({ replaceHistory: true });
    } catch (e) {
      console.error('[Payments] refund error:', e?.response?.data || e);
      setToast({ tone:'danger', msg: e?.response?.data?.error || e?.message || 'Refund failed' });
    } finally { setRefundLoading(false); }
  };

  // --------------------------- UI ---------------------------

  const Filters = ({ inline=false }) => (
    <div className={cx(inline ? '' : 'p-4', 'space-y-3')}>
      {/* Search */}
      <div>
        {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">Search</label>}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            aria-label="Search payments"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="email, last4, description, amount…"
            className="w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Grid of controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">Status</label>}
          {inline ? (
            <Dropdown
              label={null}
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v)=>setStatus(String(v))}
              placeholder="Any status"
              fullWidth
            />
          ) : (
            <select
              aria-label="Status"
              value={status}
              onChange={(e)=>setStatus(e.target.value)}
              className="w-full py-2.5 px-3 border rounded-lg bg-white"
            >
              {STATUS_VALUES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          )}
        </div>

        <div>
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">Per Page</label>}
          {inline ? (
            <Dropdown
              label={null}
              options={LIMIT_OPTIONS}
              value={limit}
              onChange={(v)=>setLimit(parseInt(v,10))}
              placeholder="Per page"
              fullWidth
            />
          ) : (
            <select
              aria-label="Per page"
              value={limit}
              onChange={(e)=>setLimit(parseInt(e.target.value||'20',10))}
              className="w-full py-2.5 px-3 border rounded-lg bg-white"
            >
              {[10,20,50,100].map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </div>

        <div>
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">From</label>}
          <input aria-label="From date" type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="w-full py-2.5 px-3 border rounded-lg"/>
        </div>
        <div>
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">To</label>}
          <input aria-label="To date" type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="w-full py-2.5 px-3 border rounded-lg"/>
        </div>
      </div>
    </div>
  );

  const AmountCell = ({ p }) => {
    const refundedMinor = getRefundedMinor(p);
    const showRefundLine = refundedMinor > 0;
    const partial = isPartialRefund(p);
    return (
      <div className="whitespace-nowrap">
        <div className="font-medium">{formatMoney(p.amount, p.currency)}</div>
        {showRefundLine && (
          <div className={cx('text-xs mt-0.5 inline-flex items-center gap-1',
              partial ? 'text-amber-700' : 'text-red-700')}>
            <MinusCircle className="h-3.5 w-3.5" />
            Refunded {formatMoney(refundedMinor, p.currency)}
          </div>
        )}
      </div>
    );
  };

  const StatusCell = ({ p }) => {
    const s = String(p.status || '').toLowerCase();
    const refundedMinor = getRefundedMinor(p);
    const refundedTag =
      refundedMinor > 0 ? (
        <Pill tone={partialRefundTone(p)}>
          −{formatMoney(refundedMinor, p.currency)} refunded
        </Pill>
      ) : null;

    return (
      <div className="flex flex-col gap-1 items-start">
        <Pill tone={toneFor(s)}>{s || 'unknown'}</Pill>
        {refundedTag}
      </div>
    );
  };

  function partialRefundTone(p) {
    return isPartialRefund(p) ? 'warn' : 'danger';
  }

  // Tabs component (reusable)
  const TabsHeader = () => (
    <div className="flex gap-1 border-b mb-4">
      <button
        onClick={() => setActiveTab('payments')}
        className={cx(
          'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
          activeTab === 'payments'
            ? 'border-amber-500 text-amber-600'
            : 'border-transparent text-neutral-600 hover:text-neutral-900'
        )}
      >
        Payments
      </button>
      <button
        onClick={() => setActiveTab('receivables')}
        className={cx(
          'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-2',
          activeTab === 'receivables'
            ? 'border-amber-500 text-amber-600'
            : 'border-transparent text-neutral-600 hover:text-neutral-900'
        )}
      >
        Receivables
        {arCount > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">
            {arCount > 99 ? '99+' : arCount}
          </span>
        )}
      </button>
    </div>
  );

  // If showing A/R tab, render the ARDashboard
  if (activeTab === 'receivables') {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold">Payments</h1>
        <div className="text-sm text-neutral-600 mb-4">Manage payments and outstanding receivables</div>
        <TabsHeader />
        <ARDashboard embedded />
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'p-4 md:p-6'}>
      {/* Header with Tabs */}
      {!embedded && (
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4 md:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Payments</h1>
          <div className="text-sm text-neutral-600 mb-4">Manage payments and outstanding receivables</div>

          {/* Tabs */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setActiveTab('payments')}
              className={cx(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'payments'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              )}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('receivables')}
              className={cx(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-2',
                activeTab === 'receivables'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              )}
            >
              Receivables
              {arCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">
                  {arCount > 99 ? '99+' : arCount}
                </span>
              )}
            </button>
          </div>

          {hasAccount && (
            <div className="mt-3 text-[11px] text-neutral-500 truncate">
              Connected Account: <span className="font-mono">{accountId}</span>
            </div>
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
            type="button" disabled={loading} title="Refresh"
          >
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>
      )}

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
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
            disabled={loading}
          >
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <div className="flex-1" />
          <div className="text-xs text-neutral-500">
            {payments.length ? `${payments.length} shown` : ''}
          </div>
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
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-neutral-500">Loading…</td></tr>
              ) : err ? (
                <tr><td colSpan={9} className="py-6 text-center text-red-600">{err}</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-neutral-500">No payments found.</td></tr>
              ) : payments.map((p) => (
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

                  {/* NEW: Amount cell shows original + refunded negative line */}
                  <td className="py-3 px-4"><AmountCell p={p} /></td>

                  <td className="py-3 px-4">{p.fee_minor != null ? formatMoney(p.fee_minor, p.currency) : '—'}</td>
                  <td className="py-3 px-4">{p.net_minor != null ? formatMoney(p.net_minor, p.currency) : '—'}</td>

                  {/* NEW: Status cell adds a “−$X refunded” pill when applicable */}
                  <td className="py-3 px-4"><StatusCell p={p} /></td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={()=>openRefund(p)}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50"
                      disabled={!p.refundable || isRefundedLike(p)}
                      title={isRefundedLike(p) ? 'Already refunded' : 'Refund'}
                    >
                      <Undo2 className="h-4 w-4" />
                      Refund
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-neutral-50">
          <div className="text-xs text-neutral-500">
            {payments.length > 0 && `${payments.length} result${payments.length === 1 ? '' : 's'} on this page`}
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
        ) : payments.length === 0 ? (
          <div className="text-center text-neutral-500 py-10">No payments found.</div>
        ) : payments.map((p)=>(
          <div key={p.id} className="bg-white border rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-neutral-500">{p.created_fmt}</div>
                <div className="font-medium truncate">{p.customer_name || p.customer_email || '—'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">{formatMoney(p.amount, p.currency)}</div>
                {/* NEW: refunded line on mobile */}
                {getRefundedMinor(p) > 0 && (
                  <div className={cx('text-xs mt-0.5 inline-flex items-center gap-1',
                    isPartialRefund(p) ? 'text-amber-700' : 'text-red-700')}>
                    <MinusCircle className="h-3.5 w-3.5" />
                    Refunded {formatMoney(getRefundedMinor(p), p.currency)}
                  </div>
                )}
                <div className="mt-1"><Pill tone={toneFor(p.status)}>{p.status}</Pill></div>
              </div>
            </div>

            {p.description && (
              <div className="mt-2 text-sm text-neutral-600 line-clamp-2">{p.description}</div>
            )}

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-neutral-600">
                <CreditCard className="h-4 w-4 text-neutral-400" />
                <span className="truncate">
                  {p.pm_type}
                  {p.card_brand ? ` · ${p.card_brand} •••• ${p.last4}` : ''}
                </span>
              </div>
              <div className="text-right text-neutral-500">
                {p.net_minor != null ? <span>Net {formatMoney(p.net_minor, p.currency)}</span> : null}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={()=>openRefund(p)}
                disabled={!p.refundable || isRefundedLike(p)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                aria-label="Refund payment"
                title={isRefundedLike(p) ? 'Already refunded' : 'Refund'}
              >
                <Undo2 className="h-4 w-4" /> Refund
              </button>
            </div>
          </div>
        ))}

        {/* Pager (mobile) */}
        {payments.length > 0 && (
          <div className="flex items-center justify-between py-2">
            <button
              onClick={goPrev}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
              disabled={loading || prevStack.length===0}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
              disabled={loading || !hasMore}
            >
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
              <button className="p-2 -mr-2" aria-label="Close filters" onClick={()=>setFiltersOpen(false)}><X className="h-5 w-5"/></button>
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

      {/* Refund modal */}
      {showRefund && refundTarget && (
        <div className="fixed inset-0 z-[110] bg-black/40 flex items-end md:items-center justify-center p-4" onClick={()=>setShowRefund(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5" onClick={(e)=>e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-lg font-semibold">Refund Payment</div>
                <div className="text-xs text-neutral-500">
                  {refundTarget.id} • {formatMoney(refundTarget.amount, refundTarget.currency)}
                </div>
              </div>
              <button className="p-1 rounded hover:bg-neutral-100" onClick={()=>setShowRefund(false)} aria-label="Close refund modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="number" step="0.01" min="0" inputMode="decimal"
                    value={refundAmount} onChange={(e)=>setRefundAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Max: {formatMoney((refundTarget.amount - (getRefundedMinor(refundTarget) || refundTarget.amount_refunded || 0)), refundTarget.currency)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button className="px-3 py-2 rounded-lg border" onClick={()=>setShowRefund(false)}>Cancel</button>
                <button
                  onClick={submitRefund}
                  disabled={refundLoading}
                  className="px-3 py-2 rounded-lg bg-zinc-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {refundLoading ? 'Submitting…' : 'Submit Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120]">
          <div className={cx(
            'rounded-full px-4 py-2 text-sm shadow-lg border',
            toast.tone === 'success' && 'bg-green-50 text-green-800 border-green-200',
            toast.tone === 'danger' && 'bg-red-50 text-red-800 border-red-200',
            toast.tone === 'info' && 'bg-blue-50 text-blue-800 border-blue-200'
          )}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
