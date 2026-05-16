import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import AppFooter from './AppFooter';

export default function LegalLayout({ title, children, hideTopNav = false }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] antialiased flex flex-col">
      {!hideTopNav && (
        <header className="border-b border-neutral-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight hover:opacity-80">
              <Logo className="h-5 w-auto" />
              <span>PayHive</span>
            </Link>
            <nav className="text-sm">
              <Link to="/legal/privacy" className="text-gray-600 hover:text-amber-600 mr-4">Privacy</Link>
              <Link to="/legal/terms" className="text-gray-600 hover:text-amber-600">Terms</Link>
            </nav>
          </div>
        </header>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full">
        {title ? <h1 className="text-3xl font-bold mb-1">{title}</h1> : null}
        <div className="text-sm text-gray-500 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </div>
        <article className="prose prose-zinc max-w-none">
          {children}
        </article>
      </main>

      {/* Shared, on-brand footer */}
      <AppFooter />
    </div>
  );
}
