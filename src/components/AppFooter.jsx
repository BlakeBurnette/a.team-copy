// src/components/AppFooter.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function AppFooter({ className = '', showBrand = true }) {
  const year = new Date().getFullYear();

  return (
    <footer className={`border-t border-neutral-200 bg-white px-6 md:px-8 py-8 text-sm text-gray-600 ${className}`}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        {showBrand && (
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-auto" />
            <span>PayHive</span>
            <span className="hidden sm:inline text-gray-400">•</span>
            <span className="hidden sm:inline text-gray-500">© {year}</span>
          </div>
        )}

        <div className={`${showBrand ? 'sm:ml-auto' : ''} flex items-center gap-4 flex-wrap justify-center`}>
          {/* Internal routes use <Link> so SPA routing works */}
          <Link className="hover:text-black" to="/dna">DNA</Link>
          <Link className="hover:text-black" to="/legal/terms">Terms</Link>
          <Link className="hover:text-black" to="/legal/privacy">Privacy</Link>
          <Link className="hover:text-black" to="/security">Security</Link>
          <Link className="hover:text-black" to="/careers">Careers</Link>
          <Link className="hover:text-black" to="/blog">Blog</Link>
          <Link className="hover:text-black" to="/whitepaper">White Paper</Link>
          {/* External stays an <a> */}
          <a className="hover:text-black" href="mailto:support@thepayhive.com">Support</a>
        </div>
      </div>
    </footer>
  );
}
