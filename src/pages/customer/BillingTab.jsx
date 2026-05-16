import React from 'react';
import { DollarSign, FileText, CreditCard } from 'lucide-react';

export default function BillingTab({ workspace }) {
  const {
    balance_cents = 0,
    pending_invoices_count = 0,
    lifecycle = {},
  } = workspace || {};

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-white border border-neutral-200">
          <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase font-semibold">
            <DollarSign className="h-4 w-4" />
            Balance Due
          </div>
          <div className={`text-2xl font-bold mt-1 ${balance_cents > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${(balance_cents / 100).toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-neutral-200">
          <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase font-semibold">
            <FileText className="h-4 w-4" />
            Pending Invoices
          </div>
          <div className="text-2xl font-bold mt-1 text-neutral-800">
            {pending_invoices_count}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-neutral-200">
          <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase font-semibold">
            <CreditCard className="h-4 w-4" />
            Lifetime Value
          </div>
          <div className="text-2xl font-bold mt-1 text-neutral-800">
            ${((lifecycle.ltv_cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <p className="text-sm text-neutral-400">
        Full invoice list and payment history coming soon.
      </p>
    </div>
  );
}
