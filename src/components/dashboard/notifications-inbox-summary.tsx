import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface NotificationsInboxSummaryProps {
  unreadCount: number
  className?: string
}

export function NotificationsInboxSummary({ unreadCount, className }: NotificationsInboxSummaryProps) {
  const n = typeof unreadCount === 'number' && Number.isFinite(unreadCount) ? unreadCount : 0
  return (
    <Link
      to="/notifications"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary/40 hover:shadow-sm motion-reduce:transition-none',
        className,
      )}
    >
      <Inbox className="h-4 w-4 text-primary" aria-hidden />
      <span>Inbox</span>
      {n > 0 ? (
        <Badge variant="outline" className="h-6 min-w-6 justify-center border-primary/30 bg-primary/10 text-primary">
          {n > 99 ? '99+' : n}
        </Badge>
      ) : null}
    </Link>
  )
}
