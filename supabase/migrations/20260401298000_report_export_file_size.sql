-- Report export jobs: optional file size for download UI (bytes).

alter table public.export_jobs
  add column if not exists file_size_bytes bigint;

comment on column public.export_jobs.file_size_bytes is 'Size of generated export file in bytes, when available.';
