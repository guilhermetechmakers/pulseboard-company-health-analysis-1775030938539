create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null check (provider in ('ga4', 'quickbooks', 'linkedin', 'stripe', 'csv')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'syncing', 'error')),
  scopes text[] not null default '{}'::text[],
  cadence text not null default 'daily' check (cadence in ('hourly', 'daily', 'manual')),
  last_synced_at timestamptz,
  next_sync_at timestamptz,
  credentials_ref uuid,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(company_id, provider)
);

create table if not exists public.oauth_credentials (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  token_type text,
  scope text,
  account_id text,
  tenant_id text,
  encrypted_payload text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  provider text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'retrying', 'failed', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  records_synced integer not null default 0,
  attempt_count integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  snapshot_type text not null,
  payload jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create table if not exists public.financials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  revenue numeric,
  expenses numeric,
  profit numeric,
  assets numeric,
  liabilities numeric,
  cash numeric,
  debt numeric,
  metrics jsonb not null default '{}'::jsonb,
  as_of_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sessions integer,
  users integer,
  pageviews integer,
  bounce_rate numeric,
  engagement_rate numeric,
  traffic_sources jsonb not null default '{}'::jsonb,
  device_breakdown jsonb not null default '{}'::jsonb,
  geo_breakdown jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.social_data (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel text not null,
  followers integer,
  engagement_rate numeric,
  posts_count integer,
  impressions integer,
  clicks integer,
  website_traffic integer,
  brand_mentions integer,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stripe_customer_id text,
  plan_name text,
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  monthly_recurring_revenue numeric,
  invoice_total numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.csv_uploads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  file_name text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  rows_processed integer not null default 0,
  mapping jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.integrations enable row level security;
alter table public.oauth_credentials enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.data_snapshots enable row level security;
alter table public.financials enable row level security;
alter table public.analytics enable row level security;
alter table public.social_data enable row level security;
alter table public.billing enable row level security;
alter table public.csv_uploads enable row level security;

create policy if not exists "users_manage_own_integrations_records"
on public.integrations for all
using (exists (
  select 1 from public.companies c
  where c.id = integrations.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = integrations.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_oauth_credentials"
on public.oauth_credentials for all
using (exists (
  select 1
  from public.integrations i
  join public.companies c on c.id = i.company_id
  where i.id = oauth_credentials.integration_id and c.user_id = auth.uid()
))
with check (exists (
  select 1
  from public.integrations i
  join public.companies c on c.id = i.company_id
  where i.id = oauth_credentials.integration_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_sync_jobs"
on public.sync_jobs for all
using (exists (
  select 1 from public.companies c
  where c.id = sync_jobs.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = sync_jobs.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_data_snapshots"
on public.data_snapshots for all
using (exists (
  select 1 from public.companies c
  where c.id = data_snapshots.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = data_snapshots.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_financials"
on public.financials for all
using (exists (
  select 1 from public.companies c
  where c.id = financials.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = financials.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_analytics"
on public.analytics for all
using (exists (
  select 1 from public.companies c
  where c.id = analytics.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = analytics.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_social_data"
on public.social_data for all
using (exists (
  select 1 from public.companies c
  where c.id = social_data.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = social_data.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_billing"
on public.billing for all
using (exists (
  select 1 from public.companies c
  where c.id = billing.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = billing.company_id and c.user_id = auth.uid()
));

create policy if not exists "users_manage_own_csv_uploads"
on public.csv_uploads for all
using (exists (
  select 1 from public.companies c
  where c.id = csv_uploads.company_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.companies c
  where c.id = csv_uploads.company_id and c.user_id = auth.uid()
));
