// src/components/AudienceLanding.jsx
// Shared layout for audience-specific landing pages (PM, REA, HOA, Vendors).
// Keeps the Gold/Navy/Honeycomb theme from MarketingLanding while accepting
// audience-specific copy via props.

import React, { useCallback, useEffect, useReducer, useRef, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight, Check, X, Shield, Lock, CheckCircle2,
} from 'lucide-react';
import Logo from './Logo';
import AppFooter from './AppFooter';
import Toast from './Toast';
import { useAuth } from '../context/AuthContext';
import { captureTrackingParams, getTrackingData } from '../lib/tracking';

// === Environment ===
const API_BASE = (import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/, '') : '');

// === Brand Tokens (same as MarketingLanding) ===
const GOLD_PRIMARY = '#FBAB2E';
const GOLD_LIGHT = '#FCC85C';
const GOLD_DARK = '#E89A1C';
const NAVY_SECONDARY = '#112D4E';
const NAVY_LIGHT = '#1A3D5C';
const CREAM_BG = '#FFFBF2';
const COLOR_WORDMARK = NAVY_SECONDARY;
const BTN_PRIMARY = NAVY_SECONDARY;
const BTN_PRIMARY_HOVER = NAVY_LIGHT;

// === Helpers ===
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
function cx(...xs) { return xs.filter(Boolean).join(' '); }
function formReducer(state, { name, value, reset, patch }) {
  if (reset) return { name: '', email: '', company: '', phone: '' };
  if (patch) return { ...state, ...patch };
  return { ...state, [name]: value };
}

/**
 * AudienceLanding — reusable landing page for each audience type.
 *
 * Props:
 *   audience        — 'property-managers' | 'real-estate' | 'hoa' | 'vendors'
 *   seoTitle        — page <title>
 *   seoDescription  — meta description
 *   heroTag         — small uppercase tag above headline (e.g., "For Property Managers")
 *   heroHeadline    — main headline (string or JSX)
 *   heroSubheadline — supporting paragraph
 *   heroSubtext     — smaller text below subheadline
 *   painTag         — small tag above pain section
 *   painHeadline    — pain section headline
 *   painPoints      — [{ pain: string, detail: string }]
 *   painSummary     — text below pain points
 *   features        — [{ icon: JSX, title: string, subtitle: string, desc: string }]
 *   featuresHeadline — headline above features
 *   featuresSubtext  — text below features headline
 *   comparison      — { oldTitle, oldSteps: string[], newTitle, newSteps: string[], oldMetric, newMetric }
 *   comparisonTag   — small tag above comparison
 *   comparisonHeadline — comparison section headline
 *   stats           — [{ value: string, label: string, detail: string }]
 *   statsHeadline   — headline above stats
 *   statsCta        — { text: string, subtext: string } — callout box in stats section
 *   faqs            — [{ question: string, answer: string }]
 *   ctaHeadline     — CTA section headline (string or JSX)
 *   ctaSubtext      — CTA supporting text
 *   ctaButtonText   — label on CTA button (default: "Book a Demo")
 *   ctaFootnote     — text below CTA form
 */
