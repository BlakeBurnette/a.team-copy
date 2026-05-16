import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { latLngToCell } from 'h3-js';
import { Check, ChevronDown, ChevronUp, FileText, Loader2, MessageSquare, Send, X } from 'lucide-react';
import LogoMark from '../../components/LogoMark';

// PayHive brand palette
const UI = {
  pageBg: '#F5F5F5',
  heroTop: '#FFBF47',
  heroBottom: '#FFA11E',
  textDark: '#2E2E2E',
  cardBorder: '#E5E7EB',
  btnHover: '#FFB033',
};

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};
const fmtMoney = (cents, currency = 'USD') =>
  typeof cents === 'number'
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
    : '';

const TIER_ORDER = ['good', 'better', 'best', 'standard'];
const TIER_LABELS = {
  good: 'Good',
  better: 'Better',
  best: 'Best',
  standard: 'Standard',
};
const TIER_COLORS = {
  good: 'bg-slate-50 border-slate-200',
  better: 'bg-blue-50 border-blue-300',
  best: 'bg-amber-50 border-amber-400 ring-2 ring-amber-400',
  standard: 'bg-neutral-50 border-neutral-200',
};

export default function MagicQuote() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeMessage, setChangeMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedTiers, setExpandedTiers] = useState({});

  const fetchQuote = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: result } = await axios.get(`/api/portal/quotes/magic/${encodeURIComponent(token)}`);
      setData(result);
      // Pre-select the quote's selected tier if any
      if (result?.quote?.selected_tier) {
        setSelectedTier(result.quote.selected_tier);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Link expired or invalid.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuote(); }, [token]);

  const collectGeo = () =>
    new Promise((resolve) => {
      if (!navigator?.geolocation) return resolve(null);
      let done = false;
      const timer = setTimeout(() => { if (!done) resolve(null); done = true; }, 2500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          try {
            const { latitude, longitude, accuracy } = pos.coords || {};
            if (latitude == null || longitude == null) return resolve(null);
            const h3 = latLngToCell(latitude, longitude, 9);
            resolve({ h3, lat: latitude, lng: longitude, accuracy, source: 'browser_geolocation' });
          } catch {
            resolve(null);
          }
        },
        () => { if (!done) { done = true; clearTimeout(timer); resolve(null); } },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 2500 }
      );
    });

  const handleSelectTier = async (tier) => {
    setSelectedTier(tier);
    setActionError('');
    try {
      await axios.post(`/api/portal/quotes/magic/${encodeURIComponent(token)}/select-tier`, { tier });
    } catch (e) {
      setActionError(e?.response?.data?.error || 'Failed to select tier');
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    setActionError('');
    setSuccess('');
    try {
      const geo = await collectGeo();
      await axios.post(`/api/portal/quotes/magic/${encodeURIComponent(token)}/accept`, { geo });
      setSuccess('Quote accepted! Your service will be scheduled.');
      await fetchQuote();
    } catch (e) {
      setActionError(e?.response?.data?.error || 'Failed to accept quote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    setActionError('');
    setSuccess('');
    try {
      const geo = await collectGeo();
      await axios.post(`/api/portal/quotes/magic/${encodeURIComponent(token)}/decline`, { geo });
      setSuccess('Quote declined.');
      await fetchQuote();
    } catch (e) {
      setActionError(e?.response?.data?.error || 'Failed to decline quote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChange = async () => {
    if (!changeMessage.trim()) {
      setActionError('Please enter a message describing the changes you need.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    setSuccess('');
    try {
      const geo = await collectGeo();
      await axios.post(`/api/portal/quotes/magic/${encodeURIComponent(token)}/request-change`, {
        message: changeMessage.trim(),
        geo,
      });
      setSuccess('Change request sent! The provider will update your quote.');
      setShowChangeRequest(false);
      setChangeMessage('');
      await fetchQuote();
    } catch (e) {
      setActionError(e?.response?.data?.error || 'Failed to send change request');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleTierExpand = (tier) => {
    setExpandedTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
  };

  const quote = data?.quote;
  const lineItems = data?.line_items || [];
  const tiers = data?.tiers || [];
  const isPending = data?.status === 'pending';
  const isExpired = quote?.expires_at && new Date(quote.expires_at) < new Date();

  // Sort tiers in preferred order
  const sortedTiers = [...tiers].sort((a, b) => {
    const aIdx = TIER_ORDER.indexOf(a.tier);
    const bIdx = TIER_ORDER.indexOf(b.tier);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  // If no tiers, show flat line items
  const hasMultipleTiers = sortedTiers.length > 1;

  return (
    <div className="min-h-screen w-full" style={{ background: UI.pageBg }}>
      <style>{`
        .hero-curve { border-bottom-left-radius: 28px; border-bottom-right-radius: 28px; }
        @media (min-width: 640px) { .hero-curve { border-bottom-left-radius: 35vw 8vh; border-bottom-right-radius: 35vw 8vh; } }
        @media (min-width: 1024px) { .hero-curve { border-bottom-left-radius: 50vw 12vh; border-bottom-right-radius: 50vw 12vh; } }
      `}</style>

      {/* Top hero */}
      <div
        className="w-full hero-curve"
        style={{ background: `linear-gradient(180deg, ${UI.heroTop} 0%, ${UI.heroBottom} 100%)` }}
      >
        <div className="max-w-xl mx-auto px-4 pt-8 pb-16 text-center">
          <LogoMark className="h-10 w-auto mx-auto text-[#2E2E2E]" />
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: UI.textDark }}>
            Your Quote
          </h1>
          {quote && (
            <p className="mt-2 text-sm" style={{ color: UI.textDark, opacity: 0.8 }}>
              from {quote.organization_name || 'Your service provider'}
            </p>
          )}
        </div>
      </div>

      {/* Floating content card */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 pb-10">
        <div className="rounded-2xl shadow-xl border bg-white" style={{ borderColor: UI.cardBorder }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: UI.heroBottom }} />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                {error}
              </div>
            </div>
          ) : !quote ? (
            <div className="p-6 text-center text-neutral-700">
              Quote not found or link expired.
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Greeting */}
              <div className="text-center">
                <p className="text-neutral-600">
                  {quote.customer_name && `Hi ${quote.customer_name.split(' ')[0]}, `}
                  please review and select your preferred option below.
                </p>
              </div>

              {/* Status banner */}
              {!isPending && (
                <div className={`p-4 rounded-xl text-center font-medium ${
                  quote.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                  quote.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                  quote.status === 'expired' ? 'bg-amber-50 text-amber-700' :
                  'bg-neutral-50 text-neutral-700'
                }`}>
                  {quote.status === 'accepted' && 'This quote has been accepted. Your service will be scheduled.'}
                  {quote.status === 'rejected' && 'This quote has been declined.'}
                  {quote.status === 'expired' && 'This quote has expired.'}
                  {quote.status === 'pending_owner' && 'This quote is being revised. You will receive a new link when ready.'}
                </div>
              )}

              {isExpired && isPending && (
                <div className="p-4 rounded-xl bg-amber-50 text-amber-700 text-center">
                  This quote has expired. Please contact {quote.organization_name || 'your provider'} for a new quote.
                </div>
              )}

              {/* Pricing tiers */}
              {isPending && !isExpired && (
                <div className="space-y-4">
                  {hasMultipleTiers ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {sortedTiers.map((tierData) => {
                        const isSelected = selectedTier === tierData.tier;
                        const tierLabel = tierData.tier_label || TIER_LABELS[tierData.tier] || tierData.tier;
                        return (
                          <button
                            key={tierData.tier}
                            type="button"
                            onClick={() => handleSelectTier(tierData.tier)}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected ? TIER_COLORS[tierData.tier] || TIER_COLORS.standard : 'bg-white border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            {tierData.tier === 'best' && (
                              <div className="absolute -top-2 -right-2 px-2 py-0.5 text-white text-xs font-semibold rounded-full" style={{ background: UI.heroBottom }}>
                                Recommended
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className="font-semibold text-neutral-900">{tierLabel}</div>
                              <div className="text-2xl font-bold text-neutral-900">
                                {fmtMoney(tierData.total_cents)}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {tierData.items?.length || 0} service{tierData.items?.length !== 1 ? 's' : ''}
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-1 text-sm font-medium" style={{ color: UI.heroBottom }}>
                                  <Check className="w-4 h-4" /> Selected
                                </div>
                              )}
                            </div>
                            {/* Expandable items */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleTierExpand(tierData.tier); }}
                              className="mt-2 text-xs text-neutral-500 underline flex items-center gap-1"
                            >
                              {expandedTiers[tierData.tier] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {expandedTiers[tierData.tier] ? 'Hide details' : 'Show details'}
                            </button>
                            {expandedTiers[tierData.tier] && (
                              <div className="mt-2 pt-2 border-t space-y-1">
                                {(tierData.items || []).map((item) => (
                                  <div key={item.id} className="text-xs text-neutral-600">
                                    <span className="font-medium">{item.service_name}</span>
                                    {item.description && <span className="text-neutral-500"> - {item.description}</span>}
                                    <span className="float-right">{fmtMoney(item.price_cents * (item.quantity || 1))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    // Single tier or flat line items
                    <div className="bg-white border rounded-xl p-4 space-y-3" style={{ borderColor: UI.cardBorder }}>
                      <div className="text-sm font-semibold text-neutral-900">Services Included</div>
                      <div className="space-y-2">
                        {lineItems.map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                            <div>
                              <div className="font-medium text-neutral-900">{item.service_name}</div>
                              {item.description && <div className="text-xs text-neutral-600">{item.description}</div>}
                              {item.quantity > 1 && <div className="text-xs text-neutral-500">Qty: {item.quantity}</div>}
                            </div>
                            <div className="text-sm font-semibold text-neutral-900">
                              {fmtMoney(item.price_cents * (item.quantity || 1))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t font-semibold">
                        <span>Total</span>
                        <span className="text-xl">
                          {fmtMoney(quote.line_items_total_cents || quote.price_cents)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quote details */}
                  <div className="text-xs text-neutral-500 text-center space-y-1">
                    {quote.expires_at && (
                      <div>Valid until {fmtDateTime(quote.expires_at)}</div>
                    )}
                    {quote.owner_notes && (
                      <div className="italic">Note: {quote.owner_notes}</div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {actionError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                      {actionError}
                    </div>
                  )}
                  {success && (
                    <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      {success}
                    </div>
                  )}

                  {!success && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                          type="button"
                          onClick={handleDecline}
                          disabled={actionLoading}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 disabled:opacity-60 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={handleAccept}
                          disabled={actionLoading || (hasMultipleTiers && !selectedTier)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                          style={{ background: UI.heroBottom }}
                          onMouseEnter={(e) => e.currentTarget.style.background = UI.btnHover}
                          onMouseLeave={(e) => e.currentTarget.style.background = UI.heroBottom}
                        >
                          {actionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          {hasMultipleTiers && !selectedTier ? 'Select a tier' : 'Accept Quote'}
                        </button>
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowChangeRequest(!showChangeRequest)}
                          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-800"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Need changes? Request a revision
                        </button>
                      </div>

                      {/* Change request form */}
                      {showChangeRequest && (
                        <div className="bg-neutral-50 border rounded-xl p-4 space-y-3" style={{ borderColor: UI.cardBorder }}>
                          <div className="text-sm font-medium text-neutral-900">Request Changes</div>
                          <textarea
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            rows={3}
                            placeholder="Describe the changes you need..."
                            value={changeMessage}
                            onChange={(e) => setChangeMessage(e.target.value)}
                            style={{ borderColor: UI.cardBorder }}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowChangeRequest(false)}
                              className="px-4 py-2 rounded-full text-sm text-neutral-600 hover:bg-neutral-100"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleRequestChange}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium disabled:opacity-60"
                              style={{ background: UI.textDark }}
                            >
                              <Send className="w-4 h-4" />
                              Send Request
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-neutral-500 space-y-2 pt-4 border-t" style={{ borderColor: UI.cardBorder }}>
                <div>
                  By accepting, you authorize {quote.organization_name || 'the provider'} to proceed with the quoted services.
                </div>
                <div>
                  We may record device/IP and approximate location for fraud prevention.
                </div>
                {quote.organization_phone && (
                  <div>
                    Questions? Call <a href={`tel:${quote.organization_phone}`} className="underline font-medium">{quote.organization_phone}</a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Powered by PayHive */}
        <div className="text-center mt-6 text-xs text-neutral-400">
          Powered by <span className="font-semibold">PayHive</span>
        </div>
      </div>
    </div>
  );
}
