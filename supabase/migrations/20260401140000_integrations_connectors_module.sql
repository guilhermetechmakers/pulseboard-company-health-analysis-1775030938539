-- PulseBoard: Integrations & Connectors — companies extensions, integrations metadata,
-- sync jobs, data snapshots, domain tables (financials, analytics, social, billing), CSV uploads.
-- Idempotent where possible; RLS aligned with single-company-per-user model.

-- ---------------------------------------------------------------------------
-- Companies: profile fields for workspace / health UI
-- ---------------------------------------------------------------------------
alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists business_model text;
alter table public.companies add column if not exists target_customer text;
alter table public.companies add column if not exists goals text;
alter table public.companies add column if not exists health_scores jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Integrations (connection metadata; tokens remain in integration_credentials)
-- ---------------------------------------------------------------------------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected' check (status in (
    'disconnected', 'connecting', 'connected', 'error', 'syncing'
  )),
  scopes text,
  cadence text not null default 'daily' check (cadence in ('hourly', 'daily', 'manual')),
  last_synced_at timestamptz,
  next_sync_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, provider)
);

create index if not exists integrations_company_id_idx on public.integrations(company_id);
create index if not exists integrations_next_sync_idx on public.integrations(next_sync_at) where next_sync_at is not null;

-- Link credentials row to integration metadata (nullable for legacy rows)
alter table public.integration_credentials add column if not exists integration_id uuid unique
  references public.integrations(id) on delete cascade;

-- Backfill integrations + integration_id from existing credentials
insert into public.integrations (company_id, provider, status, updated_at)
select ic.company_id, ic.provider, 'connected', ic.updated_at
from public.integration_credentials ic
where not exists (
  select 1 from public.integrations i
  where i.company_id = ic.company_id and i.provider = ic.provider
)
on conflict (company_id, provider) do nothing;

update public.integration_credentials ic
set integration_id = i.id
from public.integrations i
where ic.company_id = i.company_id
  and ic.provider = i.provider
  and ic.integration_id is null;

-- ---------------------------------------------------------------------------
-- Sync jobs
-- ---------------------------------------------------------------------------
create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  provider text not null,
  status text not null default 'queued' check (status in (
    'queued', 'running', 'succeeded', 'failed', 'cancelled'
  )),
  started_at timestamptz,
  completed_at timestamptz,
  records_synced integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sync_jobs_company_id_idx on public.sync_jobs(company_id);
create index if not exists sync_jobs_integration_id_idx on public.sync_jobs(integration_id);
create index if not exists sync_jobs_created_at_idx on public.sync_jobs(created_at desc);

-- ---------------------------------------------------------------------------
-- Data snapshots (raw / normalized connector payloads)
-- ---------------------------------------------------------------------------
create table if not exists public.data_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  snapshot_type text not null default 'full',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists data_snapshots_company_provider_idx on public.data_snapshots(company_id, provider, created_at desc);

-- ---------------------------------------------------------------------------
-- Domain aggregates (one row per company; idempotent upserts from connectors)
-- ---------------------------------------------------------------------------
create table if not exists public.company_financials (
  company_id uuid primary key references public.companies(id) on delete cascade,
  revenue numeric,
  expenses numeric,
  profit numeric,
  assets numeric,
  liabilities numeric,
  cash numeric,
  debt numeric,
  per_month_metrics jsonb not null default '[]'::jsonb,
  reconciliation_status text,
  source_provider text,
  updated_at timestamptz not null default now()
);

create table if not exists public.company_analytics (
  company_id uuid primary key references public.companies(id) on delete cascade,
  sessions integer,
  users integer,
  pageviews integer,
  bounce_rate numeric,
  engagement_metrics jsonb not null default '{}'::jsonb,
  traffic_sources jsonb not null default '[]'::jsonb,
  device_breakdown jsonb not null default '[]'::jsonb,
  geo_breakdown jsonb not null default '[]'::jsonb,
  source_provider text,
  updated_at timestamptz not null default now()
);

