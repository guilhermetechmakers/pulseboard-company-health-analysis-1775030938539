import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Archive, Check, CheckCheck, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { filterInboxBySearch } from '@/api/notifications'
import {
  useArchiveNotification,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/use-notifications'
import type { InboxNotificationRow } from '@/types/notifications'
import { cn } from '@/lib/utils'

export interface NotificationInboxProps {
  items: InboxNotificationRow[]
  isLoading?: boolean
  className?: string
}

function linkForNotification(row: InboxNotificationRow): string | null {
  const d = row.notification.data ?? {}
  const reportId = typeof d.reportId === 'string' ? d.reportId : null
  if (row.notification.type === 'export_ready' && reportId) {
    return `/export/${reportId}`
  }
  if (reportId && ['analysis_complete', 'job_failed', 'snapshot_created', 'report_saved'].includes(row.notification.type)) {
    return `/report/${reportId}`
  }
  return reportId ? `/report/${reportId}` : null
}

export function NotificationInbox({ items, isLoading, className }: NotificationInboxProps) {
  const [query, setQuery] = useState('')
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const archive = useArchiveNotification()
  const del = useDeleteNotification()

  const safeItems = Array.isArray(items) ? items : []
  const filtered = useMemo(() => filterInboxBySearch(safeItems, query), [safeItems, query])

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)} aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notifications…"
            className="pl-9"
            aria-label="Search notifications"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="gap-2 transition-transform duration-200 hover:scale-[1.02]"
          disabled={markAll.isPending}
          onClick={() => void markAll.mutateAsync()}
        >
          <CheckCheck className="h-4 w-4" aria-hidden />
          Mark all read
        </Button>
      </div>

      <ul className="space-y-2" role="list" aria-label="Notifications">
        {filtered.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">No notifications match your filters.</Card>
        ) : (
          filtered.map((row) => {
            const unread = row.readAt == null
            const href = linkForNotification(row)
            return (
              <li key={row.inboxId}>
                <Card
                  className={cn(
                    'p-4 transition-all duration-200 hover:shadow-md',
                    unread ? 'border-primary/25 bg-primary/[0.04]' : 'border-border bg-card',
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            unread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {row.notification.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.notification.createdAt
                            ? formatDistanceToNow(new Date(row.notification.createdAt), { addSuffix: true })
                            : ''}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{row.notification.message}</p>
                      {href ? (
                        <Link to={href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                          Open related page
                        </Link>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {unread ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 gap-1 px-2 text-xs"
                          disabled={markRead.isPending}
                          onClick={() => void markRead.mutateAsync(row.inboxId)}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Read
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 gap-1 px-2 text-xs"
                        disabled={archive.isPending}
                        onClick={() => void archive.mutateAsync(row.inboxId)}
                      >
                        <Archive className="h-3.5 w-3.5" aria-hidden />
                        Archive
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                        disabled={del.isPending}
                        onClick={() => void del.mutateAsync(row.inboxId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
