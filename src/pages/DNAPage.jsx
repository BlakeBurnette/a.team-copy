// src/pages/DNAPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Users,
  MapPin,
  Sparkles,
  ArrowLeft,
  CreditCard,
  Wrench,
  Shield,
} from 'lucide-react';

export default function DNAPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="text-white py-16" style={{ background: 'linear-gradient(135deg, #FFA11E 0%, #FBAB2E 100%)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2E2E2E' }}>
            PayHive DNA
          </h1>
          <p className="text-xl" style={{ color: '#2E2E2E', opacity: 0.9 }}>
            Building more connected communities through business and technology.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Who We Are */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Who We Are</h2>
          <div className="space-y-4 text-gray-600 text-lg">
            <p>
              We're the infrastructure that powers service businesses—from the solo operator
              with a truck and a dream to the enterprise with 500 technicians across 12 states.
            </p>
            <p>
              We serve the companies that keep communities running: the landscapers, the HVAC techs,
              the cleaning crews, the roofers.
            </p>
          </div>
        </section>

        {/* What We Believe */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">What We Believe</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <BeliefCard
              icon={Heart}
              title="Community Over Transactions"
              points={[
                "We're building a network, not just a customer base",
                "Your success is our success—our pricing means we only win when you collect",
              ]}
            />
            <BeliefCard
              icon={Users}
              title="In This Together"
              points={[
                "We don't disappear after the sale",
                "When you struggle, we help. When you grow, we celebrate.",
              ]}
            />
            <BeliefCard
              icon={MapPin}
              title="Rooted Locally"
              points={[
                "Whether you're one crew or one hundred, you're serving real people in real neighborhoods",
                "We build tools that strengthen those local connections, not abstract them away",
              ]}
            />
            <BeliefCard
              icon={Sparkles}
              title="Build What We Want to See"
              points={[
                "Honest pricing. No hidden fees.",
                "Technology that scales with you—not software you pay for and never use",
              ]}
            />
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">What We Do</h2>
          <div className="space-y-4">
            <WhatWeDoItem
              icon={CreditCard}
              title="Payments that just work"
              description="Cards, ACH, autopay—for 10 customers or 10,000"
            />
            <WhatWeDoItem
              icon={Wrench}
              title="Operations tools that grow with you"
              description="From first hire to franchise"
            />
            <WhatWeDoItem
              icon={Shield}
              title="Proof-of-service that wins disputes"
              description="And builds trust at any scale"
            />
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl p-8 text-center" style={{ background: '#FFF7ED' }}>
          <h2 className="text-2xl font-bold mb-4">Ready to join the hive?</h2>
          <p className="text-gray-600 mb-6">
            Let's build something great together.
          </p>
          <Link
            to="/get-started"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-colors"
            style={{ background: '#FFA11E', color: '#111' }}
          >
            Get Started
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} PayHive. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link to="/legal/terms" className="hover:text-gray-900">Terms of Service</Link>
            <Link to="/legal/privacy" className="hover:text-gray-900">Privacy Policy</Link>
            <Link to="/" className="hover:text-gray-900">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BeliefCard({ icon: Icon, title, points }) {
  return (
    <div className="border rounded-xl p-6 hover:shadow-md transition-shadow">
      <Icon className="w-8 h-8 mb-4" style={{ color: '#FFA11E' }} />
      <h3 className="font-semibold text-lg mb-3">{title}</h3>
      <ul className="space-y-2">
        {points.map((point, i) => (
          <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#FFA11E' }} />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhatWeDoItem({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
      <Icon className="w-6 h-6 mt-0.5 flex-shrink-0" style={{ color: '#FFA11E' }} />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </div>
  );
}
