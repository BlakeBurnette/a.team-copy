// src/pages/MarketingLanding.jsx
// v2.0 — The Jobs Treatment: Make them hate the old way, then show them the revolution
import React, { useCallback, useEffect, useReducer, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star, CreditCard, QrCode, Users, Calendar, Shield, Lock, CheckCircle2, Check, X, Zap, Camera, Clock, FileText, DollarSign, TrendingUp } from 'lucide-react';
import Logo from '../components/Logo';
import AppFooter from '../components/AppFooter';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

// === Environment ===
const API_BASE = (import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/, '') : '');

// === Helpers ===
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
function cx(...xs){ return xs.filter(Boolean).join(' '); }
function formReducer(state, { name, value, reset, patch }) {
  if (reset) return { name: '', email: '', company: '', phone: '' };
  if (patch) return { ...state, ...patch };
  return { ...state, [name]: value };
}

// === Brand Tokens (New Palette) ===
// Primary: Gold | Secondary: Navy | Accents: Green, Sky Blue, Orange, Cream
const GOLD_PRIMARY = '#FBAB2E';
const GOLD_LIGHT = '#FCC85C';
const GOLD_DARK = '#E89A1C';
const NAVY_SECONDARY = '#112D4E';
const NAVY_LIGHT = '#1A3D5C';
const GREEN_ACCENT = '#5B9A4D';
const SKY_BLUE = '#8BCDE8';
const ORANGE_ACCENT = '#E86F3A';
const CREAM_BG = '#FFFBF2';
const WHITE = '#FFFFFF';

// Derived values
const COLOR_WORDMARK = NAVY_SECONDARY;
const GOLD_GRADIENT = `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD_PRIMARY} 50%, ${GOLD_DARK})`;
const GOLD_SOFT = `linear-gradient(180deg, ${GOLD_PRIMARY}15, ${GOLD_PRIMARY}08 50%, transparent)`;
const BTN_PRIMARY = NAVY_SECONDARY;
const BTN_PRIMARY_HOVER = NAVY_LIGHT;

// === The Three Revolutions ===
const revolutions = [
  {
    icon: <Zap className="h-6 w-6" aria-hidden="true" />,
    title: 'Automatic Payment',
    subtitle: 'Job done. Paid. Done.',
    desc: 'The moment your tech marks complete, money moves. No invoice. No email. No waiting.',
  },
  {
    icon: <Camera className="h-6 w-6" aria-hidden="true" />,
    title: 'Cryptographic Proof',
    subtitle: 'Undeniable evidence.',
    desc: 'Photos, timestamps, GPS—cryptographically sealed. Disputes become impossible.',
  },
  {
    icon: <Users className="h-6 w-6" aria-hidden="true" />,
    title: 'Command Center',
    subtitle: 'Your entire operation.',
    desc: 'Crews. Schedules. Payroll. Customers. One system. Zero friction.',
  },
];

// === The Old Way (what we're killing) ===
const oldWayProblems = [
  { pain: 'Send invoice', wait: '→ Wait 3 days for them to open it' },
  { pain: 'Send reminder', wait: '→ Wait another week' },
  { pain: 'Make phone call', wait: '→ "Check\'s in the mail"' },
  { pain: 'Send to collections', wait: '→ Get 50 cents on the dollar' },
];

