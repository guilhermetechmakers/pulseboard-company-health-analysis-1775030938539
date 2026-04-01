import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, UserRound, Inbox } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ProfileMenuProps {
  className?: string
}

/**
 * Grouped account actions (keyboard-friendly `details` disclosure).
 */
export function ProfileMenu({ className }: ProfileMenuProps) {
  const { signOut, user } = useAuth()
  const label = user?.email?.split('@')[0] ?? 'Account'

  return (
    <details className={cn('relative', className)}>
      <summary
        className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        aria-label="Account menu"
      >
        <UserRound className="h-4 w-4" aria-hidden />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground motion-safe:transition-transform [[open]_&]:rotate-180" aria-hidden />
      </summary>
      <div
        className="absolute right-0 z-50 mt-1 min-w-[200px] rounded-xl border border-border bg-card py-1 shadow-card animate-fade-in-down motion-reduce:animate-none"
        role="menu"
      >
        <Link
          to="/profile"
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          role="menuitem"
        >
          <UserRound className="h-4 w-4" aria-hidden />
          Profile
        </Link>
        <Link
          to="/notifications"
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          role="menuitem"
        >
          <Inbox className="h-4 w-4" aria-hidden />
          Notifications
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          role="menuitem"
        >
          <Settings className="h-4 w-4" aria-hidden />
          Settings
        </Link>
        <div className="my-1 border-t border-border" />
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-start gap-2 rounded-none px-3 py-2 text-sm font-normal hover:scale-100"
          onClick={() => void signOut()}
          role="menuitem"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </details>
  )
}