create table if not exists public.company_social (
  company_id uuid primary key references public.companies(id) on delete cascade,
  followers integer,
  engagement_rate numeric,
  posts_count integer,
  impressions integer,
  clicks integer,
  website_traffic integer,
  brand_mentions jsonb not null default '[]'::jsonb,
  post_metrics jsonb not null default '[]'::jsonb,
  source_provider text,
  updated_at timestamptz not null default now()
);

create table if not exists public.company_billing (
  company_id uuid primary key references public.companies(id) on delete cascade,
  subscriptions jsonb not null default '[]'::jsonb,
  invoices jsonb not null default '[]'::jsonb,
  payments jsonb not null default '[]'::jsonb,
  customer_balance numeric,
  plan_metadata jsonb not null default '{}'::jsonb,
  source_provider text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CSV uploads
-- ---------------------------------------------------------------------------
create table if not exists public.csv_uploads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  file_name text not null,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'completed', 'failed'
  )),
  rows_processed integer not null default 0,
  target_model text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists csv_uploads_company_id_idx on public.csv_uploads(company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Market data (competitors etc.) — optional structured store for CSV / forms
-- ---------------------------------------------------------------------------
create table if not exists public.company_market_data (
  company_id uuid primary key references public.companies(id) on delete cascade,
  competitors jsonb not null default '[]'::jsonb,
  pricing_matrix jsonb not null default '[]'::jsonb,
  trends jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  threats jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.integrations enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.data_snapshots enable row level security;
alter table public.company_financials enable row level security;
alter table public.company_analytics enable row level security;
alter table public.company_social enable row level security;
alter table public.company_billing enable row level security;
alter table public.csv_uploads enable row level security;
alter table public.company_market_data enable row level security;

drop policy if exists "integrations_company_owner" on public.integrations;
create policy "integrations_company_owner"
on public.integrations for all
using (exists (
  select 1 from public.companies c
  where c.id = integrations.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = integrations.company_id and c.user_id = auth.uid()
));

drop policy if exists "sync_jobs_company_owner" on public.sync_jobs;
create policy "sync_jobs_company_owner"
on public.sync_jobs for all
using (exists (
  select 1 from public.companies c
  where c.id = sync_jobs.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = sync_jobs.company_id and c.user_id = auth.uid()
));

drop policy if exists "data_snapshots_company_owner" on public.data_snapshots;
create policy "data_snapshots_company_owner"
on public.data_snapshots for all
using (exists (
  select 1 from public.companies c
  where c.id = data_snapshots.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = data_snapshots.company_id and c.user_id = auth.uid()
));

drop policy if exists "company_financials_owner" on public.company_financials;
create policy "company_financials_owner"
on public.company_financials for all
using (exists (
  select 1 from public.companies c
  where c.id = company_financials.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = company_financials.company_id and c.user_id = auth.uid()
));

drop policy if exists "company_analytics_owner" on public.company_analytics;
create policy "company_analytics_owner"
on public.company_analytics for all
using (exists (
  select 1 from public.companies c
  where c.id = company_analytics.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = company_analytics.company_id and c.user_id = auth.uid()
));

drop policy if exists "company_social_owner" on public.company_social;
create policy "company_social_owner"
on public.company_social for all
using (exists (
  select 1 from public.companies c
  where c.id = company_social.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = company_social.company_id and c.user_id = auth.uid()
));

drop policy if exists "company_billing_owner" on public.company_billing;
create policy "company_billing_owner"
on public.company_billing for all
using (exists (
  select 1 from public.companies c
  where c.id = company_billing.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = company_billing.company_id and c.user_id = auth.uid()
));

drop policy if exists "csv_uploads_company_owner" on public.csv_uploads;
create policy "csv_uploads_company_owner"
on public.csv_uploads for all
using (exists (
  select 1 from public.companies c
  where c.id = csv_uploads.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = csv_uploads.company_id and c.user_id = auth.uid()
));

drop policy if exists "company_market_data_owner" on public.company_market_data;
create policy "company_market_data_owner"
on public.company_market_data for all
using (exists (
  select 1 from public.companies c
  where c.id = company_market_data.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = company_market_data.company_id and c.user_id = auth.uid()
));