// === FAQ Data (for SEO and ChatGPT) ===
const faqs = [
  {
    question: 'What types of businesses is PayHive designed for?',
    answer: 'PayHive is built for field service contractors including HVAC, plumbing, electrical, lawn care, cleaning services, pest control, pool maintenance, pressure washing, roofing, and other service businesses that want to eliminate invoicing friction and get paid faster.',
  },
  {
    question: 'How does instant payment work?',
    answer: 'When your technician completes a job and captures photos, payment is automatically triggered based on your settlement rules. No invoices to send, no 30-day wait. Customers pre-authorize payment, so funds move the moment the work is verified.',
  },
  {
    question: 'What makes service records "cryptographically verified"?',
    answer: 'Every service record—including photos, timestamps, and job details—is hashed using SHA-256 and stored in a tamper-evident chain. This creates undeniable proof of what was done, when, and by whom. No more disputes. Think Bitcoin, without all the techbro.',
  },
  {
    question: 'What is Invoiceless Architecture?',
    answer: 'Invoiceless Architecture is our breakthrough approach that eliminates the entire invoice-payment cycle. Instead of work → invoice → wait → chase → payment, we use pre-authorization and verified completion to trigger instant settlement. The invoice never exists because it doesn\'t need to.',
  },
  {
    question: 'What payment methods does PayHive accept?',
    answer: 'PayHive accepts credit/debit card payments and ACH (bank transfers) via Stripe. Customers pre-authorize payments so you get paid automatically when jobs complete.',
  },
  {
    question: 'Can I manage multiple crews and track time?',
    answer: 'Yes. PayHive includes crew management, time tracking, and direct integration with Gusto for payroll. Assign jobs, track hours, and sync timecards automatically.',
  },
];

