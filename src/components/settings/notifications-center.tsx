import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SettingsNotificationsPanel } from '@/components/notifications/settings-notifications-panel'
import { useInboxNotifications, useMarkNotificationRead } from '@/hooks/use-notifications'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function NotificationsCenter() {
  const inbox = useInboxNotifications({ limit: 6, includeArchived: false })
  const markRead = useMarkNotificationRead()
  const items = Array.isArray(inbox.data?.data) ? inbox.data.data : []

  if (!supabase) {
    return null
  }

  return (
    <div className="space-y-6">
      <SettingsNotificationsPanel />

      <Card className="p-6 shadow-card transition-shadow duration-200 hover:shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight">In-app inbox</h2>
          </div>
          <Button asChild variant="secondary" className="min-h-[44px]">
            <Link to="/notifications">Open full inbox</Link>
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Latest messages; admins can reply from support tooling.</p>

        <ul className="mt-4 space-y-2" aria-label="Recent in-app notifications">
          {inbox.isLoading ? (
            <li className="text-sm text-muted-foreground">Loading…</li>
          ) : items.length === 0 ? (
            <li className="text-sm text-muted-foreground">No messages yet.</li>
          ) : (
            items.map((row) => {
              const unread = row.readAt == null
              const created = row.notification.createdAt
              return (
                <li
                  key={row.inboxId}
                  className={cn(
                    'rounded-lg border border-border px-3 py-2 transition-colors',
                    unread ? 'border-primary/25 bg-primary/[0.04]' : 'hover:bg-muted/40',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{row.notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.notification.type}
                        {created ? ` · ${formatDistanceToNow(new Date(created), { addSuffix: true })}` : ''}
                      </p>
                    </div>
                    {unread ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 shrink-0 px-2 py-1 text-xs"
                        onClick={() => void markRead.mutateAsync(row.inboxId)}
                        disabled={markRead.isPending}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </Card>
    </div>
  )
}
