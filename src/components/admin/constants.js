// ./src/components/admin/constants.js

// Users
export const ALLOWED_ROLES = ['user', 'admin', 'manager', 'payee', 'owner'];
export const ALLOWED_STATUSES = ['active', 'inactive'];
export const USERS_PER_PAGE = 20;

// Industries - keep in sync with BASE_INDUSTRIES in OwnerOnboard.jsx
export const INDUSTRY_OPTIONS = [
  'Pressure Washing',
  'Pest Control',
  'Maid Services',
  'Landscaping',
  'HVAC',
  'Concrete',
  'General Contractor',
  'Lawncare',
  'Cleaning',
  'House Washing',
  'Roofing',
  'Decks',
  'Other',
];

// Services by industry
export const LAWNCARE_SERVICES = [
  "Mow, Blow & Go",
  "Lawn Edging & Trimming",
  "Fertilization",
  "Weed Control",
  "Lawn Aeration & Overseeding",
  "Sod Installation",
  "Tree Trimming & Pruning",
  "Shrub Shaping",
  "Tree Removal",
  "Seasonal Flower Planting",
  "Mulching",
  "Irrigation Installation",
  "Irrigation Repair",
  "Walkways & Patios",
  "Retaining Walls",
  "Outdoor Lighting",
  "Leaf Removal",
  "Spring Clean-Up",
  "Fall Clean-Up",
  "Gutter Cleaning",
  "Landscape Design",
  "Erosion Control",
];

export const CLEANING_SERVICES = [
  "Residential Cleaning (Recurring)",
  "Deep Cleaning",
  "Move-In / Move-Out Cleaning",
  "Post-Construction Cleaning",
  "Short-Term Rental Turnover",
  "Office / Commercial Cleaning",
  "Janitorial Services (Nightly)",
  "Carpet Cleaning",
  "Upholstery Cleaning",
  "Interior Window Cleaning",
  "Exterior Window Cleaning",
  "Tile & Grout Cleaning",
  "Hard Floor Care (Strip & Wax)",
  "Disinfection & Sanitization",
  "Green / Eco-Friendly Cleaning",
  "Refrigerator Cleaning",
  "Oven Cleaning",
  "Garage / Basement Cleanout",
  "Organization / Decluttering",
  "Laundry & Linen Service",
];

export const HOUSE_WASHING_SERVICES = [
  "House Washing (Soft Wash)",
  "Roof Washing (Soft Wash)",
  "Gutter Cleaning",
  "Gutter Whitening / Brightening",
  "Driveway Pressure Washing",
  "Sidewalk Pressure Washing",
  "Deck Washing",
  "Fence Washing",
  "Patio & Paver Cleaning",
  "Pool Deck Cleaning",
  "Rust Stain Removal",
  "Oil Stain Degreasing",
  "Efflorescence Removal",
  "Exterior Window Washing",
  "Solar Panel Cleaning",
  "Screen Enclosure Cleaning",
  "Graffiti Removal",
];

export const PEST_CONTROL_SERVICES = [
  "General Pest Control (Interior/Exterior)",
  "Quarterly Maintenance Service",
  "One-Time Treatment",
  "Ant Control",
  "German Cockroach Cleanout",
  "Spider Control",
  "Rodent Control (Trapping & Exclusion)",
  "Wasp & Hornet Nest Removal",
  "Carpenter Bee Treatment",
  "Mosquito Control",
  "Flea & Tick Treatment",
  "Bed Bug Inspection & Treatment",
  "Termite Inspection",
  "Termite Treatment (Liquid/Bait)",
  "Pantry Pest Treatment",
  "Exterior Perimeter Treatment",
  "Wildlife Removal & Exclusion",
  "Crawl Space Moisture Control",
];

export const SERVICES_BY_INDUSTRY = {
  Lawncare: LAWNCARE_SERVICES,
  Cleaning: CLEANING_SERVICES,
  "House Washing": HOUSE_WASHING_SERVICES,
  "Pest Control": PEST_CONTROL_SERVICES,
  Other: [],
};

