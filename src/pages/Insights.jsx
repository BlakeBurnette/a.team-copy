// src/pages/Insights.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import GeoInsightsMap from './insights/GeoInsightsMap';

function formatMoney(amountMinor, currency = 'USD', locale = undefined) {
  const nf = new Intl.NumberFormat(locale || undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const divisor = 100;
  return nf.format((amountMinor || 0) / divisor);
}

function groupByCurrency(arr) {
  const map = new Map();
  for (const item of arr || []) {
    const ccy = (item.currency || 'usd').toUpperCase();
    const prev = map.get(ccy) || 0;
    map.set(ccy, prev + (item.amount || 0));
  }
  return map;
}

/** ---------- Tiny, dependency-free bar chart ---------- */
function BarChart({ data, height = 160, paddingX = 16 }) {
  // data: [{ label, value, tooltip, currency }]
  const values = data.map(d => d.value);
  const max = Math.max(1, ...values);
  const barGap = 8;
  const barWidth = 28;
  const totalWidth = paddingX * 2 + data.length * barWidth + (data.length - 1) * barGap;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={totalWidth} height={height} role="img" aria-label="Monthly earnings">
        {/* axis line */}
        <line x1="0" y1={height - 24} x2={totalWidth} y2={height - 24} stroke="currentColor" opacity="0.15" />
        {data.map((d, i) => {
          const h = Math.round(((d.value || 0) / max) * (height - 48));
          const x = paddingX + i * (barWidth + barGap);
          const y = height - 24 - h;
          return (
            <g key={d.label} transform={`translate(${x},${y})`}>
              <title>{`${d.label}: ${d.tooltip}`}</title>
              <rect
                width={barWidth}
                height={h}
                rx="6"
                className="fill-blue-500/80 hover:fill-zinc-600 transition-colors"
              />
              {/* month label */}
              <text x={barWidth / 2} y={h + 14} textAnchor="middle" fontSize="11" className="fill-neutral-500">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
/** ---------------------------------------------------- */

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [hasAccount, setHasAccount] = useState(false);
  const [accountId, setAccountId] = useState(null);
  const [available, setAvailable] = useState([]);
  const [pending, setPending] = useState([]);

  // NEW: earnings data for chart
  const [earnings, setEarnings] = useState({ buckets: [], currency: 'USD' });
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsErr, setEarningsErr] = useState('');

  const refresh = async () => {
    try {
      setLoading(true);
      setErr('');
      const { data } = await axios.get('/api/owner/stripe/balance', {
        withCredentials: true,
      });
      if (!data?.ok) throw new Error(data?.error || 'Failed to fetch balance');
      setHasAccount(!!data.hasAccount);
      setAccountId(data.accountId || null);
      setAvailable(data.available || []);
      setPending(data.pending || []);
    } catch (e) {
      console.error('[Insights] balance error:', e?.response?.data || e);
      setErr(e?.response?.data?.error || e?.message || 'Failed to load Stripe balance');
    } finally {
      setLoading(false);
    }
  };

  const refreshEarnings = async () => {
    try {
      setEarningsLoading(true);
      setEarningsErr('');
      const { data } = await axios.get('/api/owner/stripe/earnings?months=12', {
        withCredentials: true,
      });
      if (!data?.ok) throw new Error(data?.error || 'Failed to fetch earnings');
      const currency = data?.buckets?.[0]?.currency || 'USD';
      setEarnings({ buckets: data.buckets || [], currency });
    } catch (e) {
      console.error('[Insights] earnings error:', e?.response?.data || e);
      setEarningsErr(e?.response?.data?.error || e?.message || 'Failed to load earnings');
    } finally {
      setEarningsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    refreshEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableByCcy = useMemo(() => groupByCurrency(available), [available]);
  const pendingByCcy = useMemo(() => groupByCurrency(pending), [pending]);

  const currencies = useMemo(() => {
    const set = new Set([
      ...Array.from(availableByCcy.keys()),
      ...Array.from(pendingByCcy.keys()),
    ]);
    return Array.from(set.values());
  }, [availableByCcy, pendingByCcy]);

  const continueStripeOnboarding = async () => {
    try {
      const { data } = await axios.post(
        '/api/owner/stripe/start-onboarding',
        {},
        { headers: authHeader, withCredentials: true }
      );
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (e) {
      console.error('[Insights] start-onboarding error:', e?.response?.data || e);
      setErr('Could not start Stripe onboarding');
    }
  };

  // ---- Build chart series from earnings buckets
  const chartSeries = useMemo(() => {
    const fmtMonth = (ym) => {
      const [y, m] = ym.split('-').map(Number);
      const d = new Date(y, (m || 1) - 1, 1);
      return d.toLocaleString(undefined, { month: 'short' }); // "Jan"
    };
    return (earnings.buckets || []).map(b => ({
      label: fmtMonth(b.period),
      value: b.net_minor, // choose net for chart; can swap to gross_minor
      tooltip: `${formatMoney(b.net_minor, b.currency)} net (${b.count} payments)`,
      currency: b.currency,
    }));
  }, [earnings]);

  const totalNet = useMemo(
    () => (earnings.buckets || []).reduce((sum, b) => sum + (b.net_minor || 0), 0),
    [earnings]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <div className="text-sm text-neutral-600">Live Stripe Connect balance & earnings</div>
      </div>

      {/* NEW: Earnings Trends card */}
      <div className="bg-white border rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Recent Earnings (past 12 months)</div>
          <div className="text-sm text-neutral-600">
            Total Net:&nbsp;
            <span className="font-medium">
              {formatMoney(totalNet, earnings?.buckets?.[0]?.currency || 'USD')}
            </span>
          </div>
        </div>

        {earningsErr ? (
          <div className="text-red-600 text-sm mb-3">{earningsErr}</div>
        ) : earningsLoading ? (
          <div className="text-sm text-neutral-700">Loading chart…</div>
        ) : chartSeries.length === 0 ? (
          <div className="text-sm text-neutral-700">No earnings yet.</div>
        ) : (
          <BarChart data={chartSeries} />
        )}
      </div>

      {/* Existing Balance card (unchanged except wrapped in the page spacing) */}
      <div className="bg-white border rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Stripe Balance</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { refresh(); refreshEarnings(); }}
              className="text-sm px-3 py-1 border rounded hover:bg-neutral-50"
              type="button"
              disabled={loading || earningsLoading}
            >
              {(loading || earningsLoading) ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

        {!hasAccount ? (
          <div className="text-sm text-neutral-700">
            No Stripe account connected yet.
            <button
              onClick={continueStripeOnboarding}
              className="ml-2 text-zinc-600 underline"
              type="button"
            >
              Finish Stripe Onboarding
            </button>
          </div>
        ) : (
          <>
            <div className="text-xs text-neutral-500 mb-2">
              Connected Account: <span className="font-mono">{accountId}</span>
            </div>

            {currencies.length === 0 ? (
              <div className="text-sm text-neutral-700">No balance yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-2">Currency</th>
                      <th className="py-2 pr-2">Available</th>
                      <th className="py-2 pr-2">Pending</th>
                      <th className="py-2 pr-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencies.map((ccy) => {
                      const a = availableByCcy.get(ccy) || 0;
                      const p = pendingByCcy.get(ccy) || 0;
                      return (
                        <tr key={ccy} className="border-b last:border-b-0">
                          <td className="py-2 pr-2 font-medium">{ccy}</td>
                          <td className="py-2 pr-2">{formatMoney(a, ccy)}</td>
                          <td className="py-2 pr-2">{formatMoney(p, ccy)}</td>
                          <td className="py-2 pr-2">{formatMoney(a + p, ccy)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
    </div>

      <GeoInsightsMap />
    </div>
  );
}
