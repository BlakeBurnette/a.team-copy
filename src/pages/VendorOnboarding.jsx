// src/pages/VendorOnboarding.jsx
//
// Vendor onboarding — runs after a vendor pays on thepayhive.com/listings,
// clicks their magic-link email, and lands here via /auth/callback.
//
// Three steps (lightweight stub — real profile lives in payhive-api-rs once
// an endpoint exists):
//   1. Confirm name + phone + trade category
//   2. Service area (city + ZIP)
//   3. "We'll route real jobs to you" — book a walkthrough with Blake
//
// Tone is per feedback_vendor_pitch_assistance_not_fintech.md: lead with
// Sir Walter coordination + real work, NOT payout speed or fintech.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { RoleSwitcher } from '../components/shared/RoleSwitcher';
import { TRADE_CATEGORIES } from '../data/trade_categories';

const BOOK_URL = 'https://book.thehive.fyi/book/demo-30';
const STORAGE_KEY = 'vendor_onboarding:v1';

export default function VendorOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [trade, setTrade] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');

  const canAdvanceStep1 = useMemo(
    () => name.trim().length > 1 && phone.trim().length >= 7 && !!trade,
    [name, phone, trade],
  );
  const canAdvanceStep2 = useMemo(
    () => city.trim().length > 1 && /^\d{5}(-\d{4})?$/.test(zip.trim()),
    [city, zip],
  );

  const saveLocal = (data) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  };

  const submitProfile = async () => {
    setErrMsg('');
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      trade_category: trade,
      service_area: {
        city: city.trim(),
        zip: zip.trim(),
      },
      email: user?.email || null,
      user_id: user?.user_id || user?.id || null,
      organization_id: user?.organization_id || user?.org_id || null,
    };

    // Best-effort: try to POST to payhive-api-rs if a vendor profile endpoint
    // exists. If it 404s (not yet implemented), we just persist locally and
    // move on — the magic-link auth is still valid.
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${config.apiBasePath}/vendors/profile`,
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: false,
          validateStatus: (s) => s < 500, // don't throw on 4xx
        },
      );
    } catch (err) {
      // Network/5xx — log but keep going; local storage is source of truth for now
      console.warn('[VendorOnboarding] profile POST failed:', err?.message);
    }

    saveLocal({ ...payload, savedAt: Date.now() });
    setSubmitting(false);
    setStep(3);
  };

  if (step === 1) {
    return (
      <AuthShell
        title="Welcome to the Hive"
        subtitle="Real estate agents route jobs through Sir Walter — our AI coordinator. Let's get your basics so work can land in your inbox."
      >
        <div className="flex justify-end mb-3">
          <RoleSwitcher />
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (canAdvanceStep1) setStep(2); }}
        >
          <Field label="Your name">
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:border-amber-500 focus:ring-amber-500"
              placeholder="Jane Vendor"
              required
            />
          </Field>
          <Field label="Mobile phone" hint="Sir Walter uses SMS to route jobs.">
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:border-amber-500 focus:ring-amber-500"
              placeholder="(555) 555-1212"
              required
            />
          </Field>
          <Field label="What kind of work do you do?">
            <div className="grid grid-cols-2 gap-2">
              {TRADE_CATEGORIES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrade(t.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm ${
                    trade === t.id
                      ? 'border-amber-500 bg-amber-50 text-neutral-900'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-amber-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <button
            type="submit"
            disabled={!canAdvanceStep1}
            className="w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <StepHint current={1} total={3} />
        </form>
      </AuthShell>
    );
  }

  if (step === 2) {
    return (
      <AuthShell
        title="Where do you work?"
        subtitle="We match you to jobs in your service area. Start with one city — you can add more later."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (canAdvanceStep2) submitProfile(); }}
        >
          <Field label="Primary city">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:border-amber-500 focus:ring-amber-500"
              placeholder="Raleigh, NC"
              required
            />
          </Field>
          <Field label="ZIP code">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{5}(-\d{4})?"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:border-amber-500 focus:ring-amber-500"
              placeholder="27601"
              required
            />
          </Field>

          {errMsg ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errMsg}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!canAdvanceStep2 || submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Finish setup'}
            </button>
          </div>
          <StepHint current={2} total={3} />
        </form>
      </AuthShell>
    );
  }

  // step === 3
  return (
    <AuthShell
      title="You're in."
      subtitle="We'll send you jobs as agents route work through Sir Walter. No dues, no lead fees — you pay a small platform fee only when you get paid."
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-neutral-800">
          <p className="font-medium mb-1">What happens next</p>
          <ul className="list-disc list-inside space-y-1 text-neutral-700">
            <li>When an agent's job matches your trade + area, Sir Walter texts you.</li>
            <li>You confirm availability by text. Agent approves. Job goes on your schedule.</li>
            <li>We handle invoicing + payment. Payout lands in your connected account.</li>
          </ul>
        </div>

        <a
          href={BOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
        >
          Book a 30-min walkthrough
        </a>

        <button
          type="button"
          onClick={() => navigate('/app', { replace: true })}
          className="block w-full text-center px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
        >
          Go to my dashboard
        </button>
      </div>
    </AuthShell>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}

function StepHint({ current, total }) {
  return (
    <p className="text-center text-xs text-neutral-500">Step {current} of {total}</p>
  );
}