export const ORG_FIELDS = [
  'name',
  'industry',
  'website',
  'phone_number',
  'email',
  // if you're still using address blob, keep it; otherwise keep split fields you use
  'street',
  'city',
  'state',
  'zip',
  'service_area_zipcodes',
  'business_hours',
  'services_rendered',
  'insurance_provider',
  'owner_user_id',      // ⬅️ NEW
];

// ─────────────────────────────────────────────────────────────────────────────
// VERTICAL-SPECIFIC SERVICE FORM FIELDS
// These define additional fields shown on the service form based on org industry
// ─────────────────────────────────────────────────────────────────────────────

export const PRICING_TYPE_OPTIONS = {
  PER_SQ_FT: { value: 'per_sq_ft', label: 'Per Sq Ft' },
  PER_LINEAR_FT: { value: 'per_linear_ft', label: 'Per Linear Ft' },
  FLAT_RATE: { value: 'flat_rate', label: 'Flat Rate' },
  HOURLY: { value: 'hourly', label: 'Hourly' },
  PER_VISIT: { value: 'per_visit', label: 'Per Visit' },
  PER_ACRE: { value: 'per_acre', label: 'Per Acre' },
  PER_UNIT: { value: 'per_unit', label: 'Per Unit' },
  PER_ROOM: { value: 'per_room', label: 'Per Room' },
  PER_PROJECT: { value: 'per_project', label: 'Per Project' },
};

export const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'One-Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'annual', label: 'Annual' },
];

