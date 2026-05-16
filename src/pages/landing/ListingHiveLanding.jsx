// src/pages/landing/ListingHiveLanding.jsx
//
// Dedicated pricing/signup page for Listing Hive.
// Buttons point at claw.thehive.fyi/p/<slug>/checkout-redirect — a server
// endpoint that 302s to the freshest Stripe checkout URL in the DB. So
// this page doesn't need any client-side fetch + there's no race where
// buttons show "Loading..." or "Coming soon". Always clickable.

import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Clock, FileText, Users, Calendar } from 'lucide-react';
import Header from '../../components/Header';
import AppFooter from '../../components/AppFooter';

const CLAW_BASE = 'https://claw.thehive.fyi';

// Brand palette per /Users/blakeburnette/repos/payhive/.designSystem.txt
const GOLD = '#FFA11E'; // Hive Orange (primary)
const GOLD_LIGHT = '#FFB73D';
const NAVY = '#2E2E2E'; // Wordmark Gray
const CREAM = '#FFF8EE';

const TIERS = [
  {
    slug: 'listings-annual-founding',
    title: 'Listing Hive · Founding Annual',
    tagline: 'Lock $399/yr — forever. Only 50 seats.',
    price: '$399',
    period: '/year',
    cta: 'Lock in Founding rate',
    features: [
      'Sir Walter AI back-office',
      'Vendor coordination + chase',
      'Deadline tracking',
      'Team seats included',
      'Locked price at every renewal',
    ],
    isFounding: true,
  },
  {
    slug: 'listings',
    title: 'Listing Hive · Monthly',
    tagline: 'Coordinate every listing without chasing paperwork',
    price: '$49.99',
    period: '/month',
    cta: 'Start monthly',
    features: [
      'Sir Walter AI back-office',
      'Vendor coordination + chase',
      'Deadline tracking',
      'Team seats included',
      'Cancel anytime',
    ],
    isFounding: false,
  },
  {
    slug: 'listings-annual',
    title: 'Listing Hive · Annual',
    tagline: 'Save 20% versus monthly.',
    price: '$479',
    period: '/year',
    cta: 'Choose annual',
    features: [
      'Sir Walter AI back-office',
      'Vendor coordination + chase',
      'Deadline tracking',
      'Team seats included',
      '20% off month-to-month',
    ],
    isFounding: false,
  },
];

