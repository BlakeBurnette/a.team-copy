// Canonical vendor trade categories.
//
// Used by VendorOnboarding so we collect one of a fixed set of ids,
// never free text. `id` is the stable machine key — persisted; never
// change. `label` is the display name.
//
// Ordered roughly by frequency in real-estate transaction work. Keep
// this list tight: every new category fragments Sir Walter's routing,
// so only add when there's a clear market need.

export const TRADE_CATEGORIES = [
  { id: 'cleaning',         label: 'Cleaning (turn / move-out)' },
  { id: 'staging',          label: 'Staging' },
  { id: 'photography',      label: 'Photography / media' },
  { id: 'handyman',         label: 'Handyman / general repairs' },
  { id: 'painting',         label: 'Painting' },
  { id: 'landscaping',      label: 'Landscaping / lawn' },
  { id: 'plumbing',         label: 'Plumbing' },
  { id: 'electrical',       label: 'Electrical' },
  { id: 'hvac',             label: 'HVAC' },
  { id: 'roofing',          label: 'Roofing' },
  { id: 'inspection',       label: 'Home inspection' },
  { id: 'pest_control',     label: 'Pest control' },
  { id: 'movers',           label: 'Movers' },
  { id: 'general_contractor', label: 'General contractor' },
  { id: 'general',          label: 'Something else' },
];

export function findTradeById(id) {
  return TRADE_CATEGORIES.find((t) => t.id === id);
}
