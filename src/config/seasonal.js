// Maps org industry to seasonal service recommendations
// Industry values come from org settings (lowercase): landscaping, lawncare, hvac, roofing,
// pressure_washing, pest_control, cleaning, concrete, general_contractor, decks, maid_services, house_washing

const SEASONAL_CAMPAIGNS = {
  landscaping: {
    spring: [
      { service: 'Spring Clean-Up', message: 'Time to clear winter debris and prep lawns for the growing season.' },
      { service: 'Lawn Aeration & Overseeding', message: 'Spring aeration promotes root growth and fills in bare patches.' },
      { service: 'Mulching', message: 'Fresh mulch protects plant beds and improves curb appeal.' },
    ],
    summer: [
      { service: 'Fertilization', message: 'Mid-season feeding keeps lawns green through the heat.' },
      { service: 'Irrigation Check', message: 'Ensure sprinkler systems are running efficiently before peak heat.' },
    ],
    fall: [
      { service: 'Fall Clean-Up', message: 'Leaf removal and bed prep before winter dormancy.' },
      { service: 'Winterization', message: 'Protect irrigation systems and perennials from freeze damage.' },
    ],
    winter: [
      { service: 'Snow Removal', message: 'Keep properties safe and accessible through winter storms.' },
      { service: 'Equipment Maintenance', message: 'Off-season is the time to service mowers and trimmers.' },
    ],
  },
  lawncare: {
    spring: [
      { service: 'Spring Clean-Up', message: 'Clear debris and prep for the mowing season.' },
      { service: 'Pre-Emergent Treatment', message: 'Stop weeds before they start with early spring application.' },
      { service: 'Aeration & Overseeding', message: 'Thicken lawns after winter stress.' },
    ],
    summer: [
      { service: 'Weed Control', message: 'Keep lawns pristine through peak growing season.' },
      { service: 'Grub Prevention', message: 'Apply grub control before larvae damage turf.' },
    ],
    fall: [
      { service: 'Fall Fertilization', message: 'Strengthen root systems heading into dormancy.' },
      { service: 'Leaf Removal', message: 'Prevent lawn smothering from fallen leaves.' },
    ],
    winter: [
      { service: 'Snow & Ice Management', message: 'Reliable clearing for residential driveways and walks.' },
    ],
  },
  hvac: {
    spring: [
      { service: 'AC Tune-Up', message: 'Pre-summer maintenance prevents breakdowns during heat waves.' },
      { service: 'Duct Cleaning', message: 'Clear allergens and dust before allergy season peaks.' },
    ],
    summer: [
      { service: 'Emergency AC Repair', message: 'Remind customers about priority service availability.' },
      { service: 'Indoor Air Quality', message: 'Air purifier installs and filter replacements while AC runs 24/7.' },
    ],
    fall: [
      { service: 'Furnace Tune-Up', message: 'Pre-winter heating inspection prevents cold-weather emergencies.' },
      { service: 'Thermostat Upgrade', message: 'Smart thermostat installs save customers money all winter.' },
    ],
    winter: [
      { service: 'Emergency Heat Repair', message: 'Priority service for heating failures.' },
      { service: 'Maintenance Plan Renewal', message: 'Renew annual maintenance agreements during service calls.' },
    ],
  },
  roofing: {
    spring: [
      { service: 'Post-Winter Inspection', message: 'Check for winter storm damage before spring rains.' },
      { service: 'Gutter Cleaning', message: 'Clear spring debris to prevent water damage.' },
    ],
    summer: [
      { service: 'Roof Replacement', message: 'Ideal weather for major roofing projects.' },
      { service: 'Attic Ventilation', message: 'Proper ventilation reduces cooling costs.' },
    ],
    fall: [
      { service: 'Pre-Winter Inspection', message: 'Identify and fix vulnerabilities before snow and ice.' },
      { service: 'Gutter Guards', message: 'Install before leaf season to prevent clogging.' },
    ],
    winter: [
      { service: 'Ice Dam Prevention', message: 'Address ice buildup before it causes interior leaks.' },
      { service: 'Emergency Tarping', message: 'Storm damage response and temporary protection.' },
    ],
  },
  pressure_washing: {
    spring: [
      { service: 'House Washing', message: 'Remove winter grime and mildew for curb appeal.' },
      { service: 'Deck & Patio Cleaning', message: 'Prep outdoor spaces for spring entertaining.' },
    ],
    summer: [
      { service: 'Driveway & Sidewalk Cleaning', message: 'Remove oil stains and algae buildup.' },
    ],
    fall: [
      { service: 'Pre-Winter Wash', message: 'Clean surfaces before freeze-thaw cycles set in stains.' },
    ],
    winter: [],
  },
  pest_control: {
    spring: [
      { service: 'Perimeter Treatment', message: 'Stop insects before they move indoors for nesting season.' },
      { service: 'Termite Inspection', message: 'Swarm season makes spring the critical window for detection.' },
    ],
    summer: [
      { service: 'Mosquito Treatment', message: 'Yard barrier treatments for outdoor comfort.' },
      { service: 'Ant & Roach Control', message: 'Peak activity season for household pests.' },
    ],
    fall: [
      { service: 'Rodent Exclusion', message: 'Seal entry points before mice and rats seek winter shelter.' },
    ],
    winter: [
      { service: 'Indoor Pest Monitoring', message: 'Overwintering pests need ongoing monitoring.' },
    ],
  },
};

