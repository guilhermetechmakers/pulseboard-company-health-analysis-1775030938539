-- PulseBoard: async analysis jobs for Generate Analysis (progress, logs, API polling).

create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  depth text not null default 'standard' check (depth in ('brief', 'standard', 'deep')),
  include_benchmarks boolean not null default false,
  consent_given boolean not null default false,
  send_to_email boolean not null default false,
  email text,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  report_id uuid references public.reports(id) on delete set null,
  result_payload jsonb not null default '{}'::jsonb,
  logs text[] not null default array[]::text[],
  error_message text
);

create index if not exists analysis_jobs_company_id_started_at_idx on public.analysis_jobs(company_id, started_at desc);
create index if not exists analysis_jobs_user_id_started_at_idx on public.analysis_jobs(user_id, started_at desc);
create index if not exists analysis_jobs_status_idx on public.analysis_jobs(status) where status in ('queued', 'running');

alter table public.analysis_jobs enable row level security;

drop policy if exists "analysis_jobs_select_owner" on public.analysis_jobs;
create policy "analysis_jobs_select_owner"
on public.analysis_jobs for select
using (
  exists (
    select 1 from public.companies c
    where c.id = analysis_jobs.company_id and c.user_id = auth.uid()
  )
);

drop policy if exists "analysis_jobs_insert_owner" on public.analysis_jobs;
create policy "analysis_jobs_insert_owner"
on public.analysis_jobs for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.companies c
    where c.id = analysis_jobs.company_id and c.user_id = auth.uid()
  )
);

drop policy if exists "analysis_jobs_update_owner" on public.analysis_jobs;
create policy "analysis_jobs_update_owner"
on public.analysis_jobs for update
using (
  exists (
    select 1 from public.companies c
    where c.id = analysis_jobs.company_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.companies c
    where c.id = analysis_jobs.company_id and c.user_id = auth.uid()
  )
);

comment on table public.analysis_jobs is 'Queued/running AI analysis jobs with progress logs for Generate Analysis UI.';
