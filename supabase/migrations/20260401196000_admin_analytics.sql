-- Admin analytics: account suspension, dedicated admin action audit trail.
-- Admins are identified by profiles.role = 'admin' (set manually or via secure process).

alter table public.profiles
  add column if not exists account_status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended'));

create index if not exists profiles_account_status_idx on public.profiles(account_status);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_created_at_idx on public.admin_actions(created_at desc);
create index if not exists admin_actions_admin_id_idx on public.admin_actions(admin_id);
create index if not exists admin_actions_target_user_id_idx on public.admin_actions(target_user_id);

alter table public.admin_actions enable row level security;
