// src/components/Header.jsx
import React from 'react';
import { Menu, Bolt } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserDropdown from './UserDropdown';
import Logo from './Logo';

const Header = ({
  sidebarOpenMobile,
  setSidebarOpenMobile,
  pageTitle = '',
  onOpenDesktopActions,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b overflow-visible">
      {/* Top bar */}
      <div className="h-16 w-full px-4 md:px-6 flex items-center gap-3 overflow-visible">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setSidebarOpenMobile?.(!sidebarOpenMobile)}
          className="md:hidden -ml-2 p-2 rounded hover:bg-neutral-100 active:bg-neutral-200"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>

        {/* Brand / logo -> always to /app */}
        <div className="hidden sm:flex items-center gap-2">
          <Link to="/app" aria-label="Go to dashboard">
            <Logo className="h-6 w-auto" />
          </Link>
        </div>

        <h1 className="text-lg sm:text-xl font-semibold truncate">{pageTitle}</h1>

        <div className="ml-auto flex items-center gap-2 overflow-visible">
          {onOpenDesktopActions && (
            <button
              type="button"
              onClick={onOpenDesktopActions}
              className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-300 hover:bg-neutral-50"
            >
              <Bolt className="h-4 w-4" />
              <span className="text-sm">Quick Actions</span>
            </button>
          )}

          {/* Dropdown renders absolutely; keep parent overflow visible */}
          <UserDropdown />
        </div>
      </div>

      {/* ▼ Subslot: pages can portal content here */}
      <div id="header-subslot" className="w-full" />
    </header>
  );
};

export default Header;