export default function ListingHiveLanding() {
  const [foundingStatus, setFoundingStatus] = useState(null);

  useEffect(() => {
    document.title = 'Listing Hive — Coordinate every listing without chasing paperwork';
    const meta =
      document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute(
      'content',
      'Real-estate transaction coordination with Sir Walter (AI back-office agent). Vendor chase, deadline tracking, client updates — handled. From $49.99/mo.',
    );
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${CLAW_BASE}/p/listings-annual-founding/founding-status`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setFoundingStatus(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const foundingAvailable = foundingStatus?.available !== false;
  const foundingLabel =
    foundingStatus?.tier_label || 'Founding member · lock in this rate forever';

  const visibleTiers = TIERS.filter((t) => !(t.isFounding && !foundingAvailable));

  return (
    <div className="min-h-screen" style={{ background: '#fff', color: NAVY }}>
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div
            style={{
              position: 'absolute',
              top: -120,
              right: -80,
              width: 520,
              height: 520,
              background: `radial-gradient(closest-side, ${GOLD}33, transparent)`,
              borderRadius: '50%',
            }}
          />
        </div>
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-12 relative">
          <div className="text-center">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ background: CREAM, color: GOLD, border: `1px solid ${GOLD}44` }}
            >
              For real estate agents
            </span>
            <h1
              className="font-extrabold leading-tight mb-6"
              style={{ fontSize: 'clamp(36px, 5vw, 52px)', letterSpacing: '-0.02em' }}
            >
              Coordinate every listing without{' '}
              <span style={{ color: GOLD }}>chasing paperwork.</span>
            </h1>
            <p
              className="mx-auto text-lg md:text-xl text-slate-600 mb-8"
              style={{ maxWidth: 680 }}
            >
              Listing Hive is your real-estate back office. Sir Walter (your AI agent) chases vendors,
              drafts client updates, and keeps every deal on track — so you can keep selling.
            </p>
            {foundingAvailable && (
              <div
                className="inline-block px-4 py-3 rounded-lg font-semibold text-sm"
                style={{ background: CREAM, color: GOLD, border: `1px solid ${GOLD}` }}
              >
                ⚡ {foundingLabel} · only 50 seats
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {visibleTiers.map((t) => (
              <PricingCard key={t.slug} tier={t} gold={GOLD} goldLight={GOLD_LIGHT} />
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-8">
            Secure checkout via Stripe. Cancel monthly anytime. Annual plans lock your rate at
            renewal.
          </p>
        </div>
      </section>

      {/* Feature strip */}
      <section className="py-14 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-6 grid gap-8 md:grid-cols-4">
          <Feature
            icon={<Users style={{ color: GOLD }} className="h-6 w-6" />}
            title="Vendor chase, automated"
            body="Sir Walter nudges inspectors, lenders, appraisers on the timeline — not you at 9pm."
          />
          <Feature
            icon={<FileText style={{ color: GOLD }} className="h-6 w-6" />}
            title="Proof on every deal"
            body="Photos, timestamps, signatures — all cryptographically stamped via hive-ledger."
          />
          <Feature
            icon={<Clock style={{ color: GOLD }} className="h-6 w-6" />}
            title="Deadline brain"
            body="Inspection contingency? Financing contingency? Sir Walter warns you before they lapse."
          />
          <Feature
            icon={<Calendar style={{ color: GOLD }} className="h-6 w-6" />}
            title="Team-ready"
            body="Add your TC + assistant at no extra cost. Single Hive, everyone in sync."
          />
        </div>
      </section>

      {/* Demo CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Want a walkthrough on a real deal?</h2>
          <p className="text-slate-600 mb-6">
            30 minutes. We'll load one of your current transactions and show you Sir Walter running
            it end-to-end.
          </p>
          <a
            href={`${CLAW_BASE}/book/demo-30`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white"
            style={{ background: NAVY, textDecoration: 'none' }}
          >
            Schedule demo
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}

function PricingCard({ tier, gold, goldLight }) {
  const { slug, title, tagline, price, period, cta, features, isFounding } = tier;
  const checkoutHref = `${CLAW_BASE}/p/${slug}/checkout-redirect`;

  const cardBorder = isFounding ? `2px solid ${gold}` : '1px solid #e5e7eb';
  const cardShadow = isFounding ? `0 6px 28px ${gold}24` : '0 2px 8px rgba(0,0,0,.04)';
  const btnBg = isFounding ? gold : '#2E2E2E';
  const btnHover = isFounding ? goldLight : '#000';

  return (
    <div
      className="flex flex-col p-7 rounded-xl bg-white"
      style={{ border: cardBorder, boxShadow: cardShadow }}
    >
      {isFounding && (
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white mb-3"
          style={{ background: gold, alignSelf: 'flex-start' }}
        >
          Founding member
        </span>
      )}
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-slate-600 mb-5" style={{ minHeight: 44 }}>
        {tagline}
      </p>
      <div className="mb-6">
        <span className="text-4xl font-extrabold">{price}</span>
        <span className="text-slate-500 ml-1 text-lg">{period}</span>
      </div>
      <ul className="text-sm text-slate-600 space-y-2 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: gold }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={checkoutHref}
        className="block text-center py-3 rounded-lg font-bold text-white transition cursor-pointer"
        style={{ background: btnBg, textDecoration: 'none' }}
        onMouseOver={(e) => (e.currentTarget.style.background = btnHover)}
        onMouseOut={(e) => (e.currentTarget.style.background = btnBg)}
      >
        {cta}
      </a>
    </div>
  );
}

function Feature({ icon, title, body }) {
  return (
    <div>
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{body}</p>
    </div>
  );
}