export default function AudienceLanding({
  audience,
  seoTitle,
  seoDescription,
  heroTag,
  heroHeadline,
  heroSubheadline,
  heroSubtext,
  painTag,
  painHeadline,
  painPoints = [],
  painSummary,
  features = [],
  featuresHeadline,
  featuresSubtext,
  comparison,
  comparisonTag,
  comparisonHeadline,
  stats = [],
  statsHeadline,
  statsCta,
  faqs = [],
  ctaHeadline,
  ctaSubtext,
  ctaButtonText = 'Book a Demo',
  ctaFootnote,
}) {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const heroEmailRef = useRef(null);

  const scrollToEmail = () => {
    try {
      heroEmailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => heroEmailRef.current?.focus(), 350);
    } catch {}
  };

  const [form, dispatch] = useReducer(formReducer, { name: '', email: '', company: '', phone: '' });
  const [heroErr, setHeroErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Capture UTM + ref params on mount
  useEffect(() => { captureTrackingParams(); }, []);

  const createLead = (payload) =>
    axios.post(`${API_BASE}/api/public/leads`, payload, { withCredentials: true });

  const validateEmailOnly = useCallback((email) => {
    if (!email) return 'Please enter your email.';
    if (!isEmail(email)) return 'Enter a valid email address.';
    return '';
  }, []);

  const handleField = useCallback((e) => {
    const { name, value } = e.target;
    dispatch({ name, value });
  }, []);

  const openCalendlyPopup = useCallback((email) => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: `https://calendly.com/payhive?email=${encodeURIComponent(email)}`,
      });
    } else {
      window.open(`https://calendly.com/payhive?email=${encodeURIComponent(email)}`, '_blank');
    }
  }, []);

  const startOnboarding = useCallback(
    async (origin = 'hero') => {
      const emailMsg = validateEmailOnly(form.email);
      if (emailMsg) {
        setHeroErr(emailMsg);
        if (origin !== 'hero') scrollToEmail();
        return;
      }
      try {
        setBusy(true);
        setHeroErr('');
        const tracking = getTrackingData();
        try {
          await createLead({
            email: form.email,
            name: form.name || '',
            company: form.company || '',
            phone: form.phone || '',
            source: 'book_demo',
            origin,
            audience,
            path: window.location.pathname,
            ...tracking,
          });
        } catch (eLead) {
          console.warn('[lead] failed (non-blocking):', eLead?.response?.data || eLead);
        }
        openCalendlyPopup(form.email);
      } catch {
        setHeroErr('Could not continue. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [form, validateEmailOnly, openCalendlyPopup, audience]
  );

  const onLogin = (e) => {
    e.preventDefault();
    navigate(user ? '/app' : '/login');
  };

  // Calendly widget
  useEffect(() => {
    if (!document.querySelector('link[href*="calendly.com"]')) {
      const link = document.createElement('link');
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="calendly.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // SEO
  useEffect(() => {
    if (seoTitle) document.title = seoTitle;
    const ensureMeta = (name, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    if (seoDescription) ensureMeta('description', seoDescription);
    ensureMeta('robots', 'index, follow');
    ensureMeta('og:title', seoTitle || '', 'property');
    ensureMeta('og:description', seoDescription || '', 'property');
    ensureMeta('og:url', window.location.href, 'property');
  }, [seoTitle, seoDescription]);

  return (
    <div className="min-h-screen bg-white">
      <style>{`input::placeholder { color: ${NAVY_SECONDARY}80 !important; }`}</style>

      {/* Header */}
      <header className="h-16 border-b flex items-center px-6 md:px-8" style={{ borderColor: `${GOLD_PRIMARY}22` }}>
        <Link to="/" className="flex items-center">
          <Logo className="h-6 w-auto" />
        </Link>
        <nav className="ml-6 hidden md:flex items-center gap-5 text-sm font-medium" style={{ color: NAVY_SECONDARY }}>
          <Link to="/property-managers" className="transition-opacity opacity-70 hover:opacity-100">Property Managers</Link>
          <Link to="/real-estate" className="transition-opacity opacity-70 hover:opacity-100">Real Estate Agents</Link>
          <Link to="/hoa" className="transition-opacity opacity-70 hover:opacity-100">HOA Boards</Link>
          <Link to="/vendors" className="transition-opacity opacity-70 hover:opacity-100">Vendors</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onLogin}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: NAVY_SECONDARY, backgroundColor: `${GOLD_PRIMARY}20` }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${GOLD_PRIMARY}40`}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${GOLD_PRIMARY}20`}
          >
            Log in
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-visible" style={{ backgroundColor: CREAM_BG }}>
        <div
          className="absolute inset-0 opacity-[0.09] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23${GOLD_PRIMARY.slice(1)}' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-6 md:px-10 py-16 md:py-24 lg:py-28">
          <div className="max-w-2xl">
            {heroTag && (
              <p className="text-sm font-medium tracking-wide uppercase mb-4" style={{ color: GOLD_DARK }}>
                {heroTag}
              </p>
            )}
            <h1 className="font-bold tracking-tight text-4xl md:text-5xl lg:text-6xl" style={{ color: COLOR_WORDMARK, lineHeight: 1.05 }}>
              {heroHeadline}
            </h1>
            <p className="mt-6 text-lg md:text-xl leading-relaxed" style={{ color: NAVY_SECONDARY + 'cc' }}>
              {heroSubheadline}
            </p>
            {heroSubtext && (
              <p className="mt-3 text-base" style={{ color: NAVY_SECONDARY + '99' }}>
                {heroSubtext}
              </p>
            )}
            <MiniEmail
              email={form.email}
              busy={busy}
              onStart={() => startOnboarding('hero')}
              handleField={handleField}
              error={heroErr}
              inputRef={heroEmailRef}
              buttonText={ctaButtonText}
            />
          </div>
        </div>
      </section>

      {/* PAIN SECTION */}
      {painPoints.length > 0 && (
        <section className="px-6 md:px-8 py-16 md:py-20" style={{ backgroundColor: NAVY_SECONDARY }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              {painTag && (
                <p className="text-sm font-medium tracking-wide uppercase mb-3" style={{ color: GOLD_PRIMARY }}>{painTag}</p>
              )}
              <h2 className="text-3xl md:text-4xl font-bold text-white">{painHeadline}</h2>
            </div>

            <div className="rounded-2xl p-6 md:p-8 border border-white/10" style={{ backgroundColor: NAVY_LIGHT }}>
              <div className="space-y-4">
                {painPoints.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 text-white/70">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <X className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="font-medium text-white">{item.pain}</span>
                      <span className="text-white/50">{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {painSummary && (
              <div className="mt-10 text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">{painSummary}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FEATURES */}
      {features.length > 0 && (
        <section className="px-6 md:px-8 py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: COLOR_WORDMARK }}>
                {featuresHeadline}
              </h2>
              {featuresSubtext && <p className="mt-3 text-lg text-gray-600">{featuresSubtext}</p>}
            </div>

            <div className={cx(
              "grid gap-8 items-stretch",
              features.length === 3 ? "md:grid-cols-3" : features.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2"
            )}>
              {features.map((feat, idx) => (
                <div key={feat.title} className="relative flex">
                  <div className="text-7xl font-bold text-neutral-100 absolute -top-4 -left-2 select-none" aria-hidden="true">
                    {idx + 1}
                  </div>
                  <div className="relative rounded-2xl border-2 border-neutral-200 bg-white p-6 pt-8 hover:border-amber-400 transition-colors flex-1">
                    <div
                      className="inline-flex items-center justify-center rounded-xl w-12 h-12 text-white mb-4"
                      style={{ backgroundColor: NAVY_SECONDARY }}
                      aria-hidden="true"
                    >
                      {feat.icon}
                    </div>
                    <h3 className="text-xl font-bold" style={{ color: COLOR_WORDMARK }}>{feat.title}</h3>
                    {feat.subtitle && <p className="text-sm font-medium mt-1" style={{ color: GOLD_PRIMARY }}>{feat.subtitle}</p>}
                    <p className="mt-3 text-gray-600">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* COMPARISON (old way vs PayHive) */}
      {comparison && (
        <section className="px-6 md:px-8 py-16 md:py-24" style={{ backgroundColor: NAVY_SECONDARY }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              {comparisonTag && (
                <p className="text-sm font-medium tracking-wide uppercase mb-3" style={{ color: GOLD_PRIMARY }}>{comparisonTag}</p>
              )}
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">{comparisonHeadline}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Old Way */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <X className="h-5 w-5 text-red-400" />
                  <h3 className="font-semibold text-white/60">{comparison.oldTitle}</h3>
                </div>
                <div className="space-y-3">
                  {comparison.oldSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-white/50">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                {comparison.oldMetric && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-red-400 text-sm font-medium">{comparison.oldMetric}</p>
                  </div>
                )}
              </div>

              {/* PayHive Way */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: NAVY_LIGHT, border: `2px solid ${GOLD_PRIMARY}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                  <h3 className="font-semibold text-white">{comparison.newTitle}</h3>
                </div>
                <div className="space-y-3">
                  {comparison.newSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-white">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: GOLD_PRIMARY }}>{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                {comparison.newMetric && (
                  <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${GOLD_PRIMARY}66` }}>
                    <p className="text-sm font-bold" style={{ color: GOLD_PRIMARY }}>{comparison.newMetric}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STATS */}
      {stats.length > 0 && (
        <section className="px-6 md:px-8 py-16 md:py-20 bg-neutral-50">
          <div className="max-w-5xl mx-auto">
            {statsHeadline && (
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold" style={{ color: COLOR_WORDMARK }}>{statsHeadline}</h2>
              </div>
            )}

            <div className={cx("grid gap-8", stats.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-5xl md:text-6xl font-bold" style={{ color: NAVY_SECONDARY }}>{stat.value}</div>
                  {stat.label && <div className="text-sm text-gray-500 mt-1">{stat.label}</div>}
                  <p className="mt-2 text-gray-600">{stat.detail}</p>
                </div>
              ))}
            </div>

            {statsCta && (
              <div className="mt-12 rounded-2xl border-2 bg-white p-6 md:p-8 text-center" style={{ borderColor: `${GOLD_PRIMARY}66` }}>
                <p className="text-lg text-gray-700 font-bold" style={{ color: COLOR_WORDMARK }}>{statsCta.text}</p>
                {statsCta.subtext && <p className="mt-2 text-gray-600">{statsCta.subtext}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SECURITY (shared across all audiences) */}
      <section className="px-6 md:px-8 py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium mb-3" style={{ backgroundColor: `${GOLD_PRIMARY}20`, color: NAVY_SECONDARY }}>
              <Lock className="h-3 w-3" aria-hidden="true" /> Enterprise-Grade Security
            </div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: COLOR_WORDMARK }}>
              Bank-level security protecting your data
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <SecurityFeature icon={<Shield className="h-5 w-5" />} title="SOC 2 Type II Ready" description="Built on SOC 2 Trust Services Criteria with certification in progress" />
            <SecurityFeature icon={<Lock className="h-5 w-5" />} title="NIST CSF Aligned" description="Level 3 maturity following the NIST cybersecurity framework" />
            <SecurityFeature icon={<CheckCircle2 className="h-5 w-5" />} title="PCI-DSS Compliant" description="Payment data processed securely — we never store card numbers" />
          </div>

          <div className="rounded-2xl border bg-neutral-50 p-6">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 sm:grid-flow-col sm:grid-rows-4">
              {[
                'End-to-end encryption (TLS 1.3)',
                'Passwordless authentication (FIDO2)',
                'Database-level organization isolation',
                '99.9% uptime SLA',
                'Daily backups with 30-day retention',
                '24/7 automated security monitoring',
                '7-year audit log retention',
                'Weekly automated security testing',
              ].map((text) => (
                <div key={text} className="flex items-start gap-2">
                  <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: GOLD_PRIMARY }} aria-hidden="true" />
                  <span className="text-sm text-gray-700">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="px-6 md:px-8 py-12 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center" style={{ color: COLOR_WORDMARK }}>
              Frequently Asked Questions
            </h2>
            <div className="mt-8 space-y-4">
              {faqs.map((faq, idx) => (
                <FAQItem key={idx} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 md:px-8 py-16 md:py-24" style={{ backgroundColor: NAVY_SECONDARY }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">{ctaHeadline}</h2>
          {ctaSubtext && <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">{ctaSubtext}</p>}

          <form
            onSubmit={(e) => { e.preventDefault(); startOnboarding('cta'); }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <input
              name="email"
              type="email"
              placeholder="you@company.com"
              aria-label="Work email"
              value={form.email}
              onInput={handleField}
              onChange={handleField}
              className="w-full sm:w-80 rounded-lg border-2 border-white/20 bg-white px-4 py-3 text-base focus:outline-none focus:border-white shadow-lg"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none rounded-lg px-6 py-3 text-base font-semibold shadow-lg transition-all"
              style={{ backgroundColor: busy ? '#9CA3AF' : GOLD_PRIMARY, color: NAVY_SECONDARY }}
              onMouseEnter={(e) => { if (!busy) e.currentTarget.style.backgroundColor = GOLD_LIGHT; }}
              onMouseLeave={(e) => { if (!busy) e.currentTarget.style.backgroundColor = GOLD_PRIMARY; }}
            >
              {busy ? 'Opening...' : <>{ctaButtonText} <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>

          {ctaFootnote && <p className="mt-4 text-sm text-white/60">{ctaFootnote}</p>}
        </div>
      </section>

      <AppFooter />
      <Toast show={showToast} onClose={() => setShowToast(false)} duration={3500}>{toastMsg}</Toast>
    </div>
  );
}

// === Sub-components ===

function MiniEmail({ email, busy, onStart, handleField, error, inputRef, buttonText = 'Book a Demo' }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onStart(); }} className="mt-6 flex flex-col sm:flex-row gap-2 w-full">
      <div className="w-full sm:w-72">
        <input
          ref={inputRef}
          name="email"
          type="email"
          placeholder="you@company.com"
          aria-label="Work email"
          value={email}
          onInput={handleField}
          onChange={handleField}
          className="w-full rounded-lg border px-4 py-2 focus:outline-none bg-white/95"
          style={{ borderColor: NAVY_SECONDARY + '40', color: NAVY_SECONDARY }}
          onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${NAVY_SECONDARY}`}
          onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
          autoComplete="email"
        />
        {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : null}
      </div>
      <button
        type="submit"
        disabled={busy}
        className={cx(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none rounded-lg px-4 py-2 text-white transition-colors",
          busy ? "bg-gray-400" : ""
        )}
        style={{ backgroundColor: busy ? undefined : BTN_PRIMARY }}
        onMouseEnter={(e) => { if (!busy) e.currentTarget.style.backgroundColor = BTN_PRIMARY_HOVER; }}
        onMouseLeave={(e) => { if (!busy) e.currentTarget.style.backgroundColor = BTN_PRIMARY; }}
      >
        {busy ? 'Opening...' : <>{buttonText} <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: `${GOLD_PRIMARY}33` }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-5 py-4 transition-colors flex items-center justify-between gap-4"
        style={{ backgroundColor: `${GOLD_PRIMARY}10` }}
        aria-expanded={isOpen}
      >
        <h3 className="font-semibold" style={{ color: NAVY_SECONDARY }}>{question}</h3>
        <span className="text-2xl flex-shrink-0" style={{ color: GOLD_PRIMARY }} aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-5 py-4 bg-white">
          <p className="text-gray-700">{answer}</p>
        </div>
      )}
    </div>
  );
}

function SecurityFeature({ icon, title, description }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center rounded-lg w-12 h-12 text-white mb-3" style={{ backgroundColor: GOLD_PRIMARY }} aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-semibold mb-1" style={{ color: COLOR_WORDMARK }}>{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
