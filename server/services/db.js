// Supabase (PostgreSQL) data access for the payments server.
// Replaces the old server/data/subscriptions.json store.
//
// Uses the secret / service-role key, which bypasses RLS. It must only ever live
// on the server (server/.env), never in the frontend bundle.
// Schema: server/supabase/migrations/*.sql
import { createClient } from '@supabase/supabase-js';
import { config } from '../lib/config.js';

export class DatabaseNotConfiguredError extends Error {}
export class DatabaseError extends Error {}

let client = null;

export const isDatabaseConfigured = () => Boolean(config.supabase.url && config.supabase.serviceRoleKey);

function db() {
  if (!isDatabaseConfigured()) {
    throw new DatabaseNotConfiguredError('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  client ??= createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Throw a DatabaseError (details logged server-side, never sent to clients). */
function check({ data, error }, op) {
  if (error) {
    console.error(`[db] ${op} failed:`, error.message ?? error);
    throw new DatabaseError(`Database operation failed: ${op}`);
  }
  return data;
}

// DB rows are snake_case; the app speaks camelCase.
const toSubscription = (row) =>
  row && {
    tier: row.tier,
    billingCycle: row.billing_cycle,
    status: row.status,
    provider: row.provider,
    updatedAt: row.updated_at,
  };

const SUBSCRIPTION_COLUMNS = 'tier, billing_cycle, status, provider, updated_at';

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export async function getProfile(userId) {
  const row = check(
    await db().from('profiles').select('user_id, email, display_name, created_at, updated_at').eq('user_id', userId).maybeSingle(),
    'getProfile'
  );
  return row && { userId: row.user_id, email: row.email, displayName: row.display_name, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function upsertProfile({ userId, email, displayName = null }) {
  check(
    await db()
      .from('profiles')
      .upsert({ user_id: userId, email, display_name: displayName, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
    'upsertProfile'
  );
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
export async function getUserSubscription(userId) {
  return toSubscription(
    check(await db().from('user_subscriptions').select(SUBSCRIPTION_COLUMNS).eq('user_id', userId).maybeSingle(), 'getUserSubscription')
  );
}

export async function getInstitutionSubscription(institutionId) {
  return toSubscription(
    check(
      await db().from('institution_subscriptions').select(SUBSCRIPTION_COLUMNS).eq('institution_id', institutionId).maybeSingle(),
      'getInstitutionSubscription'
    )
  );
}

/**
 * Apply a verified payment event exactly once (atomic Postgres function).
 * @returns {Promise<boolean>} false if this provider event was already processed
 */
export async function applyEntitlement({ eventId, provider, scope, planTier, billingCycle, status = 'active', userId, userEmail, institutionId }) {
  const applied = check(
    await db().rpc('apply_entitlement', {
      p_event_id: eventId,
      p_provider: provider,
      p_scope: scope,
      p_tier: planTier,
      p_billing_cycle: billingCycle,
      p_status: status,
      p_user_id: userId,
      p_user_email: userEmail,
      p_institution_id: institutionId ?? null,
    }),
    'applyEntitlement'
  );
  return applied === true;
}
