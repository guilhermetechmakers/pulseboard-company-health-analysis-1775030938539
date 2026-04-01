import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { SyncJobRow } from '@/types/integrations'

function statusVariant(
  status: string,
): 'default' | 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'succeeded':
    case 'completed':
      return 'success'
    case 'failed':
      return 'destructive'
    case 'running':
      return 'warning'
    default:
      return 'outline'
  }
}

export interface SyncHistoryPanelProps {
  jobs: SyncJobRow[] | undefined
  isLoading: boolean
}

export function SyncHistoryPanel({ jobs, isLoading }: SyncHistoryPanelProps) {
  const list = jobs ?? []

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium">Sync history</h3>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    )
  }

  if (list.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-2 text-lg font-medium">Sync history</h3>
        <p className="text-sm text-muted-foreground">
          No sync jobs yet. Connect a provider and run a sync to see outcomes, retries, and errors here.
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-medium">Sync history</h3>
        <p className="text-sm text-muted-foreground">Latest connector runs for this company.</p>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-card">
            <tr>
              <th className="px-6 py-3 font-medium text-muted-foreground">Provider</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Records</th>
              <th className="px-6 py-3 font-medium text-muted-foreground">When</th>
            </tr>
          </thead>
          <tbody>
            {list.map((job) => (
              <tr key={job.id} className="border-b border-border/80 transition-colors hover:bg-muted/40">
                <td className="px-6 py-3 font-medium capitalize">{job.provider}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{job.records_synced}</td>
                <td className="px-6 py-3 text-muted-foreground">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(list ?? []).some((j) => j.error_message) && (
        <div className="border-t border-border bg-muted/30 px-6 py-3 text-xs text-destructive">
          {(list ?? []).find((j) => j.error_message)?.error_message}
        </div>
      )}
    </Card>
  )
}
