import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

// Vite: use import.meta.env.VITE_*; empty => same-origin (/api via proxy or reverse proxy)
const API_BASE = (import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/, '') : '');

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

export default function GetStartedSplash() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fieldErr, setFieldErr] = useState({});

  const createLead = async (payload) =>
    axios.post(`${API_BASE}/api/public/leads`, payload, { withCredentials: true });

  const onSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const company = (fd.get('company') || '').toString().trim();
    const phone = (fd.get('phone') || '').toString().trim();

    const v = {};
    if (!name) v.name = 'Please enter your name.';
    if (!company) v.company = 'Please enter your company.';
    if (!email) v.email = 'Please enter your email.';
    else if (!isEmail(email)) v.email = 'Enter a valid email address.';

    if (Object.keys(v).length) {
      setFieldErr(v);
      setErr('Please fix the errors below.');
      return;
    }

    try {
      setBusy(true);
      setErr('');
      await createLead({ name, email, company, phone, source: 'trial', path: window.location.pathname });

      navigate(user ? '/app' : '/login');
    } catch (e2) {
      console.error('Get started failed:', e2?.response?.data || e2);
      setErr('Could not start the trial. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const Field = ({ id, name, label, required, type = 'text', placeholder, autoComplete, error }) => (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        required={!!required}
        className={`border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-neutral-300'
        }`}
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="h-16 border-b flex items-center px-4 md:px-8">
        <div className="flex items-center gap-3">
          <Logo className="h-6 w-auto" />
        </div>
      </header>

      <main className="px-4 md:px-8 py-10 md:py-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              You’re minutes away from an easier workday
            </h1>
            <ul className="mt-4 space-y-2 text-gray-700 list-disc pl-5">
              <li>Onboard customers via QR, email, or SMS invitations.</li>
              <li>Accept payments and track invoices effortlessly.</li>
              <li>See real-time insights that help you grow.</li>
            </ul>
            <p className="mt-4 text-gray-600">
              Start your free trial—no credit card required. We’ll set up your organization during onboarding.
            </p>
          </div>

          <form onSubmit={onSubmit} className="border rounded-xl p-4 md:p-6 shadow-sm" noValidate>
            <h3 className="text-lg font-semibold">Create your account</h3>
            <p className="text-sm text-gray-600 mb-4">
              We’ll take you to the login page to finish sign-up. Your email will be prefilled.
            </p>

            {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

            <div className="grid gap-3">
              <Field
                id="trial-name"
                name="name"
                label="Your Name"
                required
                placeholder="Jane Doe"
                autoComplete="name"
                error={fieldErr.name}
              />
              <Field
                id="trial-email"
                name="email"
                label="Work Email"
                required
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                error={fieldErr.email}
              />
              <Field
                id="trial-company"
                name="company"
                label="Company"
                required
                placeholder="Acme Lawncare"
                autoComplete="organization"
                error={fieldErr.company}
              />
              <Field
                id="trial-phone"
                name="phone"
                label="Phone (optional)"
                placeholder="(555) 123-4567"
                autoComplete="tel"
                error={fieldErr.phone}
              />

              <button
                type="submit"
                disabled={busy}
                className={`px-4 py-2 rounded text-white ${
                  busy ? 'bg-gray-400' : 'bg-zinc-600 hover:bg-blue-700'
                }`}
              >
                {busy ? 'Redirecting…' : 'Get Started'}
              </button>
              <p className="text-xs text-gray-500">
                By continuing you agree to our Terms and acknowledge our Privacy Policy.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
