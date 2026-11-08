import express from 'express';
import { PURCHASABLE_PLANS, BILLING_CYCLES, planFor, RESERVED_KEYS } from '../lib/plans.js';
import { providers, WebhookSignatureError, ProviderNotConfiguredError } from '../lib/providers.js';
import { applyEntitlement, getUserSubscription, getInstitutionSubscription } from '../lib/store.js';
import { config } from '../lib/config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[A-Za-z0-9@._+-]{1,128}$/;
const isId = (v) => typeof v === 'string' && ID_RE.test(v) && !RESERVED_KEYS.has(v);
const providerFor = (name) => (typeof name === 'string' && Object.hasOwn(providers, name) ? providers[name] : null);

/** Validate and normalize the checkout request body. Returns { order } or { error }. */
function validateCheckout(body) {
  const { planTier, billingCycle, userId, userEmail, institutionId, provider } = body ?? {};
  const plan = planFor(planTier);
  if (!plan) return { error: `planTier must be one of: ${Object.keys(PURCHASABLE_PLANS).join(', ')}` };
  if (!BILLING_CYCLES.includes(billingCycle)) return { error: `billingCycle must be one of: ${BILLING_CYCLES.join(', ')}` };
  if (!isId(userId)) return { error: 'userId is required' };
  if (typeof userEmail !== 'string' || !EMAIL_RE.test(userEmail) || userEmail.length > 254) return { error: 'A valid userEmail is required' };
  if (plan.scope === 'institution' && !isId(institutionId)) {
    return { error: 'institutionId is required for institution plans' };
  }
  const providerName = provider ?? config.defaultProvider;
  if (!providerFor(providerName)) return { error: 'provider must be stripe or paystack' };
  return {
    order: {
      plan,
      planTier,
      billingCycle,
      scope: plan.scope,
      userId,
      userEmail: userEmail.toLowerCase(),
      institutionId: plan.scope === 'institution' ? institutionId : null,
      provider: providerName,
    },
  };
}

export function paymentsRouter() {
  const router = express.Router();

  // POST /api/payments/create-checkout → { checkoutUrl, sessionId, provider }
  router.post('/create-checkout', express.json({ limit: '10kb' }), async (req, res) => {
    const { order, error } = validateCheckout(req.body);
    if (error) return res.status(400).json({ error });
    try {
      const { checkoutUrl, sessionId } = await providerFor(order.provider).createCheckout(order);
      return res.json({ checkoutUrl, sessionId, provider: order.provider });
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError) return res.status(503).json({ error: err.message });
      // Log details server-side only; provider errors can include account info
      console.error(`[payments] ${order.provider} checkout failed:`, err.response?.data ?? err.message);
      return res.status(502).json({ error: 'Could not start checkout. Please try again.' });
    }
  });

  // POST /api/payments/webhook (Stripe: checkout.session.completed / customer.subscription.deleted, Paystack: charge.success)
  // Needs the raw body for signature verification, so it must not go through express.json().
  router.post('/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    const provider = req.headers['stripe-signature'] ? providers.stripe : req.headers['x-paystack-signature'] ? providers.paystack : null;
    if (!provider) return res.status(400).json({ error: 'Missing webhook signature' });
    if (!provider.webhookConfigured()) return res.status(503).json({ error: 'Webhook secret not configured' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Empty body' });

    let entitlement;
    try {
      entitlement = provider.parseWebhook(req.body, req.headers);
    } catch (err) {
      if (err instanceof WebhookSignatureError) return res.status(400).json({ error: 'Invalid signature' });
      console.error('[payments] webhook parse error:', err.message);
      return res.status(400).json({ error: 'Malformed event' });
    }

    if (!entitlement) return res.json({ received: true, ignored: true }); // event type we don't act on
    const validTarget = isId(entitlement.userId) && (entitlement.scope !== 'institution' || isId(entitlement.institutionId));
    if ((!planFor(entitlement.planTier) && entitlement.planTier !== 'free') || !validTarget) {
      return res.json({ received: true, ignored: true });
    }
    try {
      const applied = await applyEntitlement(entitlement);
      return res.json({ received: true, applied });
    } catch (err) {
      console.error('[payments] failed to persist entitlement:', err);
      return res.status(500).json({ error: 'Persist failed' }); // non-2xx → provider retries
    }
  });

  // GET /api/payments/subscription?userId=… | ?institutionId=…  (read-only status for the client)
  router.get('/subscription', async (req, res) => {
    const { userId, institutionId } = req.query;
    if (isId(userId)) return res.json({ subscription: await getUserSubscription(userId) });
    if (isId(institutionId)) {
      return res.json({ subscription: await getInstitutionSubscription(institutionId) });
    }
    return res.status(400).json({ error: 'userId or institutionId is required' });
  });

  return router;
}
