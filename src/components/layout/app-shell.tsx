import type { PropsWithChildren } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, LogIn, LogOut, UserRound } from 'lucide-react'
import { GlobalSearchBar } from '@/components/search/global-search-bar'
import { useAuth } from '@/contexts/auth-context'
import { useUserProfile } from '@/hooks/use-auth-profile'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Landing', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/company', label: 'Company' },
  { to: '/settings', label: 'Integrations' },
  { to: '/data/import', label: 'Data import' },
  { to: '/data/export', label: 'Data export' },
  { to: '/search', label: 'Search' },
  { to: '/company/create', label: 'Create Company' },
  { to: '/analysis/generate', label: 'Generate Analysis' },
]

export function AppShell({ children }: PropsWithChildren) {
  const { session, signOut, isConfigured, user } = useAuth()
  const { data: profile } = useUserProfile(user?.id)
  const isAdmin = profile?.role === 'admin' && profile?.account_status !== 'suspended'

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold transition-transform duration-200 hover:scale-[1.02]">
            <LayoutDashboard className="h-4 w-4 text-primary" aria-hidden />
            PulseBoard
          </Link>
          {session ? (
            <div className="order-last w-full md:order-none md:mx-4 md:max-w-md md:flex-1">
              <GlobalSearchBar />
            </div>
          ) : null}
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {(links ?? []).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn('transition-colors hover:text-foreground', isActive && 'font-medium text-foreground')
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/report/sample" className="inline-flex items-center gap-1 hover:text-foreground">
              <FileText className="h-4 w-4" aria-hidden />
              Report
            </Link>
            {session && isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn('font-medium transition-colors hover:text-foreground', isActive ? 'text-primary' : 'text-muted-foreground')
                }
              >
                Admin
              </NavLink>
            ) : null}
            {session ? (
              <>
                <NotificationBell />
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                >
                  <UserRound className="h-4 w-4" aria-hidden />
                  Profile
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 gap-1 px-2 text-muted-foreground"
                  onClick={() => void signOut()}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" className="h-9 gap-1 px-3" asChild>
                <Link to="/login">
                  <LogIn className="h-4 w-4" aria-hidden />
                  Sign in
                </Link>
              </Button>
            )}
          </nav>
        </div>
        {!isConfigured ? (
          <div className="border-t border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-foreground">
            Supabase env vars are missing — auth and data features stay offline until configured.
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-6xl animate-fade-in-up px-4 py-6 motion-reduce:animate-none">{children}</main>
    </div>
  )
}
