-- Membership ledger for owners (and future collaborators); aligns with single-company enforcement + admin migration.

create table if not exists public.user_company_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'owner',
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index if not exists user_company_memberships_user_id_idx
  on public.user_company_memberships (user_id);

create index if not exists user_company_memberships_company_id_idx
  on public.user_company_memberships (company_id);

comment on table public.user_company_memberships is
  'Links users to companies (owner row today; reserved for collaborators / migration reconciliation).';

insert into public.user_company_memberships (user_id, company_id, role, is_primary)
select c.user_id, c.id, 'owner', true
from public.companies c
on conflict (user_id, company_id) do nothing;

create or replace function public.ensure_company_membership_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_company_memberships (user_id, company_id, role, is_primary)
  values (new.user_id, new.id, 'owner', true)
  on conflict (user_id, company_id) do update set
    is_primary = true,
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists companies_ensure_membership on public.companies;
create trigger companies_ensure_membership
after insert on public.companies
for each row execute function public.ensure_company_membership_row();

alter table public.user_company_memberships enable row level security;

create policy if not exists "user_company_memberships_select_own"
on public.user_company_memberships for select
using (auth.uid() = user_id);
