-- PulseBoard: Report Viewer — per-section audit trail (mirrors narrative columns on `reports`).

create table if not exists public.report_section_contents (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  section_key text not null,
  content text not null default '',
  edited_at timestamptz not null default now(),
  author_id uuid references auth.users(id) on delete set null,
  unique (report_id, section_key)
);

create index if not exists report_section_contents_report_id_idx
  on public.report_section_contents (report_id, section_key);

alter table public.report_section_contents enable row level security;

drop policy if exists "report_section_contents_company_owner" on public.report_section_contents;
create policy "report_section_contents_company_owner"
on public.report_section_contents for all
using (
  exists (
    select 1 from public.reports r
    join public.companies c on c.id = r.company_id
    where r.id = report_section_contents.report_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.reports r
    join public.companies c on c.id = r.company_id
    where r.id = report_section_contents.report_id and c.user_id = auth.uid()
  )
);
