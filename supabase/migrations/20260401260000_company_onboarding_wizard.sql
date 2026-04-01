-- PulseBoard: onboarding wizard drafts, analysis history, admin consolidations,
-- products_services array, onboarding_complete flag. Idempotent.

alter table public.companies
  add column if not exists onboarding_complete boolean not null default false;

alter table public.companies
  add column if not exists products_services text[] not null default '{}'::text[];

create table if not exists public.onboarding_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  step integer not null default 1,
  last_saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists onboarding_drafts_user_id_idx on public.onboarding_drafts (user_id);

create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  run_at timestamptz not null default now(),
  summary text not null default '',
  details jsonb not null default '{}'::jsonb,
  report_id uuid references public.reports(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists analysis_history_company_run_idx
  on public.analysis_history (company_id, run_at desc);

create table if not exists public.admin_consolidations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_company_id uuid not null references public.companies(id) on delete cascade,
  target_company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'pending',
  dry_run boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_consolidations_user_idx on public.admin_consolidations (user_id);

-- Users with more than one company (legacy / constraint bypass); empty when unique(user_id) holds.
create or replace view public.v_users_multiple_companies as
select
  c.user_id,
  count(*)::integer as company_count,
  array_agg(c.id order by c.created_at asc) as company_ids
from public.companies c
group by c.user_id
having count(*) > 1;

alter table public.onboarding_drafts enable row level security;
alter table public.analysis_history enable row level security;
alter table public.admin_consolidations enable row level security;

create policy if not exists "onboarding_drafts_select_own"
on public.onboarding_drafts for select
using (auth.uid() = user_id);

create policy if not exists "onboarding_drafts_insert_own"
on public.onboarding_drafts for insert
with check (auth.uid() = user_id);

create policy if not exists "onboarding_drafts_update_own"
on public.onboarding_drafts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "onboarding_drafts_delete_own"
on public.onboarding_drafts for delete
using (auth.uid() = user_id);

create policy if not exists "analysis_history_select_via_company"
on public.analysis_history for select
using (
  exists (
    select 1 from public.companies co
    where co.id = analysis_history.company_id and co.user_id = auth.uid()
  )
);

create policy if not exists "analysis_history_insert_via_company"
on public.analysis_history for insert
with check (
  exists (
    select 1 from public.companies co
    where co.id = analysis_history.company_id and co.user_id = auth.uid()
  )
);

-- No client policies for admin_consolidations — service role / Edge Functions only.
