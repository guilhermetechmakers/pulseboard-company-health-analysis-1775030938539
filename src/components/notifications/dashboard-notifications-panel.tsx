import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NotificationInbox } from '@/components/notifications/notification-inbox'
import { useInboxNotifications } from '@/hooks/use-notifications'

export function DashboardNotificationsPanel() {
  const inbox = useInboxNotifications({ limit: 6, refetchIntervalMs: 90_000 })
  const items = inbox.data?.data ?? []

  return (
    <Card className="overflow-hidden p-0 transition-shadow duration-200 hover:shadow-lg">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Inbox</h2>
          <p className="text-xs text-muted-foreground">Analysis, exports, and job alerts for your workspace.</p>
        </div>
        <Button asChild variant="secondary" className="h-8 gap-1 px-3 text-xs">
          <Link to="/analysis/generate">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Run analysis
          </Link>
        </Button>
      </div>
      <div className="p-4">
        <NotificationInbox items={items} isLoading={inbox.isLoading} />
      </div>
    </Card>
  )
}
