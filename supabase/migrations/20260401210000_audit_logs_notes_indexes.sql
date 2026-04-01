-- Audit logs: optional notes column, query indexes (idempotent).
alter table public.audit_logs add column if not exists notes text;

create index if not exists idx_audit_logs_actor_created
  on public.audit_logs (actor_user_id, created_at desc);

create index if not exists idx_audit_logs_action_created
  on public.audit_logs (action, created_at desc);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

create index if not exists idx_audit_logs_metadata_gin
  on public.audit_logs using gin (metadata);
