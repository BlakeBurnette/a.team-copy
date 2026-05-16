// src/components/history/HistoryList.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Dropdown from '../Dropdown';
import { PaymentStatePill } from '../../pages/schedule/components/PaymentPills';

const EVENT_OPTIONS = [
  'service_completed',
  'payment_attempted',
  'payment_succeeded',
  'payment_failed',
  'proof_sent',
  'customer_created',
  'customer_updated',
  'crew_member_added',
  'crew_member_removed',
  'checklist_service_type_defaults_updated',
  'service_type_created',
  'service_type_updated',
  'service_type_status_changed',
];

const labelForEvent = (t) => {
  const map = {
    service_completed: 'Service completed',
    payment_attempted: 'Payment attempted',
    payment_succeeded: 'Payment succeeded',
    payment_failed: 'Payment failed',
    proof_sent: 'Proof sent',
    customer_created: 'Customer created',
    customer_updated: 'Customer updated',
    crew_member_added: 'Crew member added',
    crew_member_removed: 'Crew member removed',
    checklist_service_type_defaults_updated: 'Checklist defaults updated',
    service_type_created: 'Service type created',
    service_type_updated: 'Service type updated',
    service_type_status_changed: 'Service type status changed',
  };
  return map[t] || t;
};

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

export default function HistoryList({
  scope = 'org',
  customerId,
  propertyId,
  serviceRecordId,
  initialFilters = {},
  headers,
  onSendProof,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const buildInitialFilters = () => ({
    date_from: initialFilters.date_from || '',
    date_to: initialFilters.date_to || '',
    event_types: [...(initialFilters.event_types || [])],
    customer_id: initialFilters.customer_id || '',
    property_id: initialFilters.property_id || '',
    crew_id: initialFilters.crew_id || '',
  });
  const [filters, setFilters] = useState(buildInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState(buildInitialFilters);

  const endpoint = useMemo(() => {
    if (scope === 'customer') return `/api/customers/${customerId}/history`;
    if (scope === 'property') return `/api/properties/${propertyId}/history`;
    if (scope === 'service_record') return `/api/service-records/${serviceRecordId}/history`;
    return '/api/history';
  }, [scope, customerId, propertyId, serviceRecordId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (appliedFilters.date_from) params.date_from = appliedFilters.date_from;
      if (appliedFilters.date_to) params.date_to = appliedFilters.date_to;
      if (appliedFilters.event_types?.length) params.event_types = appliedFilters.event_types;
      if (scope === 'org') {
        const customerId = (appliedFilters.customer_id || '').trim();
        const propertyId = (appliedFilters.property_id || '').trim();
        const crewId = (appliedFilters.crew_id || '').trim();
        if (customerId && customerId !== 'cust_123') params.customer_id = customerId;
        if (propertyId && propertyId !== 'prop_123') params.property_id = propertyId;
        if (crewId) params.crew_id = crewId;
      }
      const { data } = await axios.get(endpoint, { params, withCredentials: true, headers });
      const list = Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];
      setItems(list);
      setHasMore(Boolean(data?.hasMore ?? data?.has_more));
    } catch (e) {
      setItems([]);
      setHasMore(false);
      setError(e?.response?.data?.error || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, endpoint, headers, page, pageSize, scope]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      ...filters,
      event_types: [...(filters.event_types || [])],
    });
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-lg p-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="text-xs text-neutral-600">From</label>
            <input
              type="date"
              className="w-full border rounded-lg px-2 py-1 text-sm"
              value={filters.date_from}
              onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-600">To</label>
            <input
              type="date"
              className="w-full border rounded-lg px-2 py-1 text-sm"
              value={filters.date_to}
              onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
            />
          </div>
          {scope === 'org' && (
            <>
              <div>
                <label className="text-xs text-neutral-600">Customer ID</label>
                <input
                  className="w-full border rounded-lg px-2 py-1 text-sm"
                  value={filters.customer_id}
                  onChange={(e) => setFilters((p) => ({ ...p, customer_id: e.target.value }))}
                  placeholder="cust_123"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-600">Property ID</label>
                <input
                  className="w-full border rounded-lg px-2 py-1 text-sm"
                  value={filters.property_id}
                  onChange={(e) => setFilters((p) => ({ ...p, property_id: e.target.value }))}
                  placeholder="prop_123"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dropdown
            label="Event types"
            options={EVENT_OPTIONS.map((o) => ({ label: labelForEvent(o), value: o }))}
            value={filters.event_types}
            multiple
            onChange={(vals) => setFilters((p) => ({
              ...p,
              event_types: Array.isArray(vals) ? vals : [],
            }))}
            renderButton={(props) => (
              <button
                {...props}
                className={`${props.className || ''} px-3 py-2 border rounded-lg text-sm bg-white`.trim()}
              >
                Filter events ({filters.event_types.length})
              </button>
            )}
            renderOption={(opt, { isSelected }) => (
              <div className="flex items-center gap-2 text-sm w-full">
                <input type="checkbox" checked={isSelected} readOnly />
                {opt.label}
              </div>
            )}
          />
          <button
            type="button"
            onClick={applyFilters}
            className="px-3 py-2 rounded-lg bg-black text-white text-sm"
          >
            Apply filters
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b text-sm font-semibold text-neutral-800">History</div>
        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full divide-y">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Event</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Subject</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-3 py-3 text-sm text-neutral-600" colSpan={5}>Loading…</td></tr>
              ) : error ? (
                <tr><td className="px-3 py-3 text-sm text-red-600" colSpan={5}>{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="px-3 py-3 text-sm text-neutral-600" colSpan={5}>No history yet.</td></tr>
              ) : (
                items.map((ev) => {
                  const paymentStatus =
                    ev.service_record_payment_state || ev.invoice_status || ev.metadata?.payment_status;
                  const amountCents = ev.metadata?.amount_cents;
                  const isAdmin = ev.category === 'admin';
                  const descParts = [];
                  if (ev.property_label) descParts.push(ev.property_label);
                  if (amountCents != null) descParts.push(`$${(amountCents / 100).toFixed(2)}`);
                  const desc = isAdmin
                    ? (ev.description || '—')
                    : (descParts.length ? descParts.join(' • ') : (ev.description || '—'));
                  const subject = isAdmin
                    ? (ev.subject || ev.service_type_name || ev.customer_name || ev.property_label || ev.user_name || '—')
                    : (ev.customer_name || ev.property_label || ev.user_name || ev.service_type_name || ev.subject || '—');
                  return (
                    <tr key={ev.id}>
                      <td className="px-3 py-2 text-sm text-neutral-700">{fmtDateTime(ev.occurred_at)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-neutral-800 flex items-center gap-2">
                        <span>{labelForEvent(ev.event_type)}</span>
                        {isAdmin && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700">
                            Admin
                          </span>
                        )}
                        {paymentStatus && <PaymentStatePill invStatus={paymentStatus} pending={false} />}
                      </td>
                      <td className="px-3 py-2 text-sm text-neutral-700">
                        {subject}
                      </td>
                      <td className="px-3 py-2 text-sm text-neutral-700">{desc || '—'}</td>
                      <td className="px-3 py-2 text-sm text-neutral-700 space-x-2">
                        {ev.service_record_id && (
                          <>
                            <a href={`/service-records/${ev.service_record_id}`} className="text-emerald-700 hover:underline">Service record</a>
                            {onSendProof && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation?.(); onSendProof(ev.service_record_id); }}
                                className="text-emerald-700 hover:underline"
                              >
                                Send proof
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y">
          {loading ? (
            <div className="px-3 py-3 text-sm text-neutral-600">Loading…</div>
          ) : error ? (
            <div className="px-3 py-3 text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-3 text-sm text-neutral-600">No history yet.</div>
          ) : (
            items.map((ev) => {
              const paymentStatus =
                ev.service_record_payment_state || ev.invoice_status || ev.metadata?.payment_status;
              const amountCents = ev.metadata?.amount_cents;
              const isAdmin = ev.category === 'admin';
              const descParts = [];
              if (ev.property_label) descParts.push(ev.property_label);
              if (amountCents != null) descParts.push(`$${(amountCents / 100).toFixed(2)}`);
              const desc = isAdmin
                ? (ev.description || '—')
                : (descParts.length ? descParts.join(' • ') : (ev.description || '—'));
              const subject = isAdmin
                ? (ev.subject || ev.service_type_name || ev.customer_name || ev.property_label || ev.user_name || '—')
                : (ev.customer_name || ev.property_label || ev.user_name || ev.service_type_name || ev.subject || '—');

              return (
                <div key={ev.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-neutral-500">{fmtDateTime(ev.occurred_at)}</div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                        <span>{labelForEvent(ev.event_type)}</span>
                        {isAdmin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-700 uppercase tracking-wide">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                    {paymentStatus && <PaymentStatePill invStatus={paymentStatus} pending={false} />}
                  </div>

                  <div className="text-sm text-neutral-800">{subject}</div>
                  <div className="text-sm text-neutral-600">{desc || '—'}</div>

                  {ev.service_record_id && (
                    <div className="pt-1 flex items-center gap-3">
                      <a
                        href={`/service-records/${ev.service_record_id}`}
                        className="text-emerald-700 hover:underline text-sm font-medium"
                      >
                        Service record
                      </a>
                      {onSendProof && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation?.(); onSendProof(ev.service_record_id); }}
                          className="text-emerald-700 hover:underline text-sm font-medium"
                        >
                          Send proof
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="px-3 py-2 border-t flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border bg-white text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-600">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border bg-white text-sm disabled:opacity-50"
            disabled={!hasMore}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
