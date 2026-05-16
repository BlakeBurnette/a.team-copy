import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Zap,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Mail,
  MessageSquare,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import {
  createQuote,
  listOwnerQuotes,
  getQuoteFull,
  createLineItem,
  sendQuote,
} from '../../api/quotes';

// ---------- Feature flag: set to false to use live API ----------
const USE_MOCK = true;

const fmt = (cents) =>
  typeof cents === 'number'
    ? `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '$0.00';

const daysAgo = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

// ---------- Mock data (fallback) ----------
const MOCK_QUOTES = [
  {
    id: 'q1',
    lead_id: 'l3',
    lead_name: 'Robert Kim',
    services: [
      { name: 'Spring Cleanup', price_cents: 25000 },
      { name: 'Mulch Installation (10 yards)', price_cents: 20000 },
    ],
    total_cents: 45000,
    status: 'sent',
    sent_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    sent_via: 'email',
    opened: true,
    opened_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'q2',
    lead_id: 'l2',
    lead_name: 'Patricia Gomez',
    services: [
      { name: 'Tree Removal \u2014 Large Oak', price_cents: 180000 },
      { name: 'Stump Grinding', price_cents: 35000 },
    ],
    total_cents: 215000,
    status: 'draft',
    sent_at: null,
    notes: 'Pending site visit specs from Marcus',
  },
  {
    id: 'q3',
    lead_id: 'l4',
    lead_name: 'Amanda Foster',
    services: [
      { name: 'Hedge Trimming (front + sides)', price_cents: 15000 },
    ],
    total_cents: 15000,
    status: 'accepted',
    sent_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    sent_via: 'sms',
    accepted_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'q4',
    lead_id: 'l1',
    lead_name: 'David Chen',
    services: [
      { name: 'Weekly Lawn Mowing', price_cents: 8500, recurring: true, frequency: 'weekly' },
    ],
    total_cents: 8500,
    status: 'draft',
    sent_at: null,
    notes: 'Auto-generated from rate card',
  },
];

const MOCK_RATE_CARD = [
  { id: 'rc1', name: 'Weekly Lawn Mowing', price_cents: 8500, recurring: true, frequency: 'weekly' },
  { id: 'rc2', name: 'Bi-Weekly Lawn Mowing', price_cents: 6500, recurring: true, frequency: 'bi-weekly' },
  { id: 'rc3', name: 'Spring Cleanup', price_cents: 25000, recurring: false },
  { id: 'rc4', name: 'Fall Cleanup', price_cents: 25000, recurring: false },
  { id: 'rc5', name: 'Mulch Installation (per yard)', price_cents: 7500, recurring: false },
  { id: 'rc6', name: 'Hedge Trimming', price_cents: 15000, recurring: false },
  { id: 'rc7', name: 'Lawn Aeration', price_cents: 18000, recurring: false },
  { id: 'rc8', name: 'Overseeding', price_cents: 12000, recurring: false },
  { id: 'rc9', name: 'Landscape Design Consultation', price_cents: 20000, recurring: false },
];

const MOCK_LEADS = [
  { id: 'l1', name: 'David Chen' },
  { id: 'l2', name: 'Patricia Gomez' },
  { id: 'l3', name: 'Robert Kim' },
  { id: 'l4', name: 'Amanda Foster' },
  { id: 'l5', name: 'Karen Washington' },
];

// ---------- Constants ----------
const STATUS_BADGES = {
  draft: 'bg-neutral-100 text-neutral-600',
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-600',
  declined: 'bg-red-100 text-red-600',
  rejected: 'bg-red-100 text-red-600',
  changes_requested: 'bg-amber-100 text-amber-700',
};

const CHANNEL_ICON = { email: Mail, sms: MessageSquare };

// ---------- Map API status to display status ----------
function mapApiStatus(status) {
  if (status === 'pending_owner') return 'sent';
  if (status === 'changes_requested') return 'changes_requested';
  return status;
}

// ---------- Map API quote + line items to UI shape ----------
function mapQuoteToUI(quote, lineItems = [], customers = []) {
  const customer = customers.find((c) => c.id === quote.customer_id);
  const services = lineItems.map((li) => ({
    name: li.service_name,
    price_cents: li.price_cents,
    quantity: li.quantity || 1,
    tier: li.tier,
    is_selected: li.is_selected,
  }));
  const total = services.reduce((sum, s) => sum + s.price_cents * (s.quantity || 1), 0) || quote.price_cents || 0;

  return {
    id: quote.id,
    lead_id: quote.customer_id,
    lead_name: customer?.name || customer?.display_name || customer?.first_name
      ? `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim()
      : `Customer ${(quote.customer_id || '').slice(0, 8)}`,
    services,
    total_cents: total,
    status: mapApiStatus(quote.status),
    sent_at: quote.sent_at || null,
    sent_via: quote.sent_via || null,
    opened: !!quote.opened_at,
    opened_at: quote.opened_at || null,
    accepted_at: quote.accepted_at || null,
    notes: quote.notes || null,
    created_at: quote.created_at,
  };
}

