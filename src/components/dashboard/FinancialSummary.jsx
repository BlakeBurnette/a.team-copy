// src/components/dashboard/FinancialSummary.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DollarSign, TrendingUp, Wallet, AlertCircle, Clock } from 'lucide-react';

function formatMoney(cents) {
  const num = Number(cents);
  if (cents == null || !Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num / 100);
}

/**
 * Financial summary widget for owner dashboard
 * Shows Stripe balance, revenue stats, and outstanding A/R
 */
export default function FinancialSummary({ onARClick, className = '' }) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [arSummary, setArSummary] = useState(null);

  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [balanceRes, arRes] = await Promise.all([
          axios.get('/api/owner/stripe/balance', {
            withCredentials: true,
            validateStatus: () => true,
          }).catch(() => ({ data: null })),
          axios.get('/api/accounts-receivable/summary', {
            withCredentials: true,
            validateStatus: () => true,
          }).catch(() => ({ data: null })),
        ]);

        if (!alive) return;
        setBalance(balanceRes?.data || null);
        setArSummary(arRes?.data || null);
      } catch {
        // Ignore errors
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 rounded w-1/3" />
          <div className="h-8 bg-neutral-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const hasBalance = balance?.available != null || balance?.pending != null;
  const hasAR = arSummary?.count > 0;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Available Balance */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Available Balance
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              {formatMoney(balance?.available || 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        {balance?.pending > 0 && (
          <p className="text-sm text-neutral-600 mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatMoney(balance.pending)} pending
          </p>
        )}
      </div>

      {/* Pending Payout */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Pending Payout
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              {formatMoney(balance?.pending || 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <p className="text-sm text-neutral-500 mt-2">
          Processing to your bank
        </p>
      </div>

      {/* Outstanding A/R */}
      <div
        className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
          hasAR ? 'bg-red-50 border-red-200' : 'bg-white'
        }`}
        onClick={onARClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onARClick?.()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Outstanding A/R
            </p>
            <p className={`text-2xl font-bold ${hasAR ? 'text-red-700' : 'text-neutral-900'}`}>
              {formatMoney(arSummary?.total_cents || 0)}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            hasAR ? 'bg-red-100' : 'bg-neutral-100'
          }`}>
            <AlertCircle className={`w-5 h-5 ${hasAR ? 'text-red-600' : 'text-neutral-600'}`} />
          </div>
        </div>
        {hasAR && (
          <p className="text-sm text-red-700 mt-2 font-medium">
            {arSummary.count} item{arSummary.count !== 1 ? 's' : ''} need attention →
          </p>
        )}
        {!hasAR && (
          <p className="text-sm text-emerald-600 mt-2">
            All caught up!
          </p>
        )}
      </div>
    </div>
  );
}