// Field type definitions for rendering
export const FIELD_TYPES = {
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  TEXT: 'text',
  NUMBER: 'number',
  CURRENCY: 'currency',
  CHECKBOX: 'checkbox',
  PERCENTAGE: 'percentage',
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESSURE WASHING & HOUSE WASHING
// ─────────────────────────────────────────────────────────────────────────────
export const PRESSURE_WASHING_FIELDS = [
  {
    key: 'surface_types',
    label: 'Surface Types',
    type: FIELD_TYPES.MULTI_SELECT,
    options: [
      { value: 'house_siding', label: 'House/Siding' },
      { value: 'driveway', label: 'Driveway' },
      { value: 'sidewalk', label: 'Sidewalk' },
      { value: 'deck', label: 'Deck' },
      { value: 'fence', label: 'Fence' },
      { value: 'patio_pavers', label: 'Patio/Pavers' },
      { value: 'pool_deck', label: 'Pool Deck' },
      { value: 'roof', label: 'Roof' },
      { value: 'gutters', label: 'Gutters' },
      { value: 'screen_enclosure', label: 'Screen Enclosure' },
      { value: 'concrete', label: 'Concrete' },
    ],
    required: false,
  },
  {
    key: 'wash_method',
    label: 'Wash Method',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'pressure_wash', label: 'Pressure Wash' },
      { value: 'soft_wash', label: 'Soft Wash' },
      { value: 'both', label: 'Both (as needed)' },
    ],
    required: false,
  },
  // Pricing section - grouped together
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      PRICING_TYPE_OPTIONS.PER_SQ_FT,
      PRICING_TYPE_OPTIONS.PER_LINEAR_FT,
      PRICING_TYPE_OPTIONS.FLAT_RATE,
    ],
    required: false,
    group: 'pricing',
  },
  {
    key: 'default_units',
    label: 'Default Units',
    type: FIELD_TYPES.NUMBER,
    placeholder: 'e.g., 2000',
    helpText: 'Typical sq ft or linear ft for this service',
    required: false,
    group: 'pricing',
  },
  {
    key: 'rate_per_unit',
    label: 'Rate (per unit)',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 0.40',
    helpText: 'Price per sq ft or linear ft',
    required: false,
    group: 'pricing',
  },
  {
    key: 'minimum_charge',
    label: 'Minimum Charge',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 150.00',
    helpText: 'Floor price regardless of size',
    required: false,
    group: 'pricing',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PEST CONTROL
// ─────────────────────────────────────────────────────────────────────────────
export const PEST_CONTROL_FIELDS = [
  {
    key: 'service_frequency',
    label: 'Service Frequency',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'one_time', label: 'One-Time' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annual', label: 'Annual' },
    ],
    required: false,
  },
  {
    key: 'pest_types',
    label: 'Pest Types',
    type: FIELD_TYPES.MULTI_SELECT,
    options: [
      { value: 'general_pest', label: 'General Pest' },
      { value: 'ants', label: 'Ants' },
      { value: 'roaches', label: 'Roaches' },
      { value: 'spiders', label: 'Spiders' },
      { value: 'termites', label: 'Termites' },
      { value: 'rodents', label: 'Rodents' },
      { value: 'bed_bugs', label: 'Bed Bugs' },
      { value: 'mosquitoes', label: 'Mosquitoes' },
      { value: 'wasps_hornets', label: 'Wasps/Hornets' },
      { value: 'fleas_ticks', label: 'Fleas/Ticks' },
      { value: 'wildlife', label: 'Wildlife' },
    ],
    required: false,
  },
  {
    key: 'treatment_area',
    label: 'Treatment Area',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'interior', label: 'Interior' },
      { value: 'exterior', label: 'Exterior' },
      { value: 'both', label: 'Both' },
    ],
    required: false,
  },
  {
    key: 'is_initial_treatment',
    label: 'Initial Treatment',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Check if this is an initial treatment (vs recurring)',
    required: false,
  },
  {
    key: 'follow_up_included',
    label: 'Follow-up Included',
    type: FIELD_TYPES.CHECKBOX,
    required: false,
  },
  {
    key: 'warranty_period',
    label: 'Warranty Period',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'none', label: 'None' },
      { value: '30_days', label: '30 Days' },
      { value: '90_days', label: '90 Days' },
      { value: '1_year', label: '1 Year' },
    ],
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HVAC
// ─────────────────────────────────────────────────────────────────────────────
export const HVAC_FIELDS = [
  {
    key: 'service_category',
    label: 'Service Category',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'diagnostic', label: 'Diagnostic' },
      { value: 'repair', label: 'Repair' },
      { value: 'maintenance', label: 'Maintenance/Tune-Up' },
      { value: 'installation', label: 'Installation' },
      { value: 'emergency', label: 'Emergency' },
    ],
    required: false,
  },
  {
    key: 'system_types',
    label: 'System Types',
    type: FIELD_TYPES.MULTI_SELECT,
    options: [
      { value: 'ac', label: 'AC' },
      { value: 'furnace', label: 'Furnace' },
      { value: 'heat_pump', label: 'Heat Pump' },
      { value: 'full_hvac', label: 'Full HVAC' },
      { value: 'ductwork', label: 'Ductwork' },
      { value: 'thermostat', label: 'Thermostat' },
      { value: 'mini_split', label: 'Mini Split' },
    ],
    required: false,
  },
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      PRICING_TYPE_OPTIONS.FLAT_RATE,
      PRICING_TYPE_OPTIONS.HOURLY,
      PRICING_TYPE_OPTIONS.PER_UNIT,
    ],
    required: false,
  },
  {
    key: 'hourly_rate',
    label: 'Hourly Rate',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 85.00',
    showWhen: { field: 'pricing_type', value: 'hourly' },
    required: false,
  },
  {
    key: 'parts_included',
    label: 'Parts Included',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Price includes standard parts',
    required: false,
  },
  {
    key: 'emergency_upcharge',
    label: 'Emergency Upcharge %',
    type: FIELD_TYPES.PERCENTAGE,
    placeholder: 'e.g., 50',
    helpText: 'Additional percentage for emergency calls',
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LANDSCAPING
// ─────────────────────────────────────────────────────────────────────────────
export const LANDSCAPING_FIELDS = [
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      PRICING_TYPE_OPTIONS.PER_VISIT,
      PRICING_TYPE_OPTIONS.PER_SQ_FT,
      PRICING_TYPE_OPTIONS.PER_ACRE,
      PRICING_TYPE_OPTIONS.HOURLY,
      PRICING_TYPE_OPTIONS.FLAT_RATE,
    ],
    required: false,
  },
  {
    key: 'service_category',
    label: 'Service Category',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'design', label: 'Design' },
      { value: 'installation', label: 'Installation' },
      { value: 'hardscape', label: 'Hardscape' },
      { value: 'planting', label: 'Planting' },
      { value: 'irrigation', label: 'Irrigation' },
      { value: 'lighting', label: 'Lighting' },
      { value: 'maintenance', label: 'Maintenance' },
    ],
    required: false,
  },
  {
    key: 'material_cost_separate',
    label: 'Material Cost Separate',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Materials billed separately from labor',
    required: false,
  },
  {
    key: 'property_size_range',
    label: 'Property Size Range',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'under_5k', label: 'Under 5,000 sq ft' },
      { value: '5k_10k', label: '5,000-10,000 sq ft' },
      { value: '10k_20k', label: '10,000-20,000 sq ft' },
      { value: '20k_acre', label: '20,000 sq ft - 1 acre' },
      { value: 'over_acre', label: '1+ acre' },
      { value: 'any', label: 'Any size' },
    ],
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LAWNCARE
// ─────────────────────────────────────────────────────────────────────────────
export const LAWNCARE_FIELDS = [
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      PRICING_TYPE_OPTIONS.PER_VISIT,
      PRICING_TYPE_OPTIONS.PER_SQ_FT,
      PRICING_TYPE_OPTIONS.HOURLY,
      PRICING_TYPE_OPTIONS.FLAT_RATE,
    ],
    required: false,
  },
  {
    key: 'frequency',
    label: 'Frequency',
    type: FIELD_TYPES.SELECT,
    options: FREQUENCY_OPTIONS,
    required: false,
  },
  {
    key: 'property_size_range',
    label: 'Property Size Range',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'under_5k', label: 'Under 5,000 sq ft' },
      { value: '5k_10k', label: '5,000-10,000 sq ft' },
      { value: '10k_20k', label: '10,000-20,000 sq ft' },
      { value: '20k_acre', label: '20,000 sq ft - 1 acre' },
      { value: 'over_acre', label: '1+ acre' },
      { value: 'any', label: 'Any size' },
    ],
    required: false,
  },
  {
    key: 'rate_per_unit',
    label: 'Rate (per unit)',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 0.02',
    helpText: 'Rate per sq ft (if applicable)',
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CLEANING & MAID SERVICES
// ─────────────────────────────────────────────────────────────────────────────
export const CLEANING_FIELDS = [
  {
    key: 'cleaning_type',
    label: 'Cleaning Type',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'deep_clean', label: 'Deep Clean' },
      { value: 'move_in_out', label: 'Move-In/Move-Out' },
      { value: 'post_construction', label: 'Post-Construction' },
      { value: 'one_time', label: 'One-Time' },
    ],
    required: false,
  },
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      PRICING_TYPE_OPTIONS.HOURLY,
      PRICING_TYPE_OPTIONS.FLAT_RATE,
      PRICING_TYPE_OPTIONS.PER_SQ_FT,
      PRICING_TYPE_OPTIONS.PER_ROOM,
    ],
    required: false,
  },
  {
    key: 'frequency',
    label: 'Frequency',
    type: FIELD_TYPES.SELECT,
    options: FREQUENCY_OPTIONS.filter(f =>
      ['one_time', 'weekly', 'bi_weekly', 'monthly'].includes(f.value)
    ),
    required: false,
  },
  {
    key: 'property_type',
    label: 'Property Type',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'rental_airbnb', label: 'Rental/Airbnb' },
    ],
    required: false,
  },
  {
    key: 'hourly_rate',
    label: 'Hourly Rate (per cleaner)',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 35.00',
    showWhen: { field: 'pricing_type', value: 'hourly' },
    required: false,
  },
  {
    key: 'bedrooms',
    label: 'Bedrooms (for estimate)',
    type: FIELD_TYPES.NUMBER,
    placeholder: 'e.g., 3',
    helpText: 'Default bedroom count for pricing',
    required: false,
  },
  {
    key: 'bathrooms',
    label: 'Bathrooms (for estimate)',
    type: FIELD_TYPES.NUMBER,
    placeholder: 'e.g., 2',
    helpText: 'Default bathroom count for pricing',
    required: false,
  },
  {
    key: 'add_ons',
    label: 'Available Add-ons',
    type: FIELD_TYPES.MULTI_SELECT,
    options: [
      { value: 'inside_fridge', label: 'Inside Fridge' },
      { value: 'inside_oven', label: 'Inside Oven' },
      { value: 'windows', label: 'Windows' },
      { value: 'laundry', label: 'Laundry' },
      { value: 'organization', label: 'Organization' },
      { value: 'garage', label: 'Garage' },
    ],
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONCRETE
// ─────────────────────────────────────────────────────────────────────────────
export const CONCRETE_FIELDS = [
  {
    key: 'service_type',
    label: 'Service Type',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'new_pour', label: 'New Pour' },
      { value: 'repair', label: 'Repair' },
      { value: 'resurfacing', label: 'Resurfacing' },
      { value: 'removal_replace', label: 'Removal & Replace' },
      { value: 'sealing', label: 'Sealing' },
    ],
    required: false,
  },
  {
    key: 'surface_type',
    label: 'Surface Type',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'driveway', label: 'Driveway' },
      { value: 'patio', label: 'Patio' },
      { value: 'sidewalk', label: 'Sidewalk' },
      { value: 'slab_foundation', label: 'Slab/Foundation' },
      { value: 'steps', label: 'Steps' },
      { value: 'retaining_wall', label: 'Retaining Wall' },
    ],
    required: false,
  },
  {
    key: 'finish_type',
    label: 'Finish Type',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'plain_broom', label: 'Plain/Broom' },
      { value: 'stamped', label: 'Stamped' },
      { value: 'colored', label: 'Colored' },
      { value: 'exposed_aggregate', label: 'Exposed Aggregate' },
      { value: 'polished', label: 'Polished' },
    ],
    required: false,
  },
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      PRICING_TYPE_OPTIONS.PER_SQ_FT,
      PRICING_TYPE_OPTIONS.FLAT_RATE,
    ],
    required: false,
  },
  {
    key: 'rate_per_sq_ft',
    label: 'Rate Per Sq Ft',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 8.00',
    showWhen: { field: 'pricing_type', value: 'per_sq_ft' },
    required: false,
  },
  {
    key: 'removal_included',
    label: 'Removal Included',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Price includes removal of existing concrete',
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GENERAL CONTRACTOR
// ─────────────────────────────────────────────────────────────────────────────
export const GENERAL_CONTRACTOR_FIELDS = [
  {
    key: 'service_category',
    label: 'Service Category',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'repair', label: 'Repair' },
      { value: 'installation', label: 'Installation' },
      { value: 'remodel', label: 'Remodel' },
      { value: 'maintenance', label: 'Maintenance' },
    ],
    required: false,
  },
  {
    key: 'trade_types',
    label: 'Trade Types',
    type: FIELD_TYPES.MULTI_SELECT,
    options: [
      { value: 'carpentry', label: 'Carpentry' },
      { value: 'drywall', label: 'Drywall' },
      { value: 'painting', label: 'Painting' },
      { value: 'flooring', label: 'Flooring' },
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'doors_windows', label: 'Doors/Windows' },
      { value: 'cabinets', label: 'Cabinets' },
      { value: 'general', label: 'General' },
    ],
    required: false,
  },
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      PRICING_TYPE_OPTIONS.HOURLY,
      PRICING_TYPE_OPTIONS.FLAT_RATE,
      PRICING_TYPE_OPTIONS.PER_PROJECT,
    ],
    required: false,
  },
  {
    key: 'hourly_rate',
    label: 'Hourly Rate',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 75.00',
    showWhen: { field: 'pricing_type', value: 'hourly' },
    required: false,
  },
  {
    key: 'complexity',
    label: 'Complexity',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'minor', label: 'Minor (1-2 hrs)' },
      { value: 'medium', label: 'Medium (2-5 hrs)' },
      { value: 'major', label: 'Major (5+ hrs)' },
    ],
    required: false,
  },
  {
    key: 'materials_included',
    label: 'Materials Included',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Price includes materials',
    required: false,
  },
  {
    key: 'material_markup',
    label: 'Material Markup %',
    type: FIELD_TYPES.PERCENTAGE,
    placeholder: 'e.g., 20',
    helpText: 'Markup on materials (if billed separately)',
    required: false,
  },
  {
    key: 'permits_required',
    label: 'Permits Required',
    type: FIELD_TYPES.CHECKBOX,
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ROOFING
// ─────────────────────────────────────────────────────────────────────────────
export const ROOFING_FIELDS = [
  {
    key: 'service_type',
    label: 'Service Type',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'inspection', label: 'Inspection' },
      { value: 'repair', label: 'Repair' },
      { value: 'replacement', label: 'Replacement' },
      { value: 'new_installation', label: 'New Installation' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'coating', label: 'Coating/Sealing' },
      { value: 'gutter_install', label: 'Gutter Installation' },
    ],
    required: false,
  },
  {
    key: 'roof_types',
    label: 'Roof Types',
    type: FIELD_TYPES.MULTI_SELECT,
    options: [
      { value: 'asphalt_shingle', label: 'Asphalt Shingle' },
      { value: 'metal', label: 'Metal' },
      { value: 'tile', label: 'Tile' },
      { value: 'flat_tpo', label: 'Flat/TPO' },
      { value: 'slate', label: 'Slate' },
      { value: 'wood_shake', label: 'Wood Shake' },
      { value: 'epdm', label: 'EPDM Rubber' },
    ],
    required: false,
  },
  {
    key: 'stories',
    label: 'Stories',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: '1', label: '1 Story' },
      { value: '2', label: '2 Stories' },
      { value: '3+', label: '3+ Stories' },
    ],
    required: false,
  },
  {
    key: 'pitch',
    label: 'Roof Pitch',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'low', label: 'Low (0-4/12)' },
      { value: 'standard', label: 'Standard (5-9/12)' },
      { value: 'steep', label: 'Steep (10-12/12)' },
      { value: 'very_steep', label: 'Very Steep (12+/12)' },
    ],
    helpText: 'Steeper roofs typically cost more',
    required: false,
  },
  // Pricing section
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'per_square', label: 'Per Square (100 sq ft)' },
      PRICING_TYPE_OPTIONS.PER_SQ_FT,
      PRICING_TYPE_OPTIONS.FLAT_RATE,
    ],
    required: false,
    group: 'pricing',
  },
  {
    key: 'default_units',
    label: 'Default Units',
    type: FIELD_TYPES.NUMBER,
    placeholder: 'e.g., 25',
    helpText: 'Squares or sq ft depending on pricing type',
    required: false,
    group: 'pricing',
  },
  {
    key: 'rate_per_unit',
    label: 'Rate (per unit)',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 350.00',
    helpText: 'Price per square or sq ft',
    required: false,
    group: 'pricing',
  },
  {
    key: 'minimum_charge',
    label: 'Minimum Charge',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 500.00',
    helpText: 'Floor price regardless of size',
    required: false,
    group: 'pricing',
  },
  {
    key: 'tear_off_included',
    label: 'Tear-off Included',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Price includes removal of old roofing',
    required: false,
  },
  {
    key: 'materials_included',
    label: 'Materials Included',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Price includes materials',
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DECKS
// ─────────────────────────────────────────────────────────────────────────────
export const DECKS_FIELDS = [
  {
    key: 'service_type',
    label: 'Service Type',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'new_build', label: 'New Build' },
      { value: 'repair', label: 'Repair' },
      { value: 'refinishing', label: 'Refinishing/Staining' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'sealing', label: 'Sealing' },
      { value: 'board_replacement', label: 'Board Replacement' },
    ],
    required: false,
  },
  {
    key: 'deck_materials',
    label: 'Deck Materials',
    type: FIELD_TYPES.MULTI_SELECT,
    options: [
      { value: 'pressure_treated', label: 'Pressure Treated Wood' },
      { value: 'cedar', label: 'Cedar' },
      { value: 'redwood', label: 'Redwood' },
      { value: 'composite', label: 'Composite (Trex, etc.)' },
      { value: 'pvc', label: 'PVC' },
      { value: 'hardwood', label: 'Hardwood (Ipe, etc.)' },
    ],
    required: false,
  },
  {
    key: 'deck_level',
    label: 'Deck Level',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: 'ground', label: 'Ground Level' },
      { value: 'raised', label: 'Raised (1st floor)' },
      { value: 'elevated', label: 'Elevated (2nd floor+)' },
      { value: 'multi_level', label: 'Multi-Level' },
    ],
    required: false,
  },
  // Pricing section
  {
    key: 'pricing_type',
    label: 'Pricing Type',
    type: FIELD_TYPES.SELECT,
    options: [
      PRICING_TYPE_OPTIONS.PER_SQ_FT,
      PRICING_TYPE_OPTIONS.PER_LINEAR_FT,
      PRICING_TYPE_OPTIONS.FLAT_RATE,
    ],
    required: false,
    group: 'pricing',
  },
  {
    key: 'default_units',
    label: 'Default Units',
    type: FIELD_TYPES.NUMBER,
    placeholder: 'e.g., 300',
    helpText: 'Sq ft or linear ft depending on pricing type',
    required: false,
    group: 'pricing',
  },
  {
    key: 'rate_per_unit',
    label: 'Rate (per unit)',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 25.00',
    helpText: 'Price per sq ft or linear ft',
    required: false,
    group: 'pricing',
  },
  {
    key: 'minimum_charge',
    label: 'Minimum Charge',
    type: FIELD_TYPES.CURRENCY,
    placeholder: 'e.g., 500.00',
    helpText: 'Floor price regardless of size',
    required: false,
    group: 'pricing',
  },
  {
    key: 'includes_railings',
    label: 'Includes Railings',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Price includes railing work',
    required: false,
  },
  {
    key: 'includes_steps',
    label: 'Includes Steps',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Price includes step work',
    required: false,
  },
  {
    key: 'materials_included',
    label: 'Materials Included',
    type: FIELD_TYPES.CHECKBOX,
    helpText: 'Price includes materials',
    required: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING: Industry → Field Definitions
// ─────────────────────────────────────────────────────────────────────────────
export const VERTICAL_FIELDS_BY_INDUSTRY = {
  'Pressure Washing': PRESSURE_WASHING_FIELDS,
  'House Washing': PRESSURE_WASHING_FIELDS, // Same as pressure washing
  'Pest Control': PEST_CONTROL_FIELDS,
  'HVAC': HVAC_FIELDS,
  'Landscaping': LANDSCAPING_FIELDS,
  'Lawncare': LAWNCARE_FIELDS,
  'Cleaning': CLEANING_FIELDS,
  'Maid Services': CLEANING_FIELDS, // Same as cleaning
  'Concrete': CONCRETE_FIELDS,
  'General Contractor': GENERAL_CONTRACTOR_FIELDS,
  'Roofing': ROOFING_FIELDS,
  'Decks': DECKS_FIELDS,
  'Other': [], // No additional fields for "Other"
};

// Helper to get fields for an industry
export function getVerticalFieldsForIndustry(industry) {
  if (!industry) return [];
  return VERTICAL_FIELDS_BY_INDUSTRY[industry] || [];
}

// Helper to get default values for vertical fields
export function getDefaultVerticalFieldValues(industry) {
  const fields = getVerticalFieldsForIndustry(industry);
  const defaults = {};
  for (const field of fields) {
    if (field.type === FIELD_TYPES.MULTI_SELECT) {
      defaults[field.key] = [];
    } else if (field.type === FIELD_TYPES.CHECKBOX) {
      defaults[field.key] = false;
    } else {
      defaults[field.key] = '';
    }
  }
  return defaults;
}
