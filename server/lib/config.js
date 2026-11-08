import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
// Load server/.env regardless of the directory the process was started from
dotenv.config({ path: path.join(here, '..', '.env'), quiet: true });

function supabaseUrl() {
  const raw = (process.env.SUPABASE_URL || '').trim();
  if (!raw) return '';
  const url = new URL(raw); // fail fast on a malformed URL
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error('SUPABASE_URL must use https');
  }
  return url.origin;
}

function clientUrl() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  const url = new URL(raw); // throws on garbage, failing fast at startup
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('CLIENT_URL must be http(s)');
  return url.origin;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || '127.0.0.1',
  clientUrl: clientUrl(),
  defaultProvider: process.env.PAYMENT_PROVIDER === 'paystack' ? 'paystack' : 'stripe',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    planCodes: {
      pro: process.env.PAYSTACK_PLAN_PRO || '',
      starter: process.env.PAYSTACK_PLAN_STARTER || '',
      growth: process.env.PAYSTACK_PLAN_GROWTH || '',
      enterprise: process.env.PAYSTACK_PLAN_ENTERPRISE || '',
    },
  },
  supabase: {
    url: supabaseUrl(),
    // Secret / service-role key: server-only, bypasses RLS
    serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  },
};
