create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  industry text,
  stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists companies_user_id_unique on public.companies(user_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'queued',
  executive_summary text,
  swot jsonb not null default '{}'::jsonb,
  financial_analysis text,
  market_analysis text,
  social_analysis text,
  risks jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  action_plan jsonb not null default '[]'::jsonb,
  health_scores jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  encrypted_payload text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, provider)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.reports enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.audit_logs enable row level security;

create policy if not exists "users_manage_own_company"
on public.companies for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "users_manage_own_reports"
on public.reports for all
using (exists (
  select 1 from public.companies c
  where c.id = reports.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = reports.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_integrations"
on public.integration_credentials for all
using (exists (
  select 1 from public.companies c
  where c.id = integration_credentials.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = integration_credentials.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_read_own_audit_logs"
on public.audit_logs for select
using (actor_user_id = auth.uid());
