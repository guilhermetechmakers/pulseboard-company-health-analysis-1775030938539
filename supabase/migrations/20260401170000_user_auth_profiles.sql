-- PulseBoard user profiles, subscriptions, activity logs, and signup trigger.
-- Email verification and password reset tokens are managed by Supabase Auth (auth schema).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'founder',
  plan_tier text not null default 'starter',
  signup_origin text,
  privacy_consent_at timestamptz,
  last_context_company_id uuid references public.companies(id) on delete set null,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  status text not null default 'trialing',
  next_billing_date timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Audit tables for flows that mirror the product spec (tokens live in Supabase Auth).
create table if not exists public.email_verification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.password_reset_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  event_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_mfa_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  factor_id text,
  recovery_codes_remaining integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists user_activity_logs_user_id_idx on public.user_activity_logs(user_id);
create index if not exists user_activity_logs_created_at_idx on public.user_activity_logs(created_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_activity_logs enable row level security;
alter table public.email_verification_events enable row level security;
alter table public.password_reset_events enable row level security;
alter table public.user_mfa_settings enable row level security;

create policy if not exists "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy if not exists "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy if not exists "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy if not exists "subscriptions_select_own"
on public.subscriptions for select
using (auth.uid() = user_id);

create policy if not exists "subscriptions_update_own"
on public.subscriptions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "subscriptions_insert_own"
on public.subscriptions for insert
with check (auth.uid() = user_id);

create policy if not exists "user_activity_logs_select_own"
on public.user_activity_logs for select
using (auth.uid() = user_id);

create policy if not exists "user_activity_logs_insert_own"
on public.user_activity_logs for insert
with check (auth.uid() = user_id);

create policy if not exists "email_verification_events_select_own"
on public.email_verification_events for select
using (auth.uid() = user_id);

create policy if not exists "email_verification_events_insert_own"
on public.email_verification_events for insert
with check (auth.uid() = user_id);

create policy if not exists "password_reset_events_select_own"
on public.password_reset_events for select
using (auth.uid() = user_id);

create policy if not exists "user_mfa_settings_select_own"
on public.user_mfa_settings for select
using (auth.uid() = user_id);

create policy if not exists "user_mfa_settings_upsert_own"
on public.user_mfa_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, role, plan_tier, signup_origin, privacy_consent_at)
  values (
    new.id,
    nullif(trim(coalesce(meta->>'display_name', '')), ''),
    coalesce(nullif(trim(meta->>'role'), ''), 'founder'),
    coalesce(nullif(trim(meta->>'plan_tier'), ''), 'starter'),
    nullif(trim(coalesce(meta->>'signup_origin', '')), ''),
    case when (meta->>'privacy_consent') = 'true' then now() else null end
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan_id, status)
  values (
    new.id,
    coalesce(nullif(trim(meta->>'plan_tier'), ''), 'starter') || '_plan',
    'trialing'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();
