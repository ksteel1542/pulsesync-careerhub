-- PulseSync: profiles, subscriptions and webhook idempotency.
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- All tables have RLS enabled with NO policies: only the server's secret
-- (service-role) key can read or write them. Browsers never talk to these tables.

-- ---------------------------------------------------------------------------
-- Profiles (one row per app user; user_id is the app's user id, currently email)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id      text primary key check (char_length(user_id) between 1 and 128),
  email        text not null check (char_length(email) <= 254),
  display_name text check (char_length(display_name) <= 120),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Individual (B2C) subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.user_subscriptions (
  user_id       text primary key references public.profiles(user_id) on delete cascade,
  tier          text not null check (tier in ('free', 'pro')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly')),
  status        text not null default 'active' check (status in ('active', 'cancelled')),
  provider      text check (provider in ('stripe', 'paystack')),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Institutional (B2B) subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.institution_subscriptions (
  institution_id  text primary key check (char_length(institution_id) between 1 and 128),
  tier            text not null check (tier in ('starter', 'growth', 'enterprise')),
  billing_cycle   text not null default 'monthly' check (billing_cycle in ('monthly')),
  status          text not null default 'active' check (status in ('active', 'cancelled')),
  provider        text check (provider in ('stripe', 'paystack')),
  billing_contact text check (char_length(billing_contact) <= 254),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Webhook idempotency: a provider event is applied at most once
-- ---------------------------------------------------------------------------
create table if not exists public.processed_webhook_events (
  event_id     text primary key check (char_length(event_id) <= 255),
  provider     text not null check (provider in ('stripe', 'paystack')),
  processed_at timestamptz not null default now()
);

alter table public.profiles                  enable row level security;
alter table public.user_subscriptions        enable row level security;
alter table public.institution_subscriptions enable row level security;
alter table public.processed_webhook_events  enable row level security;

-- Explicit server privileges (don't rely on project default grants).
grant select, insert, update, delete on
  public.profiles, public.user_subscriptions, public.institution_subscriptions, public.processed_webhook_events
  to service_role;

-- ---------------------------------------------------------------------------
-- apply_entitlement: record the event and update the plan in ONE transaction.
-- Returns false if the event was already processed (duplicate delivery).
-- Any error rolls back the event row too, so the provider's retry can succeed.
-- ---------------------------------------------------------------------------
create or replace function public.apply_entitlement(
  p_event_id       text,
  p_provider       text,
  p_scope          text,
  p_tier           text,
  p_billing_cycle  text,
  p_status         text,
  p_user_id        text,
  p_user_email     text,
  p_institution_id text
) returns boolean
language plpgsql
set search_path = public
as $$
declare
  inserted integer;
begin
  insert into processed_webhook_events (event_id, provider)
  values (p_event_id, p_provider)
  on conflict (event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return false;
  end if;

  if p_scope = 'user' then
    insert into profiles (user_id, email)
    values (p_user_id, p_user_email)
    on conflict (user_id) do update set email = excluded.email, updated_at = now();

    insert into user_subscriptions (user_id, tier, billing_cycle, status, provider, updated_at)
    values (p_user_id, p_tier, p_billing_cycle, p_status, p_provider, now())
    on conflict (user_id) do update set
      tier = excluded.tier,
      billing_cycle = excluded.billing_cycle,
      status = excluded.status,
      provider = excluded.provider,
      updated_at = now();

  elsif p_scope = 'institution' then
    if p_institution_id is null or p_institution_id = '' then
      raise exception 'institution_id is required for institution scope';
    end if;
    insert into institution_subscriptions (institution_id, tier, billing_cycle, status, provider, billing_contact, updated_at)
    values (p_institution_id, p_tier, p_billing_cycle, p_status, p_provider, p_user_email, now())
    on conflict (institution_id) do update set
      tier = excluded.tier,
      billing_cycle = excluded.billing_cycle,
      status = excluded.status,
      provider = excluded.provider,
      billing_contact = excluded.billing_contact,
      updated_at = now();

  else
    raise exception 'invalid scope: %', p_scope;
  end if;

  return true;
end;
$$;

-- Only the server (service role) may call it; never browsers.
revoke all on function public.apply_entitlement(text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_entitlement(text, text, text, text, text, text, text, text, text) to service_role;
