-- PulseBoard — in-app notifications, inbox items, transactional email metadata, preferences.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.notification_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  read_at timestamptz,
  archived boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, notification_id)
);

create index if not exists notification_inbox_items_user_unread_idx
  on public.notification_inbox_items (user_id, created_at desc)
  where deleted_at is null and read_at is null;

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null unique,
  subject text not null,
  body_html text not null,
  body_text text not null,
  placeholders jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.email_dispatches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resend_email_id text,
  template_type text not null,
  to_address text not null,
  subject text not null,
  status text not null default 'queued',
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_dispatches_user_id_idx on public.email_dispatches (user_id, created_at desc);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid references public.email_dispatches(id) on delete cascade,
  status text not null,
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists email_events_dispatch_id_idx on public.email_events (dispatch_id, event_at desc);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  channels jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Default notification channel map (per event type: inApp + email booleans)
-- ---------------------------------------------------------------------------

insert into public.notification_preferences (user_id, channels)
select p.id,
  '{
    "analysis_complete": {"inApp": true, "email": true},
    "export_ready": {"inApp": true, "email": true},
    "job_failed": {"inApp": true, "email": true},
    "billing_alert": {"inApp": true, "email": true},
    "admin_alert": {"inApp": true, "email": true},
    "snapshot_created": {"inApp": true, "email": false},
    "report_saved": {"inApp": true, "email": false}
  }'::jsonb
from public.profiles p
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Seed transactional templates (HTML is intentionally simple; Edge Functions render placeholders)
-- ---------------------------------------------------------------------------

insert into public.email_templates (type, subject, body_html, body_text, placeholders)
values
  (
    'verification',
    'Verify your PulseBoard account',
    '<p>Hi {{userName}},</p><p>Please verify your email to finish setting up PulseBoard.</p><p><a href="{{actionUrl}}">Verify email</a></p>',
    'Hi {{userName}}, verify your email: {{actionUrl}}',
    '["userName","actionUrl"]'::jsonb
  ),
  (
    'password_reset',
    'Reset your PulseBoard password',
    '<p>Hi {{userName}},</p><p>We received a request to reset your password.</p><p><a href="{{actionUrl}}">Choose a new password</a></p><p>If you did not request this, you can ignore this email.</p>',
    'Hi {{userName}}, reset your password: {{actionUrl}}',
    '["userName","actionUrl"]'::jsonb
  ),
  (
    'analysis_complete',
    'Your company health analysis is ready',
    '<p>Hi {{userName}},</p><p>Your analysis for <strong>{{companyName}}</strong> is complete.</p><p><a href="{{reportUrl}}">Open report</a></p><p>Analysis ID: {{analysisId}}</p>',
    'Hi {{userName}}, analysis for {{companyName}} is ready. Open: {{reportUrl}} ({{analysisId}})',
    '["userName","companyName","analysisId","reportUrl"]'::jsonb
  ),
  (
    'export_ready',
    'Your PulseBoard export is ready',
    '<p>Hi {{userName}},</p><p>Your export for <strong>{{companyName}}</strong> finished successfully.</p><p><a href="{{exportUrl}}">Download export</a></p>',
    'Hi {{userName}}, export for {{companyName}} is ready: {{exportUrl}}',
    '["userName","companyName","exportUrl"]'::jsonb
  ),
  (
    'billing_alert',
    'Billing update for your PulseBoard account',
    '<p>Hi {{userName}},</p><p>{{message}}</p><p><a href="{{billingUrl}}">View billing</a></p>',
    'Hi {{userName}}, {{message}} Billing: {{billingUrl}}',
    '["userName","message","billingUrl"]'::jsonb
  ),
  (
    'job_failed',
    'PulseBoard job failed',
    '<p>Hi {{userName}},</p><p>We could not complete a background job.</p><p><strong>{{message}}</strong></p><p><a href="{{retryUrl}}">Retry or open PulseBoard</a></p>',
    'Hi {{userName}}, job failed: {{message}}. Retry: {{retryUrl}}',
    '["userName","message","retryUrl"]'::jsonb
  )
on conflict (type) do update set
  subject = excluded.subject,
  body_html = excluded.body_html,
  body_text = excluded.body_text,
  placeholders = excluded.placeholders,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;
alter table public.notification_inbox_items enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_dispatches enable row level security;
alter table public.email_events enable row level security;
alter table public.notification_preferences enable row level security;

create policy if not exists "notifications_select_own"
on public.notifications for select
using (auth.uid() = user_id);

create policy if not exists "notifications_insert_own"
on public.notifications for insert
with check (auth.uid() = user_id);

create policy if not exists "inbox_select_own"
on public.notification_inbox_items for select
using (auth.uid() = user_id);

create policy if not exists "inbox_insert_own"
on public.notification_inbox_items for insert
with check (auth.uid() = user_id);

create policy if not exists "inbox_update_own"
on public.notification_inbox_items for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "inbox_delete_own"
on public.notification_inbox_items for delete
using (auth.uid() = user_id);

create policy if not exists "email_templates_select_authenticated"
on public.email_templates for select
to authenticated
using (true);

create policy if not exists "email_dispatches_select_own"
on public.email_dispatches for select
using (auth.uid() = user_id);

create policy if not exists "email_dispatches_insert_own"
on public.email_dispatches for insert
with check (auth.uid() = user_id);

create policy if not exists "email_events_select_own"
on public.email_events for select
using (
  exists (
    select 1 from public.email_dispatches d
    where d.id = email_events.dispatch_id and d.user_id = auth.uid()
  )
);

create policy if not exists "notification_prefs_select_own"
on public.notification_preferences for select
using (auth.uid() = user_id);

create policy if not exists "notification_prefs_upsert_own"
on public.notification_preferences for insert
with check (auth.uid() = user_id);

create policy if not exists "notification_prefs_update_own"
on public.notification_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Signup hook: seed notification preferences for new users
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, role, plan_tier, signup_origin, privacy_consent_at)
  values (
    new.id,
    nullif(trim(coalesce(meta->>'display_name', '')), ''),
    coalesce(nullif(trim(meta->>'role'), ''), 'founder'),
    coalesce(nullif(trim(meta->>'plan_tier'), ''), 'starter'),
    nullif(trim(coalesce(meta->>'signup_origin', '')), ''),
    case when (meta->>'privacy_consent') = 'true' then now() else null end
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan_id, status)
  values (
    new.id,
    coalesce(nullif(trim(meta->>'plan_tier'), ''), 'starter') || '_plan',
    'trialing'
  )
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id, channels)
  values (
    new.id,
    '{
      "analysis_complete": {"inApp": true, "email": true},
      "export_ready": {"inApp": true, "email": true},
      "job_failed": {"inApp": true, "email": true},
      "billing_alert": {"inApp": true, "email": true},
      "admin_alert": {"inApp": true, "email": true},
      "snapshot_created": {"inApp": true, "email": false},
      "report_saved": {"inApp": true, "email": false}
    }'::jsonb
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists email_dispatches_set_updated_at on public.email_dispatches;
create trigger email_dispatches_set_updated_at
before update on public.email_dispatches
for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();
