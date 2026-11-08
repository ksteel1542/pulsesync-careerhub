// Server-side source of truth for what can be bought and for how much.
// Reuses the frontend's pricing config so prices can't drift, but the client
// only ever sends a plan *name*; amounts are always looked up here.
import { B2C_PLANS, INSTITUTION_PLANS, BILLING_CYCLES } from '../../src/config/pricing.js';

export { BILLING_CYCLES };

export const PURCHASABLE_PLANS = {
  pro: { scope: 'user', name: 'PulseSync Pro', priceMonthly: B2C_PLANS.pro.priceMonthly },
  starter: { scope: 'institution', name: `PulseSync Institution: ${INSTITUTION_PLANS.starter.name}`, priceMonthly: INSTITUTION_PLANS.starter.priceMonthly },
  growth: { scope: 'institution', name: `PulseSync Institution: ${INSTITUTION_PLANS.growth.name}`, priceMonthly: INSTITUTION_PLANS.growth.priceMonthly },
  enterprise: { scope: 'institution', name: `PulseSync Institution: ${INSTITUTION_PLANS.enterprise.name}`, priceMonthly: INSTITUTION_PLANS.enterprise.priceMonthly },
};

/** Own-property lookup, so names like "__proto__" or "constructor" never resolve to built-ins. */
export const planFor = (tier) => (typeof tier === 'string' && Object.hasOwn(PURCHASABLE_PLANS, tier) ? PURCHASABLE_PLANS[tier] : null);

// Keys that must never be used as object property names for user/institution records
export const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Price in the smallest currency unit (cents / kobo), avoiding float drift. */
export const toMinorUnits = (amount) => Math.round(amount * 100);
