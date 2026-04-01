import { PageTemplate } from '@/components/layout/page-template'
import { Card } from '@/components/ui/card'
import { NotificationInbox } from '@/components/notifications/notification-inbox'
import { useNotificationInbox } from '@/hooks/use-notifications'
import { supabase } from '@/lib/supabase'

export function NotificationsPage() {
  const inbox = useNotificationInbox({ limit: 80, refetchIntervalMs: 45_000 })
  const items = inbox.data?.items ?? []

  if (!supabase) {
    return (
      <PageTemplate title="Notifications" description="In-app inbox and delivery history.">
        <Card className="p-6 text-sm text-muted-foreground">Configure Supabase to load notifications.</Card>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Notification inbox"
      description="Analysis completions, exports, job failures, and workspace alerts. Mark read, archive, or remove items."
    >
      <NotificationInbox items={items} isLoading={inbox.isLoading} />
    </PageTemplate>
  )
}
