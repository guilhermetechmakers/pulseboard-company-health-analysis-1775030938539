-- Single-company mode server-side default (client defaults to ON when column absent).
-- Used for future per-tenant rollout; RLS unchanged — Edge Functions use service role for enforcement helpers.

alter table public.profiles
  add column if not exists single_company_mode boolean not null default true;

comment on column public.profiles.single_company_mode is
  'When true (default), PulseBoard enforces single active company UX; admins use merge + primary-context tools for legacy data.';
