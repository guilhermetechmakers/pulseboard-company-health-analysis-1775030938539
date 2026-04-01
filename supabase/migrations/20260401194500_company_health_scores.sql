-- PulseBoard: persisted health score history per company + optional input snapshots for restore.

create table if not exists public.company_health_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  scored_at timestamptz not null default now(),
  overall numeric(6, 2) not null,
  financial numeric(6, 2),
  market numeric(6, 2),
  brand_social numeric(6, 2),
  benchmarks jsonb not null default '{}'::jsonb,
  notes text,
  source text not null default 'rules',
  constraint company_health_scores_overall_range check (overall >= 0 and overall <= 100),
  constraint company_health_scores_financial_range check (financial is null or (financial >= 0 and financial <= 100)),
  constraint company_health_scores_market_range check (market is null or (market >= 0 and market <= 100)),
  constraint company_health_scores_brand_range check (brand_social is null or (brand_social >= 0 and brand_social <= 100))
);

create index if not exists company_health_scores_company_scored_idx
  on public.company_health_scores(company_id, scored_at desc);

create index if not exists company_health_scores_report_id_idx
  on public.company_health_scores(report_id)
  where report_id is not null;

alter table public.company_health_scores enable row level security;

drop policy if exists "company_health_scores_owner" on public.company_health_scores;
create policy "company_health_scores_owner"
on public.company_health_scores for all
using (
  exists (
    select 1 from public.companies c
    where c.id = company_health_scores.company_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.companies c
    where c.id = company_health_scores.company_id and c.user_id = auth.uid()
  )
);

create table if not exists public.company_input_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  label text not null default 'Snapshot',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists company_input_snapshots_company_idx
  on public.company_input_snapshots(company_id, created_at desc);

alter table public.company_input_snapshots enable row level security;

drop policy if exists "company_input_snapshots_owner" on public.company_input_snapshots;
create policy "company_input_snapshots_owner"
on public.company_input_snapshots for all
using (
  exists (
    select 1 from public.companies c
    where c.id = company_input_snapshots.company_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.companies c
    where c.id = company_input_snapshots.company_id and c.user_id = auth.uid()
  )
);
