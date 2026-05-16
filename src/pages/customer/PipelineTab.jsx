import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

const USE_MOCK_LEADS = true;

const MOCK_INCOMING_LEADS = [
  { id: 'lh-1', name: 'Marcus Rivera', email: 'marcus@email.com', phone_number: '(919) 555-0221', city: 'Raleigh', state: 'NC', status: 'lead', source: 'listing_hive', source_detail: 'Vendor dispatch — lawn care', created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'lh-2', name: 'Jennifer Patel', email: 'jpatel@email.com', city: 'Durham', state: 'NC', status: 'lead', source: 'listing_hive', source_detail: 'Quote request — pressure washing', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'lh-3', name: 'Thomas Kim', phone_number: '(984) 555-0189', city: 'Cary', state: 'NC', status: 'lead', source: 'listing_hive', source_detail: 'Vendor dispatch — gutter cleaning', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
];

const STAGES = [
  { key: 'lead', label: 'Lead', color: 'border-blue-500', badge: 'bg-blue-100 text-blue-700' },
  { key: 'quoted', label: 'Quoted', color: 'border-purple-500', badge: 'bg-purple-100 text-purple-700' },
  { key: 'scheduled', label: 'Scheduled', color: 'border-amber-500', badge: 'bg-amber-100 text-amber-700' },
  { key: 'active', label: 'Active', color: 'border-green-500', badge: 'bg-green-100 text-green-700' },
  { key: 'paused', label: 'At Risk', color: 'border-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  { key: 'archived', label: 'Churned', color: 'border-red-500', badge: 'bg-red-100 text-red-700' },
];

export default function PipelineTab() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = fetch('/api/owner/customers')
      .then((res) => res.json())
      .then((data) => data.customers || [])
      .catch(() => []);

    // Merge incoming Listing Hive leads with existing customers
    const fetchLeads = USE_MOCK_LEADS
      ? Promise.resolve(MOCK_INCOMING_LEADS)
      : fetch('/api/owner/incoming-leads', { credentials: 'include' })
          .then((res) => res.ok ? res.json() : { leads: [] })
          .then((data) => (data.leads || []).map((l) => ({ ...l, source: 'listing_hive' })))
          .catch(() => []);

    Promise.all([fetchCustomers, fetchLeads]).then(([custs, leads]) => {
      // Deduplicate: if a lead already exists as a customer (by email), skip it
      const existingEmails = new Set(custs.map((c) => c.email).filter(Boolean));
      const newLeads = leads.filter((l) => !l.email || !existingEmails.has(l.email));
      setCustomers([...custs, ...newLeads]);
      setLoading(false);
    });
  }, []);

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, stageKey) => {
    e.preventDefault();
    if (!draggedId) return;

    const customer = customers.find((c) => c.id === draggedId);
    if (!customer || customer.status === stageKey) {
      setDraggedId(null);
      return;
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === draggedId ? { ...c, status: stageKey } : c))
    );

    fetch(`/api/owner/customers/${draggedId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: stageKey }),
    }).catch(() => {
      setCustomers((prev) =>
        prev.map((c) => (c.id === draggedId ? { ...c, status: customer.status } : c))
      );
    });

    setDraggedId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {STAGES.map((stage) => {
          const stageCustomers = customers.filter((c) => c.status === stage.key);
          return (
            <div
              key={stage.key}
              className={`w-56 flex-shrink-0 bg-white rounded-lg border border-t-4 ${stage.color} flex flex-col`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className="p-3 border-b flex items-center justify-between">
                <span className="font-semibold text-sm text-neutral-700">{stage.label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stage.badge}`}>
                  {stageCustomers.length}
                </span>
              </div>
              <div className="p-2 flex flex-col gap-2 flex-1 min-h-[120px]">
                {stageCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, customer.id)}
                    onClick={() => {
                      if (customer.source === 'listing_hive' && String(customer.id).startsWith('lh-')) return;
                      navigate(`/app/customers/${customer.id}`);
                    }}
                    className={`p-3 rounded border shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow ${
                      draggedId === customer.id ? 'opacity-50' : ''
                    } ${customer.source === 'listing_hive' ? 'border-l-2 border-l-amber-400' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-neutral-900 truncate flex-1">
                        {customer.name}
                      </p>
                      {customer.source === 'listing_hive' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 shrink-0">
                          <Zap className="h-2.5 w-2.5" />
                          Listing Hive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 truncate mt-1">
                      {customer.email || customer.phone_number || ''}
                    </p>
                    {customer.source_detail && (
                      <p className="text-xs text-amber-600 truncate mt-0.5">
                        {customer.source_detail}
                      </p>
                    )}
                    {!customer.source_detail && (customer.city || customer.state) && (
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {[customer.city, customer.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
