-- Audit logs: optional target/notes columns, query indexes, admin read policy.
-- Idempotent; aligns with PulseBoard audit_logs (actor_user_id, entity, metadata).

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'target'
  ) then
    alter table public.audit_logs add column target jsonb;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'notes'
  ) then
    alter table public.audit_logs add column notes text;
  end if;
end $$;

create index if not exists idx_audit_logs_actor_user_id on public.audit_logs (actor_user_id);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity);

create index if not exists idx_audit_logs_target_gin on public.audit_logs using gin (target jsonb_path_ops);

-- Admins may read all audit rows (client still uses Edge Function + service role for listing).
create policy if not exists "admins_read_all_audit_logs"
on public.audit_logs for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.account_status, 'active') <> 'suspended'
  )
);
