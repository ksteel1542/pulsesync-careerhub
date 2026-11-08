// Central pricing configuration. Prices are in USD per month unless noted.
// UI, limits and enforcement all read from here, so a price or quota change is a
// one-line edit. `null` limits mean "unlimited".

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const CURRENCY = 'USD';
export const BILLING_CYCLES = ['monthly'];
export const DEFAULT_BILLING_CYCLE = 'monthly';

// ---------------------------------------------------------------------------
// B2C individual plans
// ---------------------------------------------------------------------------
export const B2C_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    aiGenerations: 3, // AI resume/cover-letter generations
    labStorageBytes: 50 * MB,
    labPriority: false,
    features: ['3 AI resume generations', '50 MB Inventor’s Lab storage', 'Job & Grant Radar', 'Social Studio scheduling'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 14.99,
    aiGenerations: null, // unlimited
    labStorageBytes: 5 * GB,
    labPriority: true,
    features: ['Unlimited AI resume generations', '5 GB Inventor’s Lab storage', 'Priority Inventor’s Lab placement', 'Everything in Free'],
  },
};

// ---------------------------------------------------------------------------
// B2B institutional plans
// ---------------------------------------------------------------------------
export const INSTITUTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 199,
    maxSeats: 250, // student seats
    streamingHours: 100,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 499,
    maxSeats: 1000,
    streamingHours: null, // TODO: not specified in the pricing brief, confirm before launch
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 999,
    maxSeats: null, // unlimited
    streamingHours: null, // TODO: not specified in the pricing brief, confirm before launch
  },
};
export const INSTITUTION_PLAN_ORDER = ['starter', 'growth', 'enterprise'];
export const DEFAULT_INSTITUTION_PLAN = 'starter';

// Members (verified students/faculty) of an Enterprise institution get Pro-level features.
export const ENTERPRISE_MEMBER_FEATURES = B2C_PLANS.pro;

// ---------------------------------------------------------------------------
// Job & Grant Radar (employer-side)
// ---------------------------------------------------------------------------
export const JOB_RADAR_PRICING = {
  standardListing: { id: 'standard', name: 'Standard Listing', price: 49, unit: 'post' },
  featuredBannerAddon: { id: 'featured', name: 'Featured Banner Add-on', price: 50, unit: 'post', addon: true },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const formatPrice = (amount) => (amount === 0 ? '$0' : `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`);

export const formatBytes = (bytes) =>
  bytes >= GB ? `${+(bytes / GB).toFixed(1)} GB` : bytes >= MB ? `${+(bytes / MB).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

/** Feature limits for an effective user tier: 'free' | 'pro' | 'enterprise'. */
export const planLimitsFor = (tier) => (tier === 'free' ? B2C_PLANS.free : ENTERPRISE_MEMBER_FEATURES);
