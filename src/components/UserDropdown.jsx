// src/components/UserDropdown.jsx
import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UserDropdown = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth() || {};
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer email (can be long); fall back to name or generic
  const display = user?.email || user?.name || 'User';

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(v => !v)}
        className="focus:outline-none p-2 rounded-full hover:bg-neutral-100 active:bg-neutral-200"
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
      >
        <User className="h-6 w-6 text-gray-700" />
      </button>

      {dropdownOpen && (
        <div
          role="menu"
          className={[
            // Position so it overlays and doesn't affect layout (prevents FAB movement)
            'absolute right-0 top-full mt-2 z-50',
            // Let the menu size to content but keep sane bounds
            'w-max min-w-[12rem] max-w-[calc(100vw-2rem)]',
            // Surface styling
            'bg-white border border-neutral-200 shadow-md rounded-md py-2'
          ].join(' ')}
        >
          {user ? (
            <>
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                {/* Keep on one line so container grows; allow horizontal scroll on very small screens */}
                <span className="whitespace-nowrap overflow-x-auto inline-block max-w-[calc(100vw-3rem)]" title={display}>
                  {display}
                </span>
              </div>
              <button
                onClick={async () => {
                  await logout?.();
                  setDropdownOpen(false);
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                role="menuitem"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              onClick={async () => {
                setDropdownOpen(false);
                const next = location.pathname + location.search;
                navigate(`/login?next=${encodeURIComponent(next)}`);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              role="menuitem"
            >
              Log in
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
