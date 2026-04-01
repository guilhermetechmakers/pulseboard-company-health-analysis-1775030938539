-- Settings & Preferences: profile fields, workspace team (single-company), invites; extend account_status for deletion flow.

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists timezone text default 'UTC',
  add column if not exists language text default 'en',
  add column if not exists job_title text,
  add column if not exists preferred_communication_channel text default 'email';

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended', 'pending_deletion'));

create table if not exists public.workspace_teams (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  seats integer not null default 5,
  created_at timestamptz not null default now(),
  unique (company_id)
);

create index if not exists workspace_teams_owner_user_id_idx on public.workspace_teams (owner_user_id);

create table if not exists public.workspace_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.workspace_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists workspace_team_members_team_id_idx on public.workspace_team_members (team_id);

create table if not exists public.workspace_team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.workspace_teams(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  status text not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists workspace_team_invites_team_email_pending_idx
  on public.workspace_team_invites (team_id, lower(email))
  where status = 'pending';

create index if not exists workspace_team_invites_team_id_idx on public.workspace_team_invites (team_id);

alter table public.workspace_teams enable row level security;
alter table public.workspace_team_members enable row level security;
alter table public.workspace_team_invites enable row level security;

create policy if not exists "workspace_teams_owner_select"
on public.workspace_teams for select
using (owner_user_id = auth.uid());

create policy if not exists "workspace_teams_owner_insert"
on public.workspace_teams for insert
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1 from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
  )
);

create policy if not exists "workspace_teams_owner_update"
on public.workspace_teams for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy if not exists "workspace_teams_owner_delete"
on public.workspace_teams for delete
using (owner_user_id = auth.uid());

create policy if not exists "workspace_teams_member_select"
on public.workspace_teams for select
using (
  exists (
    select 1 from public.workspace_team_members m
    where m.team_id = workspace_teams.id and m.user_id = auth.uid()
  )
);

create policy if not exists "wtm_owner_all"
on public.workspace_team_members for all
using (
  exists (
    select 1 from public.workspace_teams t
    where t.id = team_id and t.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspace_teams t
    where t.id = team_id and t.owner_user_id = auth.uid()
  )
);

create policy if not exists "wtm_self_select"
on public.workspace_team_members for select
using (user_id = auth.uid());

create policy if not exists "wti_owner_all"
on public.workspace_team_invites for all
using (
  exists (
    select 1 from public.workspace_teams t
    where t.id = team_id and t.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspace_teams t
    where t.id = team_id and t.owner_user_id = auth.uid()
  )
);
