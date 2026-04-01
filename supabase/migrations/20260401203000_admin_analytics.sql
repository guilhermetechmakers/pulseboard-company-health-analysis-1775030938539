-- Admin analytics: profile fields for admin UX, audit table for admin actions, trigger updates.

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists account_status text not null default 'active';

alter table public.profiles
  add column if not exists last_login_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended'));

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_account_status_idx on public.profiles (account_status);
create index if not exists profiles_email_lower_idx on public.profiles (lower(email));

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_created_at_idx on public.admin_actions (created_at desc);
create index if not exists admin_actions_admin_id_idx on public.admin_actions (admin_id);
create index if not exists admin_actions_target_user_id_idx on public.admin_actions (target_user_id);

alter table public.admin_actions enable row level security;

-- No client policies: reads/writes only via service role (Edge Functions).

create or replace function public.sync_profile_fields_from_auth()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.profiles p
  set
    email = coalesce(nullif(trim(u.email), ''), p.email),
    last_login_at = coalesce(u.last_sign_in_at, p.last_login_at)
  from auth.users u
  where u.id = p.id;
end;
$$;

select public.sync_profile_fields_from_auth();

revoke all on function public.sync_profile_fields_from_auth() from public;
grant execute on function public.sync_profile_fields_from_auth() to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id,
    display_name,
    role,
    plan_tier,
    signup_origin,
    privacy_consent_at,
    email,
    account_status,
    last_login_at
  )
  values (
    new.id,
    nullif(trim(coalesce(meta->>'display_name', '')), ''),
    coalesce(nullif(trim(meta->>'role'), ''), 'founder'),
    coalesce(nullif(trim(meta->>'plan_tier'), ''), 'starter'),
    nullif(trim(coalesce(meta->>'signup_origin', '')), ''),
    case when (meta->>'privacy_consent') = 'true' then now() else null end,
    nullif(trim(coalesce(new.email, '')), ''),
    'active',
    new.last_sign_in_at
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    last_login_at = coalesce(excluded.last_login_at, public.profiles.last_login_at),
    updated_at = now();

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
