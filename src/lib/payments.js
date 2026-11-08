import { DEFAULT_BILLING_CYCLE } from '../config/pricing';

// Hosts we will ever redirect a user to for payment. Guards against an open
// redirect if the API (or anything in between) returns an unexpected URL.
const CHECKOUT_HOSTS = ['checkout.stripe.com', 'checkout.paystack.com'];

/**
 * Ask the server to create a hosted checkout session and send the browser there.
 * The server decides the price; we only send which plan was chosen.
 * Resolves only if redirecting; rejects with a user-readable Error otherwise.
 */
export async function startCheckout({ planTier, userId, userEmail, institutionId, billingCycle = DEFAULT_BILLING_CYCLE }) {
  let res;
  try {
    res = await fetch('/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier, billingCycle, userId, userEmail, institutionId }),
    });
  } catch {
    throw new Error('Can’t reach the payments server. Is it running? (cd server && npm run dev)');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON (e.g. proxy error page) */
  }
  if (!res.ok) {
    if (res.status === 503) throw new Error(`Payments aren’t configured yet: ${data?.error ?? 'missing provider keys'}`);
    if (res.status >= 500 && !data) throw new Error('Can’t reach the payments server. Is it running? (cd server && npm run dev)');
    throw new Error(data?.error ?? `Checkout failed (${res.status}).`);
  }

  let url;
  try {
    url = new URL(data?.checkoutUrl);
  } catch {
    throw new Error('Payments server returned an invalid checkout link.');
  }
  if (url.protocol !== 'https:' || !CHECKOUT_HOSTS.includes(url.hostname)) {
    throw new Error('Payments server returned an unexpected checkout link. Not redirecting.');
  }
  window.location.assign(url.href);
}

/** Read and clear ?checkout=success|cancelled after returning from the provider. */
export function consumeCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('checkout');
  if (status !== 'success' && status !== 'cancelled') return null;
  ['checkout', 'session_id', 'provider', 'reference', 'trxref'].forEach((k) => params.delete(k));
  const qs = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  return status;
}
