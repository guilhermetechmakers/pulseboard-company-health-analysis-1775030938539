-- PulseBoard: optional file size on export jobs for download UI; idempotent.

alter table if exists public.export_jobs
  add column if not exists file_size_bytes bigint;

comment on column public.export_jobs.file_size_bytes is 'Byte length of generated export object in report-exports bucket, when known.';
