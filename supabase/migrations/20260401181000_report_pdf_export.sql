-- PulseBoard: PDF export jobs, company branding, asset links, and private storage buckets.

create table if not exists public.company_branding (
  company_id uuid primary key references public.companies(id) on delete cascade,
  logo_storage_path text,
  primary_color text not null default '#0B6AF7',
  secondary_color text not null default '#064FD6',
  font_family text not null default 'Inter',
  export_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists asset_links_company_id_idx on public.asset_links(company_id);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  initiated_by uuid references auth.users(id) on delete set null,
  export_params jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  progress integer not null default 0,
  storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint export_jobs_status_chk check (status in ('queued', 'processing', 'completed', 'failed')),
  constraint export_jobs_progress_chk check (progress >= 0 and progress <= 100)
);

create index if not exists export_jobs_company_created_idx on public.export_jobs(company_id, created_at desc);
create index if not exists export_jobs_report_id_idx on public.export_jobs(report_id);

alter table public.company_branding enable row level security;
alter table public.asset_links enable row level security;
alter table public.export_jobs enable row level security;

drop policy if exists "company_branding_owner_all" on public.company_branding;
create policy "company_branding_owner_all"
on public.company_branding for all
using (
  exists (select 1 from public.companies c where c.id = company_branding.company_id and c.user_id = auth.uid())
)
with check (
  exists (select 1 from public.companies c where c.id = company_branding.company_id and c.user_id = auth.uid())
);

drop policy if exists "asset_links_owner_all" on public.asset_links;
create policy "asset_links_owner_all"
on public.asset_links for all
using (
  exists (select 1 from public.companies c where c.id = asset_links.company_id and c.user_id = auth.uid())
)
with check (
  exists (select 1 from public.companies c where c.id = asset_links.company_id and c.user_id = auth.uid())
);

drop policy if exists "export_jobs_owner_select" on public.export_jobs;
create policy "export_jobs_owner_select"
on public.export_jobs for select
using (
  exists (select 1 from public.companies c where c.id = export_jobs.company_id and c.user_id = auth.uid())
);

-- Writes are performed by Edge Functions using the service role (bypasses RLS).

insert into storage.buckets (id, name, public)
values ('report-exports', 'report-exports', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', false)
on conflict (id) do nothing;

drop policy if exists "branding_assets_insert_owner" on storage.objects;
create policy "branding_assets_insert_owner"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'branding-assets'
  and exists (
    select 1 from public.companies c
    where c.user_id = auth.uid()
      and (storage.foldername(name))[1] = c.id::text
  )
);

drop policy if exists "branding_assets_select_owner" on storage.objects;
create policy "branding_assets_select_owner"
on storage.objects for select to authenticated
using (
  bucket_id = 'branding-assets'
  and exists (
    select 1 from public.companies c
    where c.user_id = auth.uid()
      and (storage.foldername(name))[1] = c.id::text
  )
);

drop policy if exists "branding_assets_update_owner" on storage.objects;
create policy "branding_assets_update_owner"
on storage.objects for update to authenticated
using (
  bucket_id = 'branding-assets'
  and exists (
    select 1 from public.companies c
    where c.user_id = auth.uid()
      and (storage.foldername(name))[1] = c.id::text
  )
)
with check (
  bucket_id = 'branding-assets'
  and exists (
    select 1 from public.companies c
    where c.user_id = auth.uid()
      and (storage.foldername(name))[1] = c.id::text
  )
);

drop policy if exists "branding_assets_delete_owner" on storage.objects;
create policy "branding_assets_delete_owner"
on storage.objects for delete to authenticated
using (
  bucket_id = 'branding-assets'
  and exists (
    select 1 from public.companies c
    where c.user_id = auth.uid()
      and (storage.foldername(name))[1] = c.id::text
  )
);
