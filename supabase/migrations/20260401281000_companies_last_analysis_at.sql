-- Dashboard: track last analysis time on company row for header cards and sorting.

alter table public.companies add column if not exists last_analysis_at timestamptz;

comment on column public.companies.last_analysis_at is 'Timestamp of the most recent report/analysis run for this company.';

-- Backfill from existing reports
update public.companies c
set last_analysis_at = r.latest
from (
  select company_id, max(created_at) as latest
  from public.reports
  group by company_id
) r
where c.id = r.company_id
  and (c.last_analysis_at is null or c.last_analysis_at < r.latest);

create or replace function public.touch_company_last_analysis_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.companies
  set
    last_analysis_at = greatest(coalesce(last_analysis_at, new.created_at), new.created_at),
    updated_at = now()
  where id = new.company_id;
  return new;
end;
$$;

drop trigger if exists reports_touch_company_last_analysis on public.reports;
create trigger reports_touch_company_last_analysis
after insert on public.reports
for each row
execute procedure public.touch_company_last_analysis_from_report();
