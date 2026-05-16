// Re-export types
export type {
  HiveApp,
  SwitchResult,
  OnSwitchApp,
  AppSwitcherProps,
  UseAppSwitcherState,
  UseAppSwitcherOptions,
} from './types'

// Re-export hook for custom implementations
export { useAppSwitcher } from './useAppSwitcher'

// Re-export main component
export { AppSwitcher } from './AppSwitcher'

// Default export for convenience
export { AppSwitcher as default } from './AppSwitcher'
