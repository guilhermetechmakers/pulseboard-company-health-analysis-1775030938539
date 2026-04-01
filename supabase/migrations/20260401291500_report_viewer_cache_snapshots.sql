-- PulseBoard: Report Viewer — snapshot notes + TTL cache entries for analysis-scoped data.

alter table public.report_snapshots add column if not exists notes text;

create table if not exists public.report_cache_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  cache_key text not null,
  value jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_cache_entries_key_len check (char_length(cache_key) between 1 and 256)
);

create unique index if not exists report_cache_entries_report_key_uidx
  on public.report_cache_entries (report_id, cache_key);

create index if not exists report_cache_entries_expires_idx
  on public.report_cache_entries (expires_at);

alter table public.report_cache_entries enable row level security;

drop policy if exists "report_cache_entries_owner" on public.report_cache_entries;
create policy "report_cache_entries_owner"
on public.report_cache_entries for all
using (
  exists (
    select 1 from public.reports r
    join public.companies c on c.id = r.company_id
    where r.id = report_cache_entries.report_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.reports r
    join public.companies c on c.id = r.company_id
    where r.id = report_cache_entries.report_id and c.user_id = auth.uid()
  )
);
