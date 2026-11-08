// Payment provider adapters. Each exposes:
//   isConfigured()            → whether the needed secrets are present
//   createCheckout(order)     → { checkoutUrl, sessionId }
//   parseWebhook(rawBody, headers) → normalized entitlement event, or null to ignore
// parseWebhook throws a WebhookSignatureError when the signature doesn't verify.
import crypto from 'node:crypto';
import Stripe from 'stripe';
import axios from 'axios';
import { config } from './config.js';
import { toMinorUnits } from './plans.js';

export class WebhookSignatureError extends Error {}
export class ProviderNotConfiguredError extends Error {}

const successUrl = (provider) => `${config.clientUrl}/?checkout=success&provider=${provider}`;
const cancelUrl = () => `${config.clientUrl}/?checkout=cancelled`;

/** Metadata we attach to every checkout and read back from webhooks. All values strings. */
const metadataFor = (o) => ({
  planTier: o.planTier,
  billingCycle: o.billingCycle,
  scope: o.scope,
  userId: o.userId,
  userEmail: o.userEmail,
  institutionId: o.institutionId ?? '',
});

function entitlementFrom(meta, { eventId, provider, status = 'active' }) {
  if (!meta?.planTier || !meta?.scope || !meta?.userId) return null; // not one of our checkouts
  return {
    eventId,
    provider,
    status,
    scope: meta.scope,
    planTier: status === 'active' ? meta.planTier : meta.scope === 'user' ? 'free' : meta.planTier,
    billingCycle: meta.billingCycle,
    userId: meta.userId,
    userEmail: meta.userEmail,
    institutionId: meta.institutionId || null,
  };
}

// ---------------------------------------------------------------------------
// Stripe: Checkout Session in subscription mode
// ---------------------------------------------------------------------------
let stripeClient = null;
const stripe = () => (stripeClient ??= new Stripe(config.stripe.secretKey));

export const stripeProvider = {
  isConfigured: () => Boolean(config.stripe.secretKey),
  webhookConfigured: () => Boolean(config.stripe.secretKey && config.stripe.webhookSecret),

  async createCheckout(o) {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError('Stripe is not configured (STRIPE_SECRET_KEY).');
    const metadata = metadataFor(o);
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer_email: o.userEmail,
      client_reference_id: o.userId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: toMinorUnits(o.plan.priceMonthly),
            recurring: { interval: 'month' },
            product_data: { name: o.plan.name },
          },
        },
      ],
      metadata,
      subscription_data: { metadata }, // so later subscription events carry it too
      success_url: `${successUrl('stripe')}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl(),
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  },

  parseWebhook(rawBody, headers) {
    let event;
    try {
      event = stripe().webhooks.constructEvent(rawBody, headers['stripe-signature'], config.stripe.webhookSecret);
    } catch {
      throw new WebhookSignatureError('Invalid Stripe signature');
    }
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed') {
      if (obj.payment_status !== 'paid' && obj.payment_status !== 'no_payment_required') return null;
      return entitlementFrom(obj.metadata, { eventId: event.id, provider: 'stripe' });
    }
    if (event.type === 'customer.subscription.deleted') {
      // Cancellation: drop users back to Free; mark institution plans cancelled
      return entitlementFrom(obj.metadata, { eventId: event.id, provider: 'stripe', status: 'cancelled' });
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// Paystack: transaction/initialize against a dashboard Plan (subscription)
// ---------------------------------------------------------------------------
export const paystackProvider = {
  isConfigured: () => Boolean(config.paystack.secretKey),
  webhookConfigured: () => Boolean(config.paystack.secretKey),

  async createCheckout(o) {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError('Paystack is not configured (PAYSTACK_SECRET_KEY).');
    const planCode = Object.hasOwn(config.paystack.planCodes, o.planTier) ? config.paystack.planCodes[o.planTier] : '';
    if (!planCode) throw new ProviderNotConfiguredError(`Paystack plan code for "${o.planTier}" is not configured.`);

    const reference = `ps_${o.planTier}_${crypto.randomUUID()}`;
    const { data } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: o.userEmail,
        amount: toMinorUnits(o.plan.priceMonthly), // overridden by the plan's own amount/currency
        plan: planCode,
        reference,
        callback_url: successUrl('paystack'),
        metadata: { ...metadataFor(o), cancel_action: cancelUrl() },
      },
      { headers: { Authorization: `Bearer ${config.paystack.secretKey}` }, timeout: 15000 }
    );
    if (!data?.status || !data.data?.authorization_url) throw new Error('Paystack did not return an authorization URL');
    return { checkoutUrl: data.data.authorization_url, sessionId: reference };
  },

  parseWebhook(rawBody, headers) {
    const signature = String(headers['x-paystack-signature'] || '');
    const expected = crypto.createHmac('sha512', config.paystack.secretKey).update(rawBody).digest('hex');
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new WebhookSignatureError('Invalid Paystack signature');

    const event = JSON.parse(rawBody.toString('utf8'));
    if (event.event !== 'charge.success' || event.data?.status !== 'success') return null;
    let meta = event.data.metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = null;
      }
    }
    // Paystack has no global event id; the transaction reference is unique per charge
    return entitlementFrom(meta, { eventId: `paystack:${event.data.reference}`, provider: 'paystack' });
  },
};

export const providers = { stripe: stripeProvider, paystack: paystackProvider };
