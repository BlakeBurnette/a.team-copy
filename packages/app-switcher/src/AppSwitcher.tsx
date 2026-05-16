'use client'

import { useRef, useEffect } from 'react'
import type { HiveApp } from '@payhive/sso-client'
import { useAppSwitcher } from './useAppSwitcher'
import type { AppSwitcherProps } from './types'

const ACCENT_COLORS: Record<string, string> = {
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  orange: 'text-orange-600',
  violet: 'text-violet-600',
  purple: 'text-purple-600',
  amber: 'text-amber-600',
}

/**
 * Grid icon for the app switcher button
 */
function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  )
}

/**
 * External link icon
 */
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

/**
 * Loading spinner
 */
function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={`border-2 border-current border-t-transparent rounded-full animate-spin ${className || 'w-5 h-5'}`}
    />
  )
}

/**
 * Alert icon for errors
 */
function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

interface AppItemProps {
  app: HiveApp
  isLoading: boolean
  accentColorClass: string
  onClick: () => void
}

function AppItem({ app, isLoading, accentColorClass, onClick }: AppItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
        app.current
          ? 'bg-neutral-100 cursor-default'
          : isLoading
            ? 'bg-neutral-50 cursor-wait'
            : 'hover:bg-neutral-50'
      }`}
      role="menuitem"
    >
      <div
        className={`${app.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}
      >
        {isLoading ? (
          <Spinner className="w-5 h-5 text-white border-white border-t-transparent" />
        ) : (
          <span className="text-white font-bold text-sm">{app.letter}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium text-gray-900 text-sm">{app.name}</span>
          {!app.current && !isLoading && <ExternalLinkIcon className="h-3 w-3 text-gray-400" />}
          {app.current && (
            <span className={`text-xs font-medium ${accentColorClass}`}>(current)</span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {isLoading ? 'Redirecting...' : app.description}
        </p>
      </div>
    </button>
  )
}

/**
 * Unified App Switcher component for all PayHive applications.
 *
 * Usage:
 * ```tsx
 * <AppSwitcher
 *   currentApp="hive-sites"
 *   allowedApps={user.allowedApps}
 *   isAdmin={user.isAdmin}
 *   onSwitchApp={async (app) => {
 *     const res = await fetch(`/api/auth/sso-token?app=${app.id}`);
 *     const data = await res.json();
 *     return { redirectUrl: data.redirect_url };
 *   }}
 * />
 * ```
 */
export function AppSwitcher({
  currentApp,
  allowedApps,
  isAdmin,
  onSwitchApp,
  identityUrl,
  accentColor = 'blue',
  className,
}: AppSwitcherProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    isOpen,
    setIsOpen,
    visibleApps,
    isLoading,
    error,
    switchingTo,
    handleAppClick,
  } = useAppSwitcher({
    currentApp,
    allowedApps,
    isAdmin,
    onSwitchApp,
    identityUrl,
  })

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setIsOpen])

  const accentColorClass = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue

  // Hide if no visible apps after loading
  if (!isLoading && visibleApps.length === 0 && !error) {
    return null
  }

  return (
    <div className={`relative ${className || ''}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-neutral-100 active:bg-neutral-200 focus:outline-none"
        aria-label="Switch apps"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <GridIcon className="h-5 w-5 text-gray-600" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-neutral-200 shadow-lg rounded-lg overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-gray-700">Hive Apps</h3>
            </div>

            <div className="p-2">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="w-6 h-6 text-gray-400 border-gray-300 border-t-blue-500" />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600">
                  <AlertIcon className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {!isLoading &&
                !error &&
                visibleApps.map((app) => (
                  <AppItem
                    key={app.id}
                    app={app}
                    isLoading={switchingTo === app.id}
                    accentColorClass={accentColorClass}
                    onClick={() => handleAppClick(app)}
                  />
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
