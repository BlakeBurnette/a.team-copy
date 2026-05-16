import { useState, useEffect, useCallback } from 'react'
import { fetchApps, filterAppsByPermission, type HiveApp } from '@payhive/sso-client'
import type { UseAppSwitcherState, UseAppSwitcherOptions } from './types'

const DEFAULT_IDENTITY_URL = 'https://id.thepayhive.com'

/**
 * Hook for app switcher state management.
 * Use this if you want to build a custom UI but still use the core logic.
 */
export function useAppSwitcher(options: UseAppSwitcherOptions): UseAppSwitcherState {
  const {
    currentApp,
    allowedApps,
    isAdmin,
    onSwitchApp,
    identityUrl = DEFAULT_IDENTITY_URL,
  } = options

  const [isOpen, setIsOpen] = useState(false)
  const [apps, setApps] = useState<HiveApp[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)

  // Fetch apps when menu opens
  useEffect(() => {
    if (isOpen && apps.length === 0 && !isLoading) {
      loadApps()
    }
  }, [isOpen])

  const loadApps = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetchedApps = await fetchApps(identityUrl, currentApp)
      setApps(fetchedApps)
    } catch (err) {
      console.error('Failed to fetch apps:', err)
      setError('Failed to load apps')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter apps based on user permissions
  const visibleApps = filterAppsByPermission(apps, allowedApps, isAdmin)

  const handleAppClick = useCallback(
    async (app: HiveApp) => {
      // Don't switch if clicking current app
      if (app.current) {
        setIsOpen(false)
        return
      }

      // Don't switch if already switching
      if (switchingTo) {
        return
      }

      setSwitchingTo(app.id)
      try {
        const result = await onSwitchApp(app)
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl
        } else {
          setSwitchingTo(null)
        }
      } catch (err) {
        console.error('Failed to switch app:', err)
        setSwitchingTo(null)
      }
    },
    [onSwitchApp, switchingTo]
  )

  return {
    isOpen,
    setIsOpen,
    visibleApps,
    isLoading,
    error,
    switchingTo,
    handleAppClick,
  }
}