export default function MarketingLanding() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  // Refs for focusing/scroller behavior when no email yet
  const heroEmailRef = useRef(null);
  const scrollToEmail = () => {
    try {
      heroEmailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => heroEmailRef.current?.focus(), 350);
    } catch {}
  };

  // Controlled form state — starts EMPTY (no cached prefill)
  const [form, dispatch] = useReducer(
    formReducer,
    { name: '', email: '', company: '', phone: '' }
  );

  const [heroErr, setHeroErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

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

  // ========= BOOK A DEMO — collect email then open Calendly =========
  const openCalendlyPopup = useCallback((email) => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: `https://calendly.com/payhive?email=${encodeURIComponent(email)}`,
      });
    } else {
      // Fallback: open in new tab if script didn't load
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

        // Save lead (non-blocking) - capture email even if they don't complete booking
        try {
          await createLead({
            email: form.email,
            name: form.name || '',
            company: form.company || '',
            phone: form.phone || '',
            source: 'book_demo',
            origin,
            path: window.location.pathname,
          });
        } catch (eLead) {
          console.warn('[lead] failed (non-blocking):', eLead?.response?.data || eLead);
        }

        // Open Calendly popup with email pre-filled
        openCalendlyPopup(form.email);
      } catch (e2) {
        setHeroErr('Could not continue. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [form, validateEmailOnly, openCalendlyPopup]
  );

  // Plain "Log in" button — force the Log in tab + fixed callback
  const onLogin = async (e) => {
    e.preventDefault();
    navigate(user ? '/app' : '/login');
  };

  // Load Calendly popup widget script and CSS
  useEffect(() => {
    // Add Calendly CSS
    if (!document.querySelector('link[href*="calendly.com"]')) {
      const link = document.createElement('link');
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    // Add Calendly JS
    if (!document.querySelector('script[src*="calendly.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // ====== SEO LAYER (enhanced for Google & ChatGPT) ======
  useEffect(() => {
    const title = 'PayHive — Get Paid Instantly When Jobs Complete | Field Service Software';
    const desc =
      'Eliminate invoicing friction. Your technician finishes the job, captures photos, and payment happens automatically. Cryptographically verified service records for HVAC, plumbing, electrical, and field service contractors.';
    const keywords = 'instant payment capture, field service software, invoiceless payments, automatic payment, HVAC software, plumbing software, electrical contractor software, service verification, cryptographic proof, ACH payments, contractor payment software, eliminate invoicing, fast payment, service record verification';
    const url = window.location.origin;

    document.title = title;

    const ensureMeta = (name, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard meta tags
    ensureMeta('description', desc);
    ensureMeta('keywords', keywords);
    ensureMeta('author', 'PayHive');
    ensureMeta('robots', 'index, follow');

    // Open Graph meta tags
    ensureMeta('og:type', 'website', 'property');
    ensureMeta('og:title', title, 'property');
    ensureMeta('og:description', desc, 'property');
    ensureMeta('og:url', url, 'property');
    ensureMeta('og:site_name', 'PayHive', 'property');
    ensureMeta('og:image', `${url}/og-image.png`, 'property');
    ensureMeta('og:image:width', '1200', 'property');
    ensureMeta('og:image:height', '630', 'property');

    // Twitter Card meta tags
    ensureMeta('twitter:card', 'summary_large_image');
    ensureMeta('twitter:title', title);
    ensureMeta('twitter:description', desc);
    ensureMeta('twitter:image', `${url}/og-image.png`);

    // Additional SEO
    ensureMeta('canonical', url, 'rel');
  }, []);

  const jsonLd = useMemo(() => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://thepayhive.com';
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          'name': 'PayHive',
          'url': url,
          'logo': `${url}/logo.png`,
          'description': 'Instant payment capture for field service contractors. Get paid when jobs complete, not 30 days later.',
          'sameAs': [
            'https://www.linkedin.com/company/payhive',
            // Add Twitter when available: 'https://twitter.com/payhive',
          ],
        },
        {
          '@type': 'WebSite',
          'name': 'PayHive',
          'url': url,
          'potentialAction': {
            '@type': 'SearchAction',
            'target': `${url}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'WebPage',
          'name': 'Get Paid Instantly When Jobs Complete | Field Service Software',
          'url': url + (typeof window !== 'undefined' ? window.location.pathname : '/'),
          'description':
            'PayHive helps field service contractors eliminate invoicing and get paid automatically when technicians complete jobs with verified photo documentation.',
        },
        {
          '@type': 'SoftwareApplication',
          'name': 'PayHive',
          'applicationCategory': 'BusinessApplication',
          'operatingSystem': 'Web',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'USD',
            'availability': 'https://schema.org/InStock',
          },
          'featureList': 'Instant Payment Capture, Cryptographic Service Verification, Photo Documentation, ACH Payments, Card Payments, Crew Management, Job Scheduling, Gusto Payroll Integration',
          'screenshot': `${url}/mobile-hero.png`,
          // Add aggregateRating when you have real reviews - update the values below
          // 'aggregateRating': {
          //   '@type': 'AggregateRating',
          //   'ratingValue': '4.8',
          //   'ratingCount': '124',
          //   'bestRating': '5',
          //   'worstRating': '1',
          // },
        },
        {
          '@type': 'FAQPage',
          'mainEntity': faqs.map((faq) => ({
            '@type': 'Question',
            'name': faq.question,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': faq.answer,
            },
          })),
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            {
              '@type': 'ListItem',
              'position': 1,
              'name': 'Home',
              'item': url,
            },
          ],
        },
        {
          '@type': 'WebPageElement',
          'name': 'PayHive Security',
          'description': 'Enterprise-grade security including SOC 2 Type II certification in progress, NIST CSF Level 3 alignment, PCI-DSS compliance, end-to-end encryption, and 24/7 monitoring',
          'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'securityFeature', 'value': 'SOC 2 Type II Ready' },
            { '@type': 'PropertyValue', 'name': 'securityFeature', 'value': 'NIST Cybersecurity Framework Level 3' },
            { '@type': 'PropertyValue', 'name': 'securityFeature', 'value': 'PCI-DSS Compliant Payment Processing' },
            { '@type': 'PropertyValue', 'name': 'securityFeature', 'value': 'TLS 1.3 Encryption' },
            { '@type': 'PropertyValue', 'name': 'securityFeature', 'value': 'FIDO2 Passwordless Authentication' },
            { '@type': 'PropertyValue', 'name': 'securityFeature', 'value': '24/7 Security Monitoring' },
            { '@type': 'PropertyValue', 'name': 'securityFeature', 'value': 'Database-level Organization Isolation' },
            { '@type': 'PropertyValue', 'name': 'securityFeature', 'value': 'Weekly Automated Security Testing' },
          ],
        },
      ],
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Custom placeholder styling */}
      <style>{`
        input::placeholder { color: ${NAVY_SECONDARY}80 !important; }
      `}</style>

      {/* Visually hidden SEO heading */}
      <h2 className="sr-only">
        Instant Payment Capture for Field Service Contractors — eliminate invoicing, get paid when jobs complete, cryptographically verified service records
      </h2>

      {/* Inject JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="h-16 border-b flex items-center px-6 md:px-8" style={{ borderColor: `${GOLD_PRIMARY}22` }}>
        <div className="flex items-center">
          <Logo className="h-6 w-auto" />
        </div>
        <nav className="ml-6 hidden md:flex items-center gap-5 text-sm font-medium" style={{ color: NAVY_SECONDARY }}>
          <a href="#features" className="transition-colors" style={{ opacity: 0.7 }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}>Features</a>
          <a href="#value" className="transition-colors" style={{ opacity: 0.7 }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}>Value</a>
          <a href="#security" className="transition-colors" style={{ opacity: 0.7 }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}>Security</a>
          <a href="#faq" className="transition-colors" style={{ opacity: 0.7 }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}>FAQ</a>
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

      {/* HERO — The Bold Promise */}
      <section className="relative overflow-visible" style={{ backgroundColor: CREAM_BG }}>
        {/* Honeycomb pattern background */}
        <div
          className="absolute inset-0 opacity-[0.09] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23${GOLD_PRIMARY.slice(1)}' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 py-16 md:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left — Content */}
            <div className="max-w-xl">
              <h1 className="font-bold tracking-tight" style={{ color: COLOR_WORDMARK, lineHeight: 1.0 }}>
                <span className="block text-4xl md:text-5xl lg:text-6xl">We killed</span>
                <span className="block text-4xl md:text-5xl lg:text-6xl" style={{ color: GOLD_DARK }}>invoicing.</span>
              </h1>

              <p className="mt-6 text-lg md:text-xl leading-relaxed" style={{ color: NAVY_SECONDARY + 'cc' }}>
                Your technician finishes the job. Payment happens. <em style={{ color: GOLD_DARK, fontStyle: 'normal', fontWeight: 600 }}>Automatically.</em>
              </p>

              <p className="mt-3 text-base" style={{ color: NAVY_SECONDARY + '99' }}>
                No invoice to send. No email to chase. No 30-day wait. The entire billing cycle? <strong>Gone.</strong>
              </p>

              <MiniEmail
                email={form.email}
                busy={busy}
                onStart={() => startOnboarding('hero')}
                handleField={handleField}
                error={heroErr}
                inputRef={heroEmailRef}
              />

              <div className="mt-3 text-xs" style={{ color: NAVY_SECONDARY + '80' }}>
                Join the contractors who stopped chasing payments.
              </div>
            </div>

            {/* Right — Floating Phone */}
            <div className="relative flex justify-center lg:justify-end mt-8 lg:mt-0">
              {/* Glow behind phone - hidden on mobile */}
              <div
                className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[180px] opacity-[0.08]"
                style={{ backgroundColor: GOLD_PRIMARY }}
                aria-hidden
              />
              {/* Phone frame */}
              <div className="relative rounded-[2rem] md:rounded-[2.5rem] bg-white shadow-xl md:shadow-2xl p-2 md:p-3 lg:translate-x-8 lg:translate-y-4" style={{ boxShadow: '0 15px 50px -15px rgba(0,0,0,0.2)' }}>
                <div className="rounded-[1.5rem] md:rounded-[2rem] overflow-hidden w-[200px] h-[420px] md:w-[280px] md:h-[580px] lg:w-[300px] lg:h-[620px]">
                  <img
                    src="/mobile-hero.png"
                    alt="PayHive mobile app showing instant payment confirmation"
                    className="w-full h-full object-cover"
                    loading="eager"
                    fetchpriority="high"
                    width="300"
                    height="620"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ======= THE OLD WAY IS BROKEN ======= */}
      <section id="problem" className="px-6 md:px-8 py-16 md:py-20" style={{ backgroundColor: NAVY_SECONDARY }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-medium tracking-wide uppercase mb-3" style={{ color: GOLD_PRIMARY }}>The way it's always been done</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              This is how most contractors get paid.
            </h2>
          </div>

          {/* The painful cycle */}
          <div className="rounded-2xl p-6 md:p-8 border border-white/10" style={{ backgroundColor: NAVY_LIGHT }}>
            <div className="space-y-4">
              {oldWayProblems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 text-white/70">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="font-medium text-white">{item.pain}</span>
                    <span className="text-white/50">{item.wait}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-white/50 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/60">
                    <span className="text-white font-semibold">Average time to get paid: 45 days.</span> That's cash you earned, sitting in someone else's pocket.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">
              What if the invoice... <span style={{ color: GOLD_PRIMARY }}>never existed?</span>
            </p>
          </div>
        </div>
      </section>

      {/* ======= THE THREE REVOLUTIONS ======= */}
      <section id="features" className="px-6 md:px-8 py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: COLOR_WORDMARK }}>
              Three things that change everything.
            </h2>
            <p className="mt-3 text-lg text-gray-600">Not features. Revolutions.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {revolutions.map((rev, idx) => (
              <div key={rev.title} className="relative flex">
                <div className="text-7xl font-bold text-neutral-100 absolute -top-4 -left-2 select-none" aria-hidden="true">
                  {idx + 1}
                </div>
                <div className="relative rounded-2xl border-2 border-neutral-200 bg-white p-6 pt-8 hover:border-amber-400 transition-colors flex-1">
                  <div
                    className="inline-flex items-center justify-center rounded-xl w-12 h-12 text-white mb-4"
                    style={{ backgroundColor: NAVY_SECONDARY }}
                    aria-hidden="true"
                  >
                    {rev.icon}
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: COLOR_WORDMARK }}>{rev.title}</h3>
                  <p className="text-sm font-medium mt-1" style={{ color: GOLD_PRIMARY }}>{rev.subtitle}</p>
                  <p className="mt-3 text-gray-600">{rev.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= INVOICELESS ARCHITECTURE — The Reveal ======= */}
      <section id="value" className="px-6 md:px-8 py-16 md:py-24" style={{ backgroundColor: NAVY_SECONDARY }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-medium tracking-wide uppercase mb-3" style={{ color: GOLD_PRIMARY }}>The breakthrough</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              Invoiceless Architecture
            </h2>
            <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
              We didn't build faster invoicing. We removed the invoice entirely.
            </p>
          </div>

          {/* The comparison */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Old Way */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-red-400" />
                <h3 className="font-semibold text-white/60">The Old Way</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white/50">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">1</span>
                  <span>Work completed</span>
                </div>
                <div className="flex items-center gap-3 text-white/50">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">2</span>
                  <span>Generate invoice</span>
                </div>
                <div className="flex items-center gap-3 text-white/50">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">3</span>
                  <span>Send invoice</span>
                </div>
                <div className="flex items-center gap-3 text-white/50">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">4</span>
                  <span>Wait...</span>
                </div>
                <div className="flex items-center gap-3 text-white/50">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">5</span>
                  <span>Chase payment</span>
                </div>
                <div className="flex items-center gap-3 text-white/50">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">6</span>
                  <span>Maybe get paid</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-red-400 text-sm font-medium">Average: 45 days</p>
              </div>
            </div>

            {/* PayHive Way */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: NAVY_LIGHT, border: `2px solid ${GOLD_PRIMARY}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                <h3 className="font-semibold text-white">PayHive</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: GOLD_PRIMARY }}>1</span>
                  <span>Work completed + photo proof</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: GOLD_PRIMARY }}>2</span>
                  <span>Payment captured</span>
                </div>
                <div className="flex items-center gap-3 text-white/40 line-through">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">—</span>
                  <span>Invoice? What invoice?</span>
                </div>
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${GOLD_PRIMARY}66` }}>
                <p className="text-sm font-bold" style={{ color: GOLD_PRIMARY }}>Average: Instant</p>
              </div>
            </div>
          </div>

          {/* The mechanism */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 md:p-8">
            <h3 className="font-bold text-white text-xl mb-4">How it actually works:</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: NAVY_LIGHT }}>
                  <DollarSign className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                </div>
                <h4 className="font-semibold text-white mb-2">Pre-Authorization</h4>
                <p className="text-sm text-white/60">Customer authorizes payment when they book. ACH or card. The money is committed before you dispatch.</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: NAVY_LIGHT }}>
                  <Camera className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                </div>
                <h4 className="font-semibold text-white mb-2">Verified Completion</h4>
                <p className="text-sm text-white/60">Tech captures photos. System hashes everything—SHA-256, timestamped, immutable. Proof that can't be disputed.</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: NAVY_LIGHT }}>
                  <Zap className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                </div>
                <h4 className="font-semibold text-white mb-2">Atomic Settlement</h4>
                <p className="text-sm text-white/60">Verification triggers payment. One moment: work done, money moved. The billing cycle collapses to zero.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= TRANSFORMATION METRICS ======= */}
      <section className="px-6 md:px-8 py-16 md:py-20 bg-neutral-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: COLOR_WORDMARK }}>
              The numbers don't lie.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold flex items-center justify-center gap-3">
                <span style={{ color: NAVY_SECONDARY }}>45</span>
                <span style={{ color: GOLD_PRIMARY }}>→</span>
                <span style={{ color: GOLD_PRIMARY }}>0</span>
              </div>
              <p className="mt-3 text-gray-600">Days to get paid with invoicing vs. PayHive</p>
            </div>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold" style={{ color: NAVY_SECONDARY }}>100%</div>
              <div className="text-sm text-gray-500 mt-1">collection rate</div>
              <p className="mt-2 text-gray-600">Pre-authorized payments don't bounce</p>
            </div>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold" style={{ color: NAVY_SECONDARY }}>Zero</div>
              <div className="text-sm text-gray-500 mt-1">disputes</div>
              <p className="mt-2 text-gray-600">Cryptographic proof ends "he said, she said"</p>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border-2 bg-white p-6 md:p-8 text-center" style={{ borderColor: `${GOLD_PRIMARY}66` }}>
            <p className="text-lg text-gray-700">
              <span className="font-bold" style={{ color: COLOR_WORDMARK }}>The average contractor loses $50,000/year</span> to slow payments, disputes, and write-offs.
            </p>
            <p className="mt-2 text-gray-600">
              That's not a billing problem. That's a <em>broken system</em> problem. We fixed the system.
            </p>
          </div>
        </div>
      </section>

      {/* SECURITY & TRUST Section */}
      <section id="security" className="px-6 md:px-8 py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium mb-3" style={{ backgroundColor: `${GOLD_PRIMARY}20`, color: NAVY_SECONDARY }}>
              <Lock className="h-3 w-3" aria-hidden="true" /> Enterprise-Grade Security
            </div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: COLOR_WORDMARK }}>
              Bank-level security protecting your business data
            </h2>
            <p className="mt-2 text-gray-600">
              Built on the same security standards trusted by financial institutions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <SecurityFeature
              icon={<Shield className="h-5 w-5" />}
              title="SOC 2 Type II Ready"
              description="Built on SOC 2 Trust Services Criteria with certification in progress (Q2 2026)"
            />
            <SecurityFeature
              icon={<Lock className="h-5 w-5" />}
              title="NIST CSF Aligned"
              description="Level 3 maturity following the National Institute of Standards cybersecurity framework"
            />
            <SecurityFeature
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="PCI-DSS Compliant"
              description="Your payment data is processed securely—we never store credit card numbers"
            />
          </div>

          <div className="rounded-2xl border bg-neutral-50 p-6">
            <h3 className="font-semibold mb-4" style={{ color: COLOR_WORDMARK }}>
              What keeps your data safe:
            </h3>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 sm:grid-flow-col sm:grid-rows-4">
              <SecurityCheckItem text="End-to-end encryption (TLS 1.3)" />
              <SecurityCheckItem text="Passwordless authentication (FIDO2)" />
              <SecurityCheckItem text="Weekly automated security testing" />
              <SecurityCheckItem text="99.9% uptime SLA" />
              <SecurityCheckItem text="Database-level organization isolation" />
              <SecurityCheckItem text="24/7 automated security monitoring" />
              <SecurityCheckItem text="Daily backups with 30-day retention" />
              <SecurityCheckItem text="7-year audit log retention" />
            </div>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/security"
              className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
              style={{ color: GOLD_PRIMARY }}
            >
              View our full security documentation <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Competitor Positioning - No names, just truth */}
      <section className="px-6 md:px-8 py-16 md:py-20" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-medium tracking-wide uppercase mb-2" style={{ color: GOLD_DARK }}>Switching from legacy software?</p>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: COLOR_WORDMARK }}>
              We're not a better version of what you have.<br />
              <span style={{ color: GOLD_PRIMARY }}>We're what comes next.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-500">Legacy approach</span>
              </div>
              <p className="text-gray-600">"Quote, schedule, <span className="line-through">invoice</span>, and get paid."</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: GOLD_PRIMARY + '20' }}>
                    <Check className="w-4 h-4" style={{ color: GOLD_DARK }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: GOLD_DARK }}>PayHive</span>
                </div>
                <p className="mt-2 font-medium" style={{ color: COLOR_WORDMARK }}>Quote, schedule, get paid. The invoice never exists.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-500">Legacy approach</span>
              </div>
              <p className="text-gray-600">"70+ pre-built integrations"</p>
              <p className="text-sm text-gray-500 mt-1">(That you'll never use.)</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: GOLD_PRIMARY + '20' }}>
                    <Check className="w-4 h-4" style={{ color: GOLD_DARK }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: GOLD_DARK }}>PayHive</span>
                </div>
                <p className="mt-2 font-medium" style={{ color: COLOR_WORDMARK }}>Tell us what you need. We'll build it.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              They're still patching software built for the last decade.
            </p>
            <p className="mt-1 font-medium" style={{ color: COLOR_WORDMARK }}>
              We built from scratch for what's next.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section (SEO & ChatGPT optimization) */}
      <section id="faq" className="px-6 md:px-8 py-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center" style={{ color: COLOR_WORDMARK }}>
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Everything you need to know about PayHive
          </p>

          <div className="mt-8 space-y-4">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA — The Revolution */}
      <section id="get-started" className="px-6 md:px-8 py-16 md:py-24" style={{ backgroundColor: NAVY_SECONDARY }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Stop chasing payments.<br /><span style={{ color: GOLD_PRIMARY }}>Start running your business.</span>
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
            Every day you wait is another day of invoices, reminders, and awkward phone calls. There's a better way.
          </p>

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
              {busy ? 'Opening…' : <>See It In Action <ArrowRight className="h-5 w-5" style={{ display: 'inline-block', flexShrink: 0 }} /></>}
            </button>
          </form>

          <p className="mt-4 text-sm text-white/60">
            15-minute demo. No pressure. See why contractors are switching.
          </p>
        </div>
      </section>

      <AppFooter />

      {/* Global Toast */}
      <Toast show={showToast} onClose={() => setShowToast(false)} duration={3500}>
        {toastMsg}
      </Toast>
    </div>
  );
}

// ———————————————————————————————————————————————————————————————————————————
// Subcomponents

function MiniEmail({ email, busy, onStart, handleField, error, inputRef }) {
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
        {busy ? 'Opening…' : <>Book a Demo <ArrowRight className="h-4 w-4" style={{ display: 'inline-block', flexShrink: 0 }} /></>}
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
        <span className="text-2xl flex-shrink-0" style={{ color: GOLD_PRIMARY }} aria-hidden="true">
          {isOpen ? '−' : '+'}
        </span>
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
      <div
        className="inline-flex items-center justify-center rounded-lg w-12 h-12 text-white mb-3"
        style={{ backgroundColor: GOLD_PRIMARY }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-1" style={{ color: COLOR_WORDMARK }}>
        {title}
      </h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function SecurityCheckItem({ text }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: GOLD_PRIMARY }} aria-hidden="true" />
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}
