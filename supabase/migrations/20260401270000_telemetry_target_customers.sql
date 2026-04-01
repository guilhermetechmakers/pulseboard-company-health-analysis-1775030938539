-- Telemetry events + target_customers alias column (wizard / API). Idempotent.

alter table public.companies add column if not exists target_customers text;

update public.companies c
set target_customers = coalesce(c.target_customers, c.target_customer)
where c.target_customers is null and c.target_customer is not null;

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists telemetry_events_user_created_idx
  on public.telemetry_events (user_id, created_at desc);
create index if not exists telemetry_events_type_idx on public.telemetry_events (event_type);

alter table public.telemetry_events enable row level security;

drop policy if exists "telemetry_events_insert_own" on public.telemetry_events;
create policy "telemetry_events_insert_own"
on public.telemetry_events for insert
with check (auth.uid() = user_id);

drop policy if exists "telemetry_events_select_own" on public.telemetry_events;
create policy "telemetry_events_select_own"
on public.telemetry_events for select
using (auth.uid() = user_id);

drop policy if exists "telemetry_events_admin_select" on public.telemetry_events;
create policy "telemetry_events_admin_select"
on public.telemetry_events for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and coalesce(p.account_status, 'active') <> 'suspended'
  )
);
