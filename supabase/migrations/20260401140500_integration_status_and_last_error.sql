-- Align integrations.status with OAuth flows (connecting) and add last_error for UI.

alter table public.integrations add column if not exists last_error text;

alter table public.integrations drop constraint if exists integrations_status_check;
alter table public.integrations add constraint integrations_status_check check (
  status in ('disconnected', 'connecting', 'connected', 'syncing', 'error')
);

alter table public.sync_jobs drop constraint if exists sync_jobs_status_check;
alter table public.sync_jobs add constraint sync_jobs_status_check check (
  status in ('queued', 'running', 'retrying', 'failed', 'completed', 'cancelled', 'succeeded')
);

alter table public.csv_uploads add column if not exists target_model text;
