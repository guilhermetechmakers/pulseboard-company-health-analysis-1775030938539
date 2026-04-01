-- PulseBoard search: trigram indexes for fast ILIKE/autosuggest, facet column for tags.
-- Idempotent; safe to re-run.

create extension if not exists pg_trgm;

alter table public.companies
  add column if not exists search_tags text[] not null default '{}';

create index if not exists companies_search_tags_gin_idx
  on public.companies using gin (search_tags);

create index if not exists companies_name_trgm_idx
  on public.companies using gin (name gin_trgm_ops);

create index if not exists companies_industry_trgm_idx
  on public.companies using gin (industry gin_trgm_ops);

create index if not exists reports_executive_summary_trgm_idx
  on public.reports using gin (left(coalesce(executive_summary, ''), 2000) gin_trgm_ops);

create index if not exists reports_status_updated_idx
  on public.reports (status, updated_at desc);

create index if not exists reports_company_updated_idx
  on public.reports (company_id, updated_at desc);

create index if not exists company_health_scores_company_scored_idx
  on public.company_health_scores (company_id, scored_at desc);

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);

create index if not exists profiles_email_trgm_idx
  on public.profiles using gin (email gin_trgm_ops);
