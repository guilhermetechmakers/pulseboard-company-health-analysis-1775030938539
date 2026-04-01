import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInboxNotifications } from '@/hooks/use-notifications'
import { NotificationInbox } from '@/components/notifications/notification-inbox'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const inbox = useInboxNotifications({
    includeArchived: false,
    limit: 40,
    refetchIntervalMs: open ? 15_000 : 60_000,
  })

  const { items, unread } = useMemo(() => {
    const list = inbox.data?.data ?? []
    return {
      items: list,
      unread: list.filter((i) => i.readAt == null).length,
    }
  }, [inbox.data])

  useEffect(() => {
    if (!open) return
    void inbox.refetch()
  }, [open, inbox])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      const el = panelRef.current
      if (el && !el.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'relative h-10 w-10 rounded-lg p-0 transition-transform duration-200 hover:scale-[1.05] hover:bg-muted',
          open && 'bg-muted',
        )}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5 text-foreground" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground motion-safe:animate-scale-in">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-border bg-card p-3 shadow-lg motion-safe:animate-fade-in-down sm:w-96"
          role="dialog"
          aria-label="Notification center"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            <Button type="button" variant="ghost" className="h-8 text-xs" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
          <div className="max-h-[min(70vh,420px)] overflow-y-auto pr-1">
            <NotificationInbox items={items} isLoading={inbox.isLoading} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
