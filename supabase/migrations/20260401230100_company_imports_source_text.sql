-- Store raw CSV text for authenticated retry of failed import jobs (Edge: pulse-data-io import_retry).

alter table public.company_imports add column if not exists source_text text;