// ---------- Insight derivation ----------
function deriveInsights(quotes) {
  const insights = [];

  const staleUnresponded = quotes.filter(
    (q) => q.status === 'sent' && q.sent_at && daysAgo(q.sent_at) >= 3 && !q.opened
  );
  if (staleUnresponded.length > 0) {
    insights.push({
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      text: `${staleUnresponded.length} quote${staleUnresponded.length !== 1 ? 's' : ''} sent 3+ days ago with no response \u2014 Sir Walter has follow-ups ready.`,
    });
  }

  const openedNotAccepted = quotes.filter(
    (q) => (q.status === 'sent' || q.status === 'opened') && q.opened
  );
  openedNotAccepted.forEach((q) => {
    insights.push({
      icon: Eye,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      text: `Quote to ${q.lead_name} was opened${q.opened_at ? ` ${daysAgo(q.opened_at)} day${daysAgo(q.opened_at) !== 1 ? 's' : ''} ago` : ''} but not accepted \u2014 suggest a call.`,
    });
  });

  const drafts = quotes.filter((q) => q.status === 'draft');
  if (drafts.length > 0) {
    insights.push({
      icon: FileText,
      color: 'text-neutral-600 bg-neutral-50 border-neutral-200',
      text: `${drafts.length} draft quote${drafts.length !== 1 ? 's' : ''} ready to send. Sir Walter can draft the message.`,
    });
  }

  return insights;
}

function sirWalterSuggestServices(leadName, rateCard) {
  const month = new Date().getMonth();
  const seasonal = month >= 2 && month <= 4
    ? ['rc3', 'rc7', 'rc8']
    : month >= 8 && month <= 10
      ? ['rc4', 'rc7']
      : ['rc1', 'rc6'];
  // For mock rate card, filter by id; for API rate card, suggest first 3 seasonal-ish items
  if (rateCard === MOCK_RATE_CARD) {
    return rateCard.filter((s) => seasonal.includes(s.id));
  }
  // For real rate card, suggest up to 3 services (simple heuristic)
  return rateCard.slice(0, 3);
}

function sirWalterDraftMessage(quote, channel) {
  const total = fmt(quote.total_cents);
  const serviceList = quote.services.map((s) => s.name).join(', ');
  if (channel === 'sms') {
    return `Hi ${quote.lead_name.split(' ')[0]}! This is a quick note from our team. We put together a quote for ${serviceList} at ${total}. You can review and approve it here: [link]. Let us know if you have any questions!`;
  }
  return `Hi ${quote.lead_name.split(' ')[0]},\n\nThank you for your interest in our services. We've prepared a quote for the following:\n\n${quote.services.map((s) => `\u2022 ${s.name} \u2014 ${fmt(s.price_cents)}`).join('\n')}\n\nTotal: ${total}\n\nYou can review and accept the quote at the link below. We're happy to answer any questions or adjust the scope.\n\n[Review Quote]\n\nBest regards,\nYour team`;
}

