import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUnreadNotificationCount } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'

export interface ReportViewerNotificationsChipProps {
  className?: string
}

/**
 * Compact inbox entry point for the report workspace (links to full notifications page).
 */
export function ReportViewerNotificationsChip({ className }: ReportViewerNotificationsChipProps) {
  const { unread } = useUnreadNotificationCount()

  return (
    <div className={cn('no-print flex items-center gap-2', className)}>
      <Button type="button" variant="ghost" className="relative h-10 gap-2 px-3 text-sm" asChild>
        <Link to="/notifications" aria-label="Open notifications inbox">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline">Inbox</span>
          {unread > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-[1.25rem] justify-center px-1 text-[10px]"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          ) : null}
        </Link>
      </Button>
    </div>
  )
}
