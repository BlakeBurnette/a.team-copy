import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, Shield, BarChart3, Users } from 'lucide-react';
import Logo from '../components/Logo';

const Feature = ({ icon, title, children }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <p className="text-neutral-600">{children}</p>
  </div>
);

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-auto" />
          <span className="sr-only">Product</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/get-demo" className="text-sm text-neutral-700 hover:text-neutral-900">Request a demo</Link>
          <Link to="/start-trial" className="text-sm text-neutral-700 hover:text-neutral-900">Start free</Link>
          <Link to="/app" className="text-sm text-neutral-700 hover:text-neutral-900">Sign in</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <Sparkles className="h-4 w-4" /> Instant payment capture
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">
              Get paid instantly when the job is done
            </h1>
            <p className="mt-4 text-lg text-neutral-700">
              Your technician finishes the job, captures photos, and payment happens automatically. No invoices. No chasing customers. No 30-day wait.
            </p>
            <ul className="mt-6 space-y-2 text-neutral-700">
              {[
                'Automatic payment when jobs complete',
                'Cryptographically verified service records',
                'No invoices to send or chase',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="h-5 w-5 mt-[2px] text-green-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/start-trial"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-600 text-white hover:bg-blue-700"
              >
                Start free trial <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/get-demo"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50"
              >
                Get a demo
              </Link>
            </div>

            <p className="mt-3 text-xs text-neutral-500">No credit card required.</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            {/* lightweight faux-dashboard preview */}
            <img
              src="https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1200&auto=format&fit=crop"
              alt="Product preview"
              className="rounded-xl object-cover w-full h-[320px]"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature icon={<BarChart3 className="h-6 w-6 text-zinc-600" />} title="Eliminate invoicing">
            Payment triggers automatically when jobs complete. No invoices to create, send, or chase.
          </Feature>
          <Feature icon={<Shield className="h-6 w-6 text-zinc-600" />} title="Verified proof of service">
            Every job is documented with photos and cryptographically hashed. No disputes about what was done.
          </Feature>
          <Feature icon={<Users className="h-6 w-6 text-zinc-600" />} title="Manage crews & payroll">
            Track time, assign jobs, and sync directly with Gusto for seamless payroll processing.
          </Feature>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="rounded-2xl border border-neutral-200 bg-gradient-to-r from-zinc-600 to-indigo-600 text-white p-8">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-2xl font-bold">Ready to eliminate invoicing?</h2>
              <p className="text-blue-100 mt-2">See how PayHive helps contractors get paid instantly.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/start-trial" className="px-5 py-3 rounded-xl bg-white text-blue-700 font-semibold hover:bg-blue-50">
                Start free
              </Link>
              <Link to="/get-demo" className="px-5 py-3 rounded-xl border border-white/40 hover:bg-white/10">
                Get a demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
