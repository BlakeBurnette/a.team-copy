import type { HiveApp } from '@payhive/sso-client'

export type { HiveApp }

/**
 * Result from switching to an app
 */
export interface SwitchResult {
  /** Redirect URL with SSO token */
  redirectUrl: string
}

/**
 * Function to handle app switching - provided by the consuming app
 * Each app implements this differently based on their backend setup
 */
export type OnSwitchApp = (app: HiveApp) => Promise<SwitchResult>

/**
 * Props for the AppSwitcher component
 */
export interface AppSwitcherProps {
  /** Current app ID (e.g., 'hive-sites', 'payhive') */
  currentApp: string

  /** List of app IDs the user is allowed to access */
  allowedApps: string[]

  /** Whether the user is an admin */
  isAdmin: boolean

  /**
   * Function to get SSO redirect URL for an app.
   * Apps implement this based on their backend setup.
   */
  onSwitchApp: OnSwitchApp

  /** hive-identity URL (defaults to https://id.thepayhive.com) */
  identityUrl?: string

  /** Accent color for current app indicator (defaults to 'blue') */
  accentColor?: 'blue' | 'emerald' | 'orange' | 'violet' | 'purple' | 'amber'

  /** Optional class name for the container */
  className?: string
}

/**
 * State returned from useAppSwitcher hook
 */
export interface UseAppSwitcherState {
  /** Whether the menu is open */
  isOpen: boolean
  /** Toggle menu open/closed */
  setIsOpen: (open: boolean) => void
  /** List of apps visible to the user */
  visibleApps: HiveApp[]
  /** Whether apps are currently loading */
  isLoading: boolean
  /** Error message if apps failed to load */
  error: string | null
  /** ID of app currently being switched to */
  switchingTo: string | null
  /** Handle clicking on an app */
  handleAppClick: (app: HiveApp) => Promise<void>
}

/**
 * Options for useAppSwitcher hook
 */
export interface UseAppSwitcherOptions {
  currentApp: string
  allowedApps: string[]
  isAdmin: boolean
  onSwitchApp: OnSwitchApp
  identityUrl?: string
}
