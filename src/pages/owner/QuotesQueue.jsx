import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronRight, Clock,
  FileText, Loader2, MessageSquare, Plus, Send, Trash2, X, XCircle
} from 'lucide-react';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import { useUserProfile, useAuth } from '../../context/AuthContext.jsx';
import {
  createQuote,
  listOwnerQuotes,
  ownerApproveQuote,
  ownerRejectQuote,
  getQuoteFull,
  createLineItem,
  deleteLineItem,
  sendQuote,
} from '../../api/quotes';
import axios from 'axios';

// PayHive brand colors
const BRAND = {
  primary: '#FFA11E',      // Amber/orange
  primaryHover: '#FFB033',
  primaryLight: '#FFF7ED', // Orange-50
  primaryBorder: '#FDBA74', // Orange-300
  dark: '#2E2E2E',
};

const dollarsToCents = (val) => {
  if (val == null) return null;
  const s = String(val).replace(/[^0-9.]/g, '');
  if (!s) return 0;
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) ? n : 0;
};
const centsToUSD = (cents) =>
  typeof cents === 'number'
    ? (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '';

const TIER_LABELS = {
  good: { label: 'Good', bg: '#FFF8EB', text: '#92600A', border: '#FFDFA3' },
  better: { label: 'Better', bg: '#FFEDCC', text: '#7A4D00', border: '#FFCC66' },
  best: { label: 'Best', bg: '#FFD980', text: '#5C3D00', border: '#FFA11E' },
  standard: { label: 'Standard', bg: '#F5F5F5', text: '#525252', border: '#D4D4D4' },
};

const TierBadge = ({ tier }) => {
  const config = TIER_LABELS[tier] || TIER_LABELS.standard;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
      style={{ background: config.bg, color: config.text, borderColor: config.border }}
    >
      {config.label}
    </span>
  );
};

