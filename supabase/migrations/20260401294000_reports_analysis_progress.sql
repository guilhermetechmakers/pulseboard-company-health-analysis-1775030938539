-- PulseBoard: analysis job progress, live logs, optional report email delivery

alter table public.reports add column if not exists progress_percent integer not null default 0
  check (progress_percent >= 0 and progress_percent <= 100);

alter table public.reports add column if not exists analysis_logs jsonb not null default '[]'::jsonb;

alter table public.reports add column if not exists send_report_email boolean not null default false;

alter table public.reports add column if not exists report_email text;

comment on column public.reports.progress_percent is '0-100 job progress for Generate Analysis polling UI';
comment on column public.reports.analysis_logs is 'Timestamped log lines streamed during analysis';
