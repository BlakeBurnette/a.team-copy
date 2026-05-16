// Vertical feature-flag configuration.
// Each vertical defines which sidebar modules are visible.
// Adding a new vertical = adding one object here.

export const VERTICALS = {
  real_estate: {
    label: 'Real Estate',
    modules: ['properties', 'quotes', 'approvals', 'magic_links', 'payments', 'service_records'],
  },
  property_mgmt: {
    label: 'Property Management',
    modules: ['properties', 'customers', 'schedule', 'crews', 'invoices', 'payments', 'service_records'],
  },
  residential_services: {
    label: 'Residential Services',
    modules: ['customers', 'schedule', 'crews', 'invoices', 'payments', 'service_records', 'quotes'],
  },
  roofing_storm: {
    label: 'Roofing / Storm',
    modules: ['crm_pipeline', 'leads', 'quotes', 'approvals', 'magic_links', 'crews', 'payments', 'service_records'],
  },
};

// Union of every module key across all verticals
export const ALL_MODULES = [
  ...new Set(Object.values(VERTICALS).flatMap((v) => v.modules)),
];

/**
 * Returns { label, modules, isModuleEnabled } for a given vertical key.
 * null / undefined / unknown vertical → all modules enabled.
 */
export function getVerticalConfig(vertical) {
  const cfg = vertical ? VERTICALS[vertical] : null;
  if (cfg) {
    return {
      label: cfg.label,
      modules: cfg.modules,
      isModuleEnabled: (key) => cfg.modules.includes(key),
    };
  }
  return {
    label: 'Default',
    modules: ALL_MODULES,
    isModuleEnabled: () => true,
  };
}
