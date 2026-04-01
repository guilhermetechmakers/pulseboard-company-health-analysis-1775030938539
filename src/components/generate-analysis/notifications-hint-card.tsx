import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

export function NotificationsHintCard() {
  return (
    <Card className="flex gap-3 border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="font-medium text-foreground">Notifications</p>
        <p className="mt-1">
          Completed and failed runs also create inbox entries and toasts.{' '}
          <Link to="/notifications" className="font-medium text-primary underline-offset-4 hover:underline">
            Open notifications
          </Link>
        </p>
      </div>
    </Card>
  )
}