const normalizeList = (data) => {
  if (Array.isArray(data?.quotes)) return data.quotes;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE BUILDER MODAL
// ─────────────────────────────────────────────────────────────────────────────

function QuoteBuilderModal({ open, onClose, customers, services, onCreated, authHeader }) {
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [useTiers, setUseTiers] = useState(false);
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [createdQuote, setCreatedQuote] = useState(null);
  const [sent, setSent] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === String(customerId)),
    [customers, customerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 20);
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => {
      const name = (c.name || c.full_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    }).slice(0, 20);
  }, [customers, customerSearch]);

  const reset = () => {
    setStep(1);
    setCustomerId('');
    setCustomerSearch('');
    setLineItems([]);
    setUseTiers(false);
    setNotes('');
    setExpiresAt('');
    setCreating(false);
    setSending(false);
    setError('');
    setCreatedQuote(null);
    setSent(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const addLineItem = (tier = 'standard') => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        service_type_id: '',
        service_name: '',
        description: '',
        tier,
        price_cents: 0,
        priceDisplay: '',
        quantity: 1,
      },
    ]);
  };

  const updateLineItem = (idx, field, value) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'priceDisplay') {
        next[idx].price_cents = dollarsToCents(value);
      }
      return next;
    });
  };

  const removeLineItem = (idx) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const fillFromService = (idx, serviceId) => {
    const svc = services.find((s) => String(s.id) === String(serviceId));
    if (!svc) return;
    setLineItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        service_type_id: svc.id,
        service_name: svc.name || svc.service_name || '',
        description: svc.description || '',
        price_cents: svc.default_price_cents || svc.price_cents || 0,
        priceDisplay: svc.default_price_cents ? (svc.default_price_cents / 100).toFixed(2) : '',
      };
      return next;
    });
  };

  const tierTotals = useMemo(() => {
    const totals = { good: 0, better: 0, best: 0, standard: 0 };
    lineItems.forEach((item) => {
      const tier = item.tier || 'standard';
      const amount = (item.price_cents || 0) * (item.quantity || 1);
      if (totals[tier] !== undefined) totals[tier] += amount;
    });
    return totals;
  }, [lineItems]);

  const totalCents = useMemo(() => {
    if (useTiers) {
      // Return the "best" tier total as primary, or first non-zero
      return tierTotals.best || tierTotals.better || tierTotals.good || tierTotals.standard;
    }
    return lineItems.reduce((sum, item) => sum + (item.price_cents || 0) * (item.quantity || 1), 0);
  }, [lineItems, useTiers, tierTotals]);

  const canProceedStep1 = !!customerId;
  const canProceedStep2 = lineItems.length > 0 && lineItems.every((item) => item.service_name && item.price_cents > 0);

  const handleCreate = async () => {
    if (!canProceedStep2) return;
    setCreating(true);
    setError('');
    try {
      const headers = await authHeader();
      // Create the quote first
      const { quote } = await createQuote(
        {
          customer_id: customerId,
          price_cents: totalCents,
          pricing_mode: useTiers ? 'tiered' : 'fixed',
          owner_notes: notes || null,
          expires_at: expiresAt || null,
        },
        headers
      );

      // Add line items
      for (const item of lineItems) {
        await createLineItem(
          quote.id,
          {
            service_type_id: item.service_type_id || null,
            service_name: item.service_name,
            description: item.description || null,
            tier: useTiers ? item.tier : 'standard',
            price_cents: item.price_cents,
            quantity: item.quantity || 1,
          },
          headers
        );
      }

      // Fetch full quote with line items
      const fullQuote = await getQuoteFull(quote.id, headers);
      setCreatedQuote(fullQuote);
      setStep(3);
    } catch (e) {
      console.error('[QuoteBuilder] create failed', e?.response?.data || e);
      setError(e?.response?.data?.error || 'Failed to create quote');
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async () => {
    if (!createdQuote?.quote?.id) return;
    setSending(true);
    setError('');
    try {
      const headers = await authHeader();
      await sendQuote(createdQuote.quote.id, 'sms', headers);
      setSent(true);
      onCreated?.();
    } catch (e) {
      console.error('[QuoteBuilder] send failed', e?.response?.data || e);
      setError(e?.response?.data?.error || 'Failed to send quote');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} wide>
      <div className="min-h-[500px]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3 w-3/4 mx-auto pt-4">
            {[1, 2, 3].map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    s < step
                      ? 'text-white'
                      : s === step
                        ? 'text-white'
                        : 'bg-neutral-200 text-neutral-500'
                  }`}
                  style={s < step ? { background: BRAND.primary } : s === step ? { background: BRAND.dark } : {}}
                >
                  {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                {i < 2 && (
                  <div
                    className="flex-1 h-0.5"
                    style={{ background: s < step ? BRAND.primary : '#E5E7EB' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Create Quote</h2>
          <p className="text-sm text-neutral-600">
            {step === 1 && 'Select a customer'}
            {step === 2 && 'Add services and pricing'}
            {step === 3 && (sent ? 'Quote sent!' : 'Review and send')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Select Customer */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Search customers
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Search by name, email, or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>

            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-neutral-500 text-sm">
                  No customers found
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCustomerId(String(c.id))}
                    className={`w-full text-left px-4 py-3 hover:bg-neutral-50 flex items-center justify-between ${
                      String(c.id) === customerId ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-neutral-900">
                        {c.name || c.full_name || `Customer #${c.id}`}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {[c.email, c.phone].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    {String(c.id) === customerId && (
                      <Check className="w-5 h-5" style={{ color: BRAND.primary }} />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
                style={{ background: BRAND.primary, color: '#111' }}
                onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryHover}
                onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Add Line Items */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Customer badge */}
            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-medium">
                  {(selectedCustomer.name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-neutral-900">
                    {selectedCustomer.name || selectedCustomer.full_name}
                  </div>
                  <div className="text-sm text-neutral-500">{selectedCustomer.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ml-auto text-sm text-neutral-600 hover:text-neutral-800"
                >
                  Change
                </button>
              </div>
            )}

            {/* Tier toggle */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div>
                <div className="font-medium text-neutral-900 text-sm">Good / Better / Best pricing</div>
                <div className="text-xs text-neutral-500">Offer multiple pricing tiers</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUseTiers(!useTiers);
                  if (!useTiers && lineItems.length === 0) {
                    // Add starter items for each tier
                    setLineItems([
                      { id: 'temp-good', service_name: '', tier: 'good', price_cents: 0, priceDisplay: '', quantity: 1 },
                      { id: 'temp-better', service_name: '', tier: 'better', price_cents: 0, priceDisplay: '', quantity: 1 },
                      { id: 'temp-best', service_name: '', tier: 'best', price_cents: 0, priceDisplay: '', quantity: 1 },
                    ]);
                  }
                }}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: useTiers ? BRAND.primary : '#D1D5DB' }}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    useTiers ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-neutral-700">Line Items</div>
                {useTiers ? (
                  <div className="flex items-center gap-1">
                    {['good', 'better', 'best'].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => addLineItem(tier)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-neutral-50"
                      >
                        <Plus className="w-3 h-3" /> {TIER_LABELS[tier].label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addLineItem('standard')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-neutral-50"
                  >
                    <Plus className="w-3 h-3" /> Add item
                  </button>
                )}
              </div>

              {lineItems.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileText className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <div className="text-sm text-neutral-600">No items yet</div>
                  <button
                    type="button"
                    onClick={() => addLineItem(useTiers ? 'good' : 'standard')}
                    className="mt-2 text-sm font-medium"
                    style={{ color: BRAND.primary }}
                  >
                    Add your first item
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {lineItems.map((item, idx) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        {useTiers && <TierBadge tier={item.tier} />}
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <select
                              className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                              value={item.service_type_id || ''}
                              onChange={(e) => {
                                updateLineItem(idx, 'service_type_id', e.target.value);
                                fillFromService(idx, e.target.value);
                              }}
                            >
                              <option value="">Select service...</option>
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name || s.service_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="text"
                              className="w-full border rounded px-2 py-1.5 text-sm"
                              placeholder="Service name"
                              value={item.service_name}
                              onChange={(e) => updateLineItem(idx, 'service_name', e.target.value)}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-1 text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          className="col-span-2 border rounded px-2 py-1.5 text-sm"
                          placeholder="Description (optional)"
                          value={item.description || ''}
                          onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                          <input
                            type="text"
                            className="w-full border rounded pl-6 pr-2 py-1.5 text-sm text-right"
                            placeholder="0.00"
                            value={item.priceDisplay}
                            onChange={(e) => updateLineItem(idx, 'priceDisplay', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            {lineItems.length > 0 && (
              <div className="border-t pt-3">
                {useTiers ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {['good', 'better', 'best'].map((tier) => (
                      <div
                        key={tier}
                        className="p-2 rounded-lg"
                        style={{ background: TIER_LABELS[tier].bg, color: TIER_LABELS[tier].text }}
                      >
                        <div className="text-xs font-medium opacity-70">{TIER_LABELS[tier].label}</div>
                        <div className="text-lg font-bold">{centsToUSD(tierTotals[tier])}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-700">Total</span>
                    <span className="text-xl font-bold text-neutral-900">{centsToUSD(totalCents)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes & expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notes for customer (optional)
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Any special notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Valid until (optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-neutral-600 hover:text-neutral-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canProceedStep2 || creating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
                style={{ background: BRAND.primary, color: '#111' }}
                onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryHover}
                onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creating ? 'Creating...' : 'Create Quote'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Send */}
        {step === 3 && createdQuote && (
          <div className="space-y-4">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: BRAND.primaryLight }}>
                  <Check className="w-8 h-8" style={{ color: BRAND.primary }} />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">Quote Sent!</h3>
                <p className="text-neutral-600 mb-6">
                  {selectedCustomer?.name || 'The customer'} will receive an SMS with a link to view and accept the quote.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 rounded-full text-sm font-semibold transition-colors"
                  style={{ background: BRAND.primary, color: '#111' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Quote preview */}
                <div className="border rounded-xl p-4 space-y-3 bg-gradient-to-b from-neutral-50 to-white">
                  <div className="text-center border-b pb-3">
                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Quote for</div>
                    <div className="text-lg font-bold text-neutral-900">
                      {selectedCustomer?.name || selectedCustomer?.full_name}
                    </div>
                    {selectedCustomer?.phone && (
                      <div className="text-sm text-neutral-600">{selectedCustomer.phone}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(createdQuote.line_items || []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {useTiers && <TierBadge tier={item.tier} />}
                          <span className="text-neutral-800">{item.service_name}</span>
                        </div>
                        <span className="font-medium">{centsToUSD(item.price_cents)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-medium text-neutral-700">
                      {useTiers ? 'Starting at' : 'Total'}
                    </span>
                    <span className="text-2xl font-bold text-neutral-900">
                      {centsToUSD(createdQuote.quote?.line_items_total_cents || createdQuote.quote?.price_cents)}
                    </span>
                  </div>

                  {notes && (
                    <div className="pt-2 text-sm text-neutral-600 italic">
                      Note: {notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Send className="w-5 h-5 text-blue-600" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-900">Ready to send</div>
                    <div className="text-blue-700">
                      {selectedCustomer?.phone
                        ? `We'll send an SMS to ${selectedCustomer.phone}`
                        : 'Customer will receive a link to view this quote'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-sm text-neutral-600 hover:text-neutral-800"
                  >
                    Save as draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
                    style={{ background: BRAND.primary, color: '#111' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? 'Sending...' : 'Send Quote'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function QuotesQueue() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { isOwner, loadingProfile } = useUserProfile() || {};

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const [actingId, setActingId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);

  const [tab, setTab] = useState('pending_owner');
  const [expandedQuote, setExpandedQuote] = useState(null);

  const authHeader = async () => ({});

  const notify = (msg, duration = 2400) => setToast({ show: true, msg, duration });
  const closeToast = () => setToast((t) => ({ ...t, show: false }));

  const loadQuotes = async (status = tab) => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeader();
      const data = await listOwnerQuotes({ status }, headers);
      setQuotes(normalizeList(data));
    } catch (e) {
      console.error('[QuotesQueue] load failed', e?.response?.data || e);
      setError(e?.response?.data?.error || 'Failed to load quotes');
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get('/api/owner/customers', {
        headers,
        withCredentials: true,
      });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.customers)
          ? data.customers
          : Array.isArray(data?.rows)
            ? data.rows
            : [];
      setCustomers(list);
    } catch (e) {
      console.error('[QuotesQueue] customers fetch failed', e?.response?.data || e);
      setCustomers([]);
    }
  };

  const loadServices = async () => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get('/api/owner/services', { headers, withCredentials: true });
      setServices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[QuotesQueue] services fetch failed', e?.response?.data || e);
      setServices([]);
    }
  };

  useEffect(() => {
    if (loadingProfile) return;
    if (!isOwner) return;
    loadQuotes();
    loadCustomers();
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, loadingProfile]);

  useEffect(() => {
    if (!isOwner) return;
    loadQuotes(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const approve = async (quote) => {
    if (!quote?.id) return;
    setActingId(quote.id);
    try {
      const headers = await authHeader();
      await ownerApproveQuote(quote.id, headers);
      notify('Quote approved');
      setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
    } catch (e) {
      console.error('[QuotesQueue] approve failed', e?.response?.data || e);
      setError(e?.response?.data?.error || 'Unable to approve quote');
    } finally {
      setActingId(null);
    }
  };

  const openReject = (quote) => {
    setRejecting(quote);
    setRejectReason('');
    setRejectError('');
  };

  const submitReject = async () => {
    if (!rejecting?.id) return;
    setActingId(rejecting.id);
    setRejectError('');
    try {
      const headers = await authHeader();
      await ownerRejectQuote(rejecting.id, rejectReason?.trim() || undefined, headers);
      notify('Quote rejected');
      setQuotes((prev) => prev.filter((q) => q.id !== rejecting.id));
      setRejecting(null);
    } catch (e) {
      console.error('[QuotesQueue] reject failed', e?.response?.data || e);
      setRejectError(e?.response?.data?.error || 'Unable to reject quote');
    } finally {
      setActingId(null);
    }
  };

  const handleSendQuote = async (quote) => {
    if (!quote?.id) return;
    setActingId(quote.id);
    try {
      const headers = await authHeader();
      await sendQuote(quote.id, 'sms', headers);
      notify('Quote sent to customer');
      loadQuotes();
    } catch (e) {
      console.error('[QuotesQueue] send failed', e?.response?.data || e);
      setError(e?.response?.data?.error || 'Unable to send quote');
    } finally {
      setActingId(null);
    }
  };

  const expireText = (dt) => {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return String(dt);
    }
  };

  const loadingGuard = loadingProfile || (loading && quotes.length === 0);
  if (!isOwner && !loadingProfile) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white border border-red-200 text-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-semibold">Access restricted</div>
            <div className="text-sm">Only owners can manage quotes.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-5">
      <Toast show={toast.show} duration={toast.duration} onClose={closeToast}>
        {toast.msg}
      </Toast>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Quotes</h1>
          <p className="text-sm text-neutral-600">Create and manage customer quotes</p>
        </div>
        <button
          type="button"
          onClick={() => setShowBuilder(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
          style={{ background: BRAND.primary, color: '#111' }}
          onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryHover}
          onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}
        >
          <Plus className="w-4 h-4" />
          Create Quote
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
        {[
          { key: 'pending_owner', label: 'Needs Review' },
          { key: 'pending_customer', label: 'Sent' },
          { key: 'accepted', label: 'Accepted' },
          { key: 'rejected', label: 'Declined' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quotes list */}
      <div className="bg-white border rounded-xl shadow-sm">
        {loadingGuard ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-400 mb-2" />
            <div className="text-sm text-neutral-600">Loading quotes...</div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-700 bg-red-50 rounded-lg m-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <div className="text-neutral-600 mb-1">No quotes</div>
            <div className="text-sm text-neutral-500">
              {tab === 'pending_owner' && 'No quotes awaiting your review'}
              {tab === 'pending_customer' && 'No quotes waiting for customer response'}
              {tab === 'accepted' && 'No accepted quotes yet'}
              {tab === 'rejected' && 'No declined quotes'}
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {quotes.map((q) => {
              const customer = q.customer || q.customer_info || { name: q.customer_name };
              const priceCents = q.line_items_total_cents || q.price_cents || q.total_cents || 0;
              const created = q.created_at || q.inserted_at;
              const expires = q.expires_at;
              const expired = expires ? new Date(expires) < new Date() : false;
              const isExpanded = expandedQuote === q.id;
              const disableActions = expired || actingId === q.id;
              const hasSent = q.sent_at;
              const hasChangeRequest = q.change_request_count > 0;

              return (
                <div key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-neutral-900">
                          {customer?.name || customer?.full_name || 'Customer'}
                        </span>
                        {hasChangeRequest && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">
                            <MessageSquare className="w-3 h-3" /> Change requested
                          </span>
                        )}
                        {expired && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {q.service_name || q.service_type_name || 'Service quote'}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Created {expireText(created)}
                        {hasSent && ` • Sent ${expireText(q.sent_at)}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold text-neutral-900">{centsToUSD(priceCents)}</div>
                      {expires && !expired && (
                        <div className="text-xs text-neutral-500">
                          Expires {expireText(expires)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions based on status */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {tab === 'pending_owner' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openReject(q)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-sm hover:bg-rose-100 disabled:opacity-60"
                          disabled={disableActions}
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => approve(q)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium disabled:opacity-60 transition-colors"
                          style={{ background: BRAND.primary, color: '#111' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryHover}
                          onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}
                          disabled={disableActions}
                        >
                          {actingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Approve & Send
                        </button>
                      </>
                    )}
                    {tab === 'pending_customer' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSendQuote(q)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm hover:bg-blue-100 disabled:opacity-60"
                          disabled={disableActions}
                        >
                          {actingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Resend
                        </button>
                        <span className="text-xs text-neutral-500 ml-2">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Waiting for customer
                        </span>
                      </>
                    )}
                    {tab === 'accepted' && (
                      <span className="inline-flex items-center gap-1 text-sm" style={{ color: BRAND.primary }}>
                        <CheckCircle2 className="w-4 h-4" /> Customer accepted
                      </span>
                    )}
                    {tab === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" /> Customer declined
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quote Builder Modal */}
      <QuoteBuilderModal
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        customers={customers}
        services={services}
        authHeader={authHeader}
        onCreated={() => {
          loadQuotes();
          notify('Quote created and sent');
        }}
      />

      {/* Reject Modal */}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)}>
        <div className="space-y-4">
          <div className="text-lg font-semibold">Reject quote</div>
          <div className="text-sm text-neutral-700">
            Provide an optional reason. The customer will be notified.
          </div>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            rows="3"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          {rejectError ? <div className="text-sm text-red-600">{rejectError}</div> : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(null)}
              className="px-3 py-2 rounded border text-sm bg-white hover:bg-neutral-50"
              disabled={actingId === rejecting?.id}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReject}
              className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              disabled={actingId === rejecting?.id}
            >
              {actingId === rejecting?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject quote
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
