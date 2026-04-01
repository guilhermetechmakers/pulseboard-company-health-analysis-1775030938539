-- PulseBoard: Data import/export jobs, saved column mappings, per-import audit trail.
-- Idempotent; RLS aligned with single-company-per-user model.

create table if not exists public.company_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in (
    'queued', 'processing', 'completed', 'failed'
  )),
  rows_processed integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  mapping jsonb not null default '{}'::jsonb,
  file_name text not null default 'upload.csv',
  target_model text,
  progress numeric not null default 0 check (progress >= 0 and progress <= 100),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_imports_company_created_idx
  on public.company_imports(company_id, created_at desc);
create index if not exists company_imports_user_created_idx
  on public.company_imports(user_id, created_at desc);

create table if not exists public.company_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  scope jsonb not null default '{}'::jsonb,
  format text not null default 'csv' check (format in ('csv', 'xlsx')),
  status text not null default 'queued' check (status in (
    'queued', 'processing', 'completed', 'failed'
  )),
  progress numeric not null default 0 check (progress >= 0 and progress <= 100),
  fields_subset text[] not null default array[]::text[],
  result_csv text,
  result_size bigint,
  schedule_cadence text,
  error_message text,
  generated_at timestamptz,
  downloaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_exports_user_created_idx
  on public.company_exports(user_id, created_at desc);
create index if not exists company_exports_company_created_idx
  on public.company_exports(company_id, created_at desc);

create table if not exists public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  target_field text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_key, target_field)
);

create index if not exists import_mappings_user_idx on public.import_mappings(user_id);

create table if not exists public.import_audit (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.company_imports(id) on delete cascade,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_audit_import_idx on public.import_audit(import_id, created_at desc);

alter table public.company_imports enable row level security;
alter table public.company_exports enable row level security;
alter table public.import_mappings enable row level security;
alter table public.import_audit enable row level security;

drop policy if exists "company_imports_owner" on public.company_imports;
create policy "company_imports_owner"
on public.company_imports for all
using (
  exists (
    select 1 from public.companies c
    where c.id = company_imports.company_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.companies c
    where c.id = company_imports.company_id and c.user_id = auth.uid()
  )
  and user_id = auth.uid()
);

drop policy if exists "company_exports_owner" on public.company_exports;
create policy "company_exports_owner"
on public.company_exports for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "import_mappings_owner" on public.import_mappings;
create policy "import_mappings_owner"
on public.import_mappings for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "import_audit_via_import" on public.import_audit;
create policy "import_audit_via_import"
on public.import_audit for select
using (
  exists (
    select 1 from public.company_imports ci
    join public.companies c on c.id = ci.company_id
    where ci.id = import_audit.import_id and c.user_id = auth.uid()
  )
);

drop policy if exists "import_audit_no_client_insert" on public.import_audit;
-- Inserts happen from Edge Function with service role; authenticated users cannot insert directly.
create policy "import_audit_no_client_insert"
on public.import_audit for insert
with check (false);
