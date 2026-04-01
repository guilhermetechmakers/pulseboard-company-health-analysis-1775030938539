-- PulseBoard: AI Analysis Engine — report lineage, consent, benchmarking flags, snapshots, products field.

alter table public.companies add column if not exists products text;

alter table public.reports add column if not exists initiated_by uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists analysis_depth text not null default 'standard';
alter table public.reports add column if not exists source_model text;
alter table public.reports add column if not exists benchmarking_enabled boolean not null default false;
alter table public.reports add column if not exists consent_recorded_at timestamptz;

create index if not exists reports_company_id_created_at_idx on public.reports(company_id, created_at desc);
create index if not exists reports_initiated_by_idx on public.reports(initiated_by);

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  label text not null default 'Snapshot',
  sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_snapshots_report_id_idx on public.report_snapshots(report_id, created_at desc);

alter table public.report_snapshots enable row level security;

drop policy if exists "report_snapshots_company_owner" on public.report_snapshots;
create policy "report_snapshots_company_owner"
on public.report_snapshots for all
using (
  exists (
    select 1 from public.reports r
    join public.companies c on c.id = r.company_id
    where r.id = report_snapshots.report_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.reports r
    join public.companies c on c.id = r.company_id
    where r.id = report_snapshots.report_id and c.user_id = auth.uid()
  )
);
