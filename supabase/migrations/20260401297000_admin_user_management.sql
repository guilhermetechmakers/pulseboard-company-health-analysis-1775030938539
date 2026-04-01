-- Admin user management: impersonation audit tokens and async-style export job records (Edge Function uses service role).

create table if not exists public.admin_impersonation_tokens (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint admin_impersonation_tokens_token_unique unique (token)
);

create index if not exists admin_impersonation_tokens_admin_idx on public.admin_impersonation_tokens (admin_user_id);
create index if not exists admin_impersonation_tokens_target_idx on public.admin_impersonation_tokens (target_user_id);
create index if not exists admin_impersonation_tokens_expires_idx on public.admin_impersonation_tokens (expires_at desc);

create table if not exists public.admin_export_jobs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  format text not null default 'csv',
  filters jsonb not null default '{}'::jsonb,
  result_url text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint admin_export_jobs_status_check check (
    status in ('pending', 'processing', 'completed', 'failed')
  )
);

create index if not exists admin_export_jobs_admin_idx on public.admin_export_jobs (admin_user_id, created_at desc);

alter table public.admin_impersonation_tokens enable row level security;
alter table public.admin_export_jobs enable row level security;

-- No anon/authenticated policies: rows are written/read only via Edge Functions (service role).
