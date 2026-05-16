import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail as MailIcon, MapPin } from 'lucide-react';
import axios from 'axios';
import ResponsiveTabs from '../components/ResponsiveTabs';
import SendProofModal from '../components/SendProofModal';
import OverviewTab from './customer/OverviewTab';
import HistoryTab from './customer/HistoryTab';
import BillingTab from './customer/BillingTab';
import MessagesTab from './customer/MessagesTab';

// ── Mock data (flip USE_MOCK = true to render the in-file fixture instead of
//    hitting /api/customers/:id/workspace; banner makes the swap visible) ──
const USE_MOCK = false;

const MOCK_WORKSPACE = {
  customer: {
    id: 1,
    name: 'Sarah Mitchell',
    email: 'sarah@mitchell.com',
    phone_number: '(919) 555-0147',
    street: '412 Oakwood Dr',
    city: 'Cary',
    state: 'NC',
    zip: '27513',
    status: 'active',
  },
  attention_items: [
    { type: 'overdue_invoice', invoice_id: 234, amount_cents: 8500, days_overdue: 12 },
    { type: 'missing_payment_method' },
    { type: 'unanswered_followup', days_ago: 5 },
  ],
  upcoming_services: [
    { date: new Date(Date.now() + 2 * 86400000).toISOString(), service_type: 'Lawn Mowing', crew_name: 'Crew Alpha', time_window: '8am-12pm', status: 'confirmed' },
    { date: new Date(Date.now() + 5 * 86400000).toISOString(), service_type: 'Hedge Trimming', crew_name: 'Crew Alpha', time_window: '1pm-5pm', status: 'pending' },
    { date: new Date(Date.now() + 9 * 86400000).toISOString(), service_type: 'Lawn Mowing', crew_name: 'Crew Alpha', time_window: '8am-12pm', status: 'confirmed' },
  ],
  recent_activity: [
    { event_type: 'service_completed', description: 'Lawn Mowing completed', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { event_type: 'payment_succeeded', description: 'Payment of $85.00 received', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { event_type: 'proof_sent', description: 'Proof of service sent via email', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { event_type: 'service_completed', description: 'Lawn Mowing completed', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
    { event_type: 'payment_failed', description: 'Payment of $85.00 failed — card declined', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
    { event_type: 'customer_updated', description: 'Service frequency changed to bi-weekly', created_at: new Date(Date.now() - 14 * 86400000).toISOString() },
  ],
  lifecycle: {
    stage: 'active',
    since: '2024-06-15',
    total_services: 47,
    ltv_cents: 385000,
  },
  pending_invoices_count: 2,
  balance_cents: 18500,
  drafts: [
    {
      id: 'd1',
      type: 'payment_reminder',
      channel: 'sms',
      body: 'Hi Sarah, just a friendly reminder — you have an outstanding balance of $185.00. Reply PAID once sent, or let me know if you need to set up a plan.',
    },
    {
      id: 'd2',
      type: 'seasonal_upsell',
      channel: 'email',
      subject: 'Time for spring aeration?',
      body: "Hi Sarah,\n\nSpring is here and it's the perfect time for lawn aeration. We're offering 15% off for existing customers this month.\n\nWould you like me to add it to your next visit?\n\nBest,\nSir Walter",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

export default function CustomerWorkspace() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [workspace, setWorkspace] = useState(USE_MOCK ? MOCK_WORKSPACE : null);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState('');

  // Send proof modal state (carried from old CustomerDetail)
  const [sendProofOpen, setSendProofOpen] = useState(false);
  const [sendProofSrId, setSendProofSrId] = useState(null);

  useEffect(() => {
    if (USE_MOCK) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get(`/api/customers/${customerId}/workspace`, { withCredentials: true });
        if (alive) setWorkspace(data);
      } catch (e) {
        // Fallback: fetch basic customer data
        try {
          const { data } = await axios.get(`/api/customers/${customerId}`, { withCredentials: true });
          if (alive) setWorkspace({ customer: data?.customer || data, attention_items: [], upcoming_services: [], recent_activity: [], lifecycle: {}, pending_invoices_count: 0, balance_cents: 0, drafts: [] });
        } catch (e2) {
          if (alive) setError(e2?.response?.data?.error || 'Failed to load customer');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  const customer = workspace?.customer;

  if (loading) {
    return <div className="p-6 text-neutral-600">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  const sections = [
    {
      key: 'overview',
      label: 'Overview',
      render: () => (
        <OverviewTab
          workspace={workspace}
          onViewHistory={() => setTab('history')}
        />
      ),
    },
    {
      key: 'history',
      label: 'History',
      render: () => (
        <HistoryTab
          customerId={customerId}
          onSendProof={(srId) => { setSendProofSrId(srId); setSendProofOpen(true); }}
        />
      ),
    },
    {
      key: 'messages',
      label: 'Messages',
      render: () => (
        <MessagesTab
          customerId={customerId}
          customerName={customer?.name}
        />
      ),
    },
    {
      key: 'billing',
      label: 'Billing',
      render: () => <BillingTab workspace={workspace} />,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {USE_MOCK && (
        <div className="rounded-md border border-yellow-400 bg-yellow-100 px-4 py-3 text-sm text-yellow-900">
          <strong>[DEV MODE]</strong> Showing in-file mock customer
          (&quot;Sarah Mitchell&quot;). Backend
          <code className="mx-1">/api/customers/:id/workspace</code>
          not yet wired. Set <code>USE_MOCK = false</code> in
          <code className="mx-1">CustomerWorkspace.jsx</code> once the endpoint
          ships.
        </div>
      )}

      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/app/customers')}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Customers
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {customer?.name || `Customer #${customerId}`}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-neutral-500">
              {customer?.phone_number && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone_number}
                </span>
              )}
              {customer?.email && (
                <span className="inline-flex items-center gap-1">
                  <MailIcon className="h-3.5 w-3.5" /> {customer.email}
                </span>
              )}
              {customer?.street && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[customer.street, customer.city, customer.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
          {customer?.status && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              customer.status === 'active' ? 'bg-green-100 text-green-700' :
              customer.status === 'lead' ? 'bg-blue-100 text-blue-700' :
              customer.status === 'paused' ? 'bg-amber-100 text-amber-700' :
              'bg-neutral-100 text-neutral-600'
            }`}>
              {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ResponsiveTabs sections={sections} value={tab} onChange={setTab} />

      {/* Send proof modal */}
      <SendProofModal
        isOpen={sendProofOpen}
        onClose={() => setSendProofOpen(false)}
        serviceRecordId={sendProofSrId}
        headers={{}}
        customerContact={{
          name: customer?.name,
          email: customer?.email,
          phone: customer?.phone_number,
        }}
      />
    </div>
  );
}