export default function QuotesTab() {
  const [quotes, setQuotes] = useState([]);
  const [rateCard, setRateCard] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [draftModal, setDraftModal] = useState(null);
  const [draftChannel, setDraftChannel] = useState('email');
  const [sending, setSending] = useState(null); // quote id currently being sent
  const [generating, setGenerating] = useState(false);

  // ---------- Fetch data on mount ----------
  const fetchData = useCallback(async () => {
    if (USE_MOCK) {
      setQuotes(MOCK_QUOTES);
      setRateCard(MOCK_RATE_CARD);
      setLeads(MOCK_LEADS);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch quotes, rate card, and customers in parallel
      const [quotesRes, servicesRes, customersRes] = await Promise.all([
        listOwnerQuotes({ status: '' }).catch(() => []),
        axios.get('/api/owner/services', { withCredentials: true }).then((r) => r.data).catch(() => []),
        axios.get('/api/owner/customers', { withCredentials: true }).then((r) => r.data).catch(() => []),
      ]);

      const rawQuotes = Array.isArray(quotesRes) ? quotesRes : quotesRes?.quotes || [];
      const customers = Array.isArray(customersRes) ? customersRes : customersRes?.customers || [];

      // Fetch full details (with line items) for each quote
      const fullQuotes = await Promise.all(
        rawQuotes.map(async (q) => {
          try {
            const full = await getQuoteFull(q.id);
            const lineItems = full?.line_items || full?.lineItems || [];
            return mapQuoteToUI(full?.quote || full, lineItems, customers);
          } catch {
            // Fallback: use the basic quote without line items
            return mapQuoteToUI(q, [], customers);
          }
        })
      );

      // Map rate card services
      const mappedRateCard = (Array.isArray(servicesRes) ? servicesRes : []).map((svc) => ({
        id: svc.id,
        name: svc.name,
        price_cents: svc.price_cents,
        description: svc.description,
        recurring: !!svc.recurring,
        frequency: svc.frequency || null,
      }));

      // Map customers to leads shape
      const mappedLeads = customers.map((c) => ({
        id: c.id,
        name: c.name || c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown',
      }));

      setQuotes(fullQuotes);
      setRateCard(mappedRateCard.length > 0 ? mappedRateCard : MOCK_RATE_CARD);
      setLeads(mappedLeads.length > 0 ? mappedLeads : MOCK_LEADS);
      setLoading(false);
    } catch (err) {
      console.error('QuotesTab: failed to load data, falling back to mock', err);
      setError('Failed to load quotes. Showing sample data.');
      setQuotes(MOCK_QUOTES);
      setRateCard(MOCK_RATE_CARD);
      setLeads(MOCK_LEADS);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const insights = useMemo(() => deriveInsights(quotes), [quotes]);

  const stats = useMemo(() => {
    const total = quotes.length;
    const accepted = quotes.filter((q) => q.status === 'accepted').length;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const avgCents = total > 0 ? Math.round(quotes.reduce((s, q) => s + q.total_cents, 0) / total) : 0;
    const needsAttention = quotes.filter(
      (q) =>
        q.status === 'draft' ||
        (q.status === 'sent' && q.sent_at && daysAgo(q.sent_at) >= 3)
    ).length;
    return { total, rate, avgCents, needsAttention };
  }, [quotes]);

  const newQuoteTotal = selectedServices.reduce((s, svc) => s + svc.price_cents, 0);

  const suggestions = useMemo(() => {
    if (!selectedLead) return [];
    const lead = leads.find((l) => l.id === selectedLead);
    return lead ? sirWalterSuggestServices(lead.name, rateCard) : [];
  }, [selectedLead, leads, rateCard]);

  const addService = (svc) => {
    if (!selectedServices.find((s) => s.id === svc.id)) {
      setSelectedServices((prev) => [...prev, svc]);
    }
  };

  const removeService = (id) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== id));
  };

  const generateQuote = async () => {
    if (!selectedLead || selectedServices.length === 0) return;
    const lead = leads.find((l) => l.id === selectedLead);

    if (USE_MOCK) {
      const newQuote = {
        id: `q${Date.now()}`,
        lead_id: selectedLead,
        lead_name: lead?.name || 'Unknown',
        services: selectedServices.map((s) => ({
          name: s.name,
          price_cents: s.price_cents,
          recurring: s.recurring,
          frequency: s.frequency,
        })),
        total_cents: newQuoteTotal,
        status: 'draft',
        sent_at: null,
      };
      setQuotes((prev) => [newQuote, ...prev]);
      setSelectedLead('');
      setSelectedServices([]);
      setNewQuoteOpen(false);
      return;
    }

    // Real API: create quote, then add line items
    setGenerating(true);
    try {
      const quotePayload = {
        customer_id: selectedLead,
        price_cents: newQuoteTotal,
        service_type_id: selectedServices[0]?.id || null,
      };
      const created = await createQuote(quotePayload);
      const quoteId = created?.id || created?.quote?.id;

      // Add line items in parallel
      await Promise.all(
        selectedServices.map((svc) =>
          createLineItem(quoteId, {
            service_name: svc.name,
            price_cents: svc.price_cents,
            quantity: 1,
          })
        )
      );

      // Add to local state
      const newQuote = {
        id: quoteId,
        lead_id: selectedLead,
        lead_name: lead?.name || 'Unknown',
        services: selectedServices.map((s) => ({
          name: s.name,
          price_cents: s.price_cents,
          recurring: s.recurring,
          frequency: s.frequency,
        })),
        total_cents: newQuoteTotal,
        status: 'draft',
        sent_at: null,
      };
      setQuotes((prev) => [newQuote, ...prev]);
      setSelectedLead('');
      setSelectedServices([]);
      setNewQuoteOpen(false);
    } catch (err) {
      console.error('QuotesTab: failed to create quote', err);
      alert('Failed to create quote. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const markSent = async (id, channel) => {
    if (USE_MOCK) {
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: 'sent', sent_at: new Date().toISOString(), sent_via: channel }
            : q
        )
      );
      return;
    }

    // Real API
    setSending(id);
    try {
      await sendQuote(id, channel);
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: 'sent', sent_at: new Date().toISOString(), sent_via: channel }
            : q
        )
      );
    } catch (err) {
      console.error('QuotesTab: failed to send quote', err);
      alert('Failed to send quote. Please try again.');
    } finally {
      setSending(null);
    }
  };

  const displayStatus = (q) => {
    if (q.status === 'sent' && q.opened) return 'opened';
    return q.status;
  };

  // ---------- Loading state ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        <span className="ml-2 text-neutral-500 text-sm">Loading quotes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Sir Walter Insight Bar */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border ${item.color}`}
            >
              <item.icon className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="text-sm">{item.text}</span>
              <Zap className="h-4 w-4 ml-auto shrink-0 text-amber-500" />
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">
            <FileText className="h-4 w-4" /> Total Quotes
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">
            <CheckCircle2 className="h-4 w-4" /> Acceptance Rate
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.rate}%</div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">
            <DollarSign className="h-4 w-4" /> Avg. Quote Value
          </div>
          <div className="text-2xl font-bold text-neutral-900">{fmt(stats.avgCents)}</div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">
            <AlertCircle className="h-4 w-4" /> Needs Attention
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.needsAttention}</div>
        </div>
      </div>

      {/* New Quote Section */}
      <div className="bg-white rounded-lg border border-neutral-200">
        <button
          onClick={() => setNewQuoteOpen(!newQuoteOpen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-neutral-900">New Quote</span>
          </div>
          {newQuoteOpen ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </button>

        {newQuoteOpen && (
          <div className="border-t border-neutral-200 p-4 space-y-4">
            {/* Lead Picker */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Lead</label>
              <select
                value={selectedLead}
                onChange={(e) => {
                  setSelectedLead(e.target.value);
                  setSelectedServices([]);
                }}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select a lead...</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sir Walter Suggestions */}
            {selectedLead && suggestions.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <span className="font-medium">Sir Walter suggests:</span>{' '}
                  {suggestions.map((s) => s.name).join(', ')} based on season and request history.
                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addService(s)}
                        disabled={selectedServices.find((ss) => ss.id === s.id)}
                        className="text-xs px-2 py-1 rounded bg-amber-200 text-amber-800 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        + {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rate Card Services */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Add Services from Rate Card
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rateCard.map((svc) => {
                  const added = !!selectedServices.find((s) => s.id === svc.id);
                  return (
                    <button
                      key={svc.id}
                      onClick={() => (added ? removeService(svc.id) : addService(svc))}
                      className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${
                        added
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="truncate">
                        {svc.name}
                        {svc.recurring && (
                          <span className="ml-1 text-xs text-neutral-400">({svc.frequency})</span>
                        )}
                      </span>
                      <span className="font-medium shrink-0 ml-2">{fmt(svc.price_cents)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Services + Total */}
            {selectedServices.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-neutral-700">Selected Services</h4>
                {selectedServices.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg text-sm"
                  >
                    <span>{svc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fmt(svc.price_cents)}</span>
                      <button
                        onClick={() => removeService(svc.id)}
                        className="text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                  <span className="font-semibold text-neutral-900">Total</span>
                  <span className="font-bold text-lg text-neutral-900">{fmt(newQuoteTotal)}</span>
                </div>
              </div>
            )}

            <button
              onClick={generateQuote}
              disabled={!selectedLead || selectedServices.length === 0 || generating}
              className="w-full py-2 px-4 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </span>
              ) : (
                'Generate Quote'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Quote List */}
      <div className="space-y-3">
        {quotes.map((q) => {
          const status = displayStatus(q);
          const badgeClass = STATUS_BADGES[status] || STATUS_BADGES.draft;
          const ChannelIcon = q.sent_via ? CHANNEL_ICON[q.sent_via] : null;
          const isSending = sending === q.id;

          return (
            <div
              key={q.id}
              className="bg-white rounded-lg border border-neutral-200 p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-neutral-900">{q.lead_name}</h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </span>
                  {ChannelIcon && (
                    <span className="flex items-center gap-1 text-xs text-neutral-400">
                      <ChannelIcon className="h-3.5 w-3.5" />
                      {q.sent_via.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold text-neutral-900">{fmt(q.total_cents)}</span>
              </div>

              {/* Service Line Items */}
              <div className="space-y-1">
                {q.services.map((svc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm text-neutral-600"
                  >
                    <span>
                      {svc.name}
                      {svc.recurring && (
                        <span className="ml-1 text-xs text-neutral-400">({svc.frequency})</span>
                      )}
                    </span>
                    <span>{fmt(svc.price_cents)}</span>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-neutral-400">
                {q.sent_at && (
                  <span>
                    Sent {daysAgo(q.sent_at)} day{daysAgo(q.sent_at) !== 1 ? 's' : ''} ago
                  </span>
                )}
                {q.opened_at && (
                  <span>
                    Opened {daysAgo(q.opened_at)} day{daysAgo(q.opened_at) !== 1 ? 's' : ''} ago
                  </span>
                )}
                {q.accepted_at && (
                  <span>
                    Accepted {daysAgo(q.accepted_at)} day{daysAgo(q.accepted_at) !== 1 ? 's' : ''}{' '}
                    ago
                  </span>
                )}
                {q.notes && <span className="italic">{q.notes}</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {q.status === 'draft' && (
                  <>
                    <button
                      onClick={() => setDraftModal(q)}
                      disabled={isSending}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Draft Message
                    </button>
                    <button
                      onClick={() => markSent(q.id, 'email')}
                      disabled={isSending}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send via Email
                    </button>
                    <button
                      onClick={() => markSent(q.id, 'sms')}
                      disabled={isSending}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                    >
                      {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                      Send via SMS
                    </button>
                  </>
                )}
                {(q.status === 'sent' || (q.status === 'sent' && q.opened)) && (
                  <button
                    onClick={() => setDraftModal(q)}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Follow Up
                  </button>
                )}
                <button className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100 transition-colors ml-auto">
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sir Walter Draft Message Modal */}
      {draftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-neutral-900">Sir Walter Draft</h3>
              </div>
              <button
                onClick={() => setDraftModal(null)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDraftChannel('email')}
                className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  draftChannel === 'email'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                }`}
              >
                <Mail className="h-4 w-4" /> Email
              </button>
              <button
                onClick={() => setDraftChannel('sms')}
                className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  draftChannel === 'sms'
                    ? 'bg-green-50 text-green-700 border-green-300'
                    : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                }`}
              >
                <MessageSquare className="h-4 w-4" /> SMS
              </button>
            </div>

            <div className="text-sm text-neutral-500">
              To: {draftModal.lead_name} &middot; {fmt(draftModal.total_cents)}
            </div>

            <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4 text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
              {sirWalterDraftMessage(draftModal, draftChannel)}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDraftModal(null)}
                className="text-sm px-4 py-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  markSent(draftModal.id, draftChannel);
                  setDraftModal(null);
                }}
                className="flex items-center gap-1 text-sm px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
              >
                <Send className="h-4 w-4" />
                Send {draftChannel === 'sms' ? 'SMS' : 'Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
