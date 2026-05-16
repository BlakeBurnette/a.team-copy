import React from 'react';

const fmtMoney = (cents) => {
  if (cents == null) return null;
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toFixed(2)}`;
};

const QuoteResult = ({ data }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
    <div className="font-semibold text-amber-800 mb-1">Quote Created</div>
    {data.customer_name && <div className="text-amber-700">Customer: {data.customer_name}</div>}
    {data.line_items?.length > 0 && (
      <div className="mt-1.5 space-y-0.5">
        {data.line_items.map((item, i) => (
          <div key={i} className="flex justify-between text-amber-700">
            <span>{item.name}</span>
            <span>{fmtMoney(item.price_cents)}</span>
          </div>
        ))}
      </div>
    )}
    {data.total_cents != null && (
      <div className="mt-1.5 pt-1 border-t border-amber-200 flex justify-between font-semibold text-amber-800">
        <span>Total</span>
        <span>{fmtMoney(data.total_cents)}</span>
      </div>
    )}
  </div>
);

const ScheduleResult = ({ data }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
    <div className="font-semibold text-blue-800 mb-1">Schedule</div>
    {data.occurrences?.length > 0 ? (
      <div className="space-y-1">
        {data.occurrences.slice(0, 5).map((occ, i) => (
          <div key={i} className="flex justify-between text-blue-700">
            <span>{occ.customer_name || occ.property || 'Job'}</span>
            <span>{occ.date} {occ.start_time || ''}</span>
          </div>
        ))}
        {data.occurrences.length > 5 && (
          <div className="text-blue-500">+{data.occurrences.length - 5} more</div>
        )}
      </div>
    ) : (
      <div className="text-blue-600">No jobs scheduled for this period.</div>
    )}
  </div>
);

const CustomerResult = ({ data }) => (
  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs">
    <div className="font-semibold text-emerald-800 mb-1">
      {data.customers ? `${data.customers.length} Customer${data.customers.length === 1 ? '' : 's'}` : 'Customer'}
    </div>
    {data.customers?.slice(0, 5).map((c, i) => (
      <div key={i} className="text-emerald-700">
        {c.name} {c.email ? `(${c.email})` : ''} {c.phone || ''}
      </div>
    ))}
  </div>
);

const OnboardingResult = ({ data }) => (
  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs">
    <div className="font-semibold text-purple-800 mb-1">Onboarding Status</div>
    <div className="space-y-1">
      {data.steps?.map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-purple-700">
          <span className={step.complete ? 'text-emerald-500' : 'text-gray-300'}>{step.complete ? '\u2713' : '\u25CB'}</span>
          <span className={step.complete ? 'line-through text-purple-400' : ''}>{step.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const GenericResult = ({ tool, data }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
    <div className="font-semibold text-gray-700 mb-1">{tool}</div>
    <pre className="text-gray-600 whitespace-pre-wrap text-[11px]">{JSON.stringify(data, null, 2)}</pre>
  </div>
);

const TOOL_RENDERERS = {
  quote_create: QuoteResult,
  quote_list: QuoteResult,
  schedule_view: ScheduleResult,
  schedule_optimize: ScheduleResult,
  customer_lookup: CustomerResult,
  customer_create: CustomerResult,
  onboarding_status: OnboardingResult,
};

export default function ToolResultCard({ tool, data }) {
  const Renderer = TOOL_RENDERERS[tool] || GenericResult;
  return <Renderer tool={tool} data={data} />;
}