// Aliases — multiple industry names map to same campaigns
SEASONAL_CAMPAIGNS.house_washing = SEASONAL_CAMPAIGNS.pressure_washing;
SEASONAL_CAMPAIGNS.cleaning = SEASONAL_CAMPAIGNS.pressure_washing;
SEASONAL_CAMPAIGNS.maid_services = {
  spring: [{ service: 'Deep Spring Clean', message: 'Post-winter deep cleaning for homes.' }],
  summer: [{ service: 'Move-In/Move-Out Clean', message: 'Peak moving season means high demand.' }],
  fall: [{ service: 'Pre-Holiday Deep Clean', message: 'Get homes ready for holiday gatherings.' }],
  winter: [{ service: 'Post-Holiday Clean', message: 'Reset homes after the holiday season.' }],
};
SEASONAL_CAMPAIGNS.concrete = {
  spring: [{ service: 'Crack Repair', message: 'Fix freeze-thaw damage from winter.' }],
  summer: [{ service: 'New Installations', message: 'Ideal curing conditions for driveways and patios.' }],
  fall: [{ service: 'Sealing', message: 'Protect surfaces before winter freeze-thaw cycles.' }],
  winter: [],
};
SEASONAL_CAMPAIGNS.general_contractor = {
  spring: [{ service: 'Exterior Repairs', message: 'Address winter damage — siding, trim, decks.' }],
  summer: [{ service: 'Remodeling Projects', message: 'Peak season for interior and exterior renovations.' }],
  fall: [{ service: 'Winterization', message: 'Weather-sealing, insulation, storm door installs.' }],
  winter: [{ service: 'Interior Projects', message: 'Bathroom and kitchen remodels during the slow season.' }],
};
SEASONAL_CAMPAIGNS.decks = {
  spring: [{ service: 'Deck Inspection & Repair', message: 'Fix winter damage before outdoor season.' }],
  summer: [{ service: 'New Deck Builds', message: 'Ideal weather for new construction.' }],
  fall: [{ service: 'Staining & Sealing', message: 'Protect wood before winter moisture sets in.' }],
  winter: [],
};

export function getCurrentSeason() {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export function getSeasonalCampaigns(industry) {
  const key = (industry || '').toLowerCase().replace(/[\s/]+/g, '_');
  const campaigns = SEASONAL_CAMPAIGNS[key];
  if (!campaigns) return null;
  const season = getCurrentSeason();
  return {
    season,
    seasonLabel: season.charAt(0).toUpperCase() + season.slice(1),
    campaigns: campaigns[season] || [],
    allSeasons: campaigns,
  };
}

export default SEASONAL_CAMPAIGNS;
