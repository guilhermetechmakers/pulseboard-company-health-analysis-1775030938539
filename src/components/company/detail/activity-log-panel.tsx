import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SyncHistoryPanel } from '@/components/integrations/sync-history-panel'
import type { SyncJobRow } from '@/types/integrations'
import type { CompanyActivityFeedItem } from '@/hooks/use-company-activity-feed'
import { cn } from '@/lib/utils'

export interface ActivityLogPanelProps {
  jobs: SyncJobRow[] | undefined
  jobsLoading: boolean
  feed: CompanyActivityFeedItem[]
  feedLoading: boolean
  className?: string
}

export function ActivityLogPanel({ jobs, jobsLoading, feed, feedLoading, className }: ActivityLogPanelProps) {
  const items = Array.isArray(feed) ? feed : []

  return (
    <div className={cn('space-y-6', className)}>
      <SyncHistoryPanel jobs={jobs ?? []} isLoading={jobsLoading} />
      <Card className="border-border/80 p-6 shadow-card">
        <h3 className="text-lg font-semibold tracking-tight">Workspace activity</h3>
        <p className="text-sm text-muted-foreground">Analysis milestones and account events scoped to this company.</p>
        {feedLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No activity rows yet — save data, sync connectors, or run analysis.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/80" role="list">
            {(items ?? []).map((e) => (
              <li key={e.id} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium capitalize text-foreground">{e.title}</p>
                  {e.detail ? <p className="text-sm text-muted-foreground">{e.detail}</p> : null}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground" dateTime={e.createdAt}>
                  {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
