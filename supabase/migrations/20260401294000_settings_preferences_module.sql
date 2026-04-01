-- PulseBoard — Settings: billing receipts, invite expiry (extends 20260401293500 workspace team).

alter table public.workspace_team_invites
  add column if not exists expires_at timestamptz;

create table if not exists public.billing_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount_cents integer,
  currency text not null default 'usd',
  issued_at timestamptz not null default now(),
  external_url text,
  created_at timestamptz not null default now()
);

create index if not exists billing_receipts_user_issued_idx
  on public.billing_receipts (user_id, issued_at desc);

alter table public.billing_receipts enable row level security;

drop policy if exists "billing_receipts_own" on public.billing_receipts;
create policy "billing_receipts_own"
on public.billing_receipts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
