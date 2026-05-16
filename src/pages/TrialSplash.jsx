// src/pages/TrialSplash.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const initial = { name: '', company: '', email: '', phone: '' };

const validate = (f) => {
  const e = {};
  if (!f.name.trim()) e.name = 'Please enter your name.';
  if (!f.company.trim()) e.company = 'Please enter your company.';
  if (!f.email.trim()) e.email = 'Please enter your email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email.';
  return e;
};

export default function TrialSplash() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { user } = useAuth() || {};
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const blur = (k) => () => {
    setTouched((p) => ({ ...p, [k]: true }));
    setErrors(validate({ ...form }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    if (Object.keys(v).length) {
      setErrors(v);
      setTouched((p) => ({ ...p, name: true, company: true, email: true }));
      return;
    }
    try {
      setBusy(true);
      setMsg('');
      await axios.post('/api/public/leads', {
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        source: 'trial',
      });

      navigate(user ? '/app' : '/login');
    } catch (err) {
      console.error('Trial start failed', err?.response?.data || err);
      setMsg('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const Field = ({ id, label, type = 'text', required, value, onChange, onBlur, error, placeholder, autoComplete }) => (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-neutral-300'
        }`}
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          You’re minutes away from a cleaner, faster back-office.
        </h1>
        <p className="text-neutral-700 mb-8">Tell us about you and we’ll create your workspace.</p>

        <form className="space-y-4" onSubmit={submit} noValidate>
          <Field
            id="ts-name"
            label="Your Name"
            required
            value={form.name}
            onChange={set('name')}
            onBlur={blur('name')}
            error={touched.name && errors.name}
            placeholder="Jane Doe"
            autoComplete="name"
          />
          <Field
            id="ts-company"
            label="Company"
            required
            value={form.company}
            onChange={set('company')}
            onBlur={blur('company')}
            error={touched.company && errors.company}
            placeholder="Acme Lawncare"
            autoComplete="organization"
          />
          <Field
            id="ts-email"
            label="Work Email"
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            onBlur={blur('email')}
            error={touched.email && errors.email}
            placeholder="you@company.com"
            autoComplete="email"
          />
          <Field
            id="ts-phone"
            label="Phone (optional)"
            value={form.phone}
            onChange={set('phone')}
            onBlur={blur('phone')}
            placeholder="(555) 123-4567"
            autoComplete="tel"
          />

          {msg && <div className="text-sm text-red-600">{msg}</div>}

          <div className="pt-2">
            <button type="submit" disabled={busy} className={`px-5 py-2 rounded text-white ${busy ? 'bg-gray-400' : 'bg-zinc-600 hover:bg-blue-700'}`}>
              {busy ? 'Starting…' : 'Start Free Trial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
