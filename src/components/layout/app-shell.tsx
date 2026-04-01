import type { PropsWithChildren } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, LogIn, Building2, Shuffle } from 'lucide-react'
import { GlobalSearchBar } from '@/components/search/global-search-bar'
import { useAuth } from '@/contexts/auth-context'
import { useUserProfile } from '@/hooks/use-auth-profile'
import { useMyCompany } from '@/hooks/use-my-company'
import { ActiveCompanyBanner } from '@/components/layout/active-company-banner'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { ProfileMenu } from '@/components/layout/profile-menu'
import { cn } from '@/lib/utils'

const baseLinks = [
  { to: '/', label: 'Landing', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/company', label: 'Workspace' },
  { to: '/settings', label: 'Integrations' },
  { to: '/data/import', label: 'Data import' },
  { to: '/data/export', label: 'Data export' },
  { to: '/search', label: 'Search' },
  { to: '/company/create', label: 'Create company' },
  { to: '/analysis/generate', label: 'Generate Analysis' },
]

export function AppShell({ children }: PropsWithChildren) {
  const { session, isConfigured, user } = useAuth()
  const { data: profile } = useUserProfile(user?.id)
  const { data: myCompany } = useMyCompany()
  const isAdmin = profile?.role === 'admin' && profile?.account_status !== 'suspended'
  const links =
    session && myCompany
      ? (baseLinks ?? []).filter((l) => l.to !== '/company/create')
      : (baseLinks ?? [])

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold transition-transform duration-200 hover:scale-[1.02]">
            <LayoutDashboard className="h-4 w-4 text-primary" aria-hidden />
            PulseBoard
            {session && myCompany?.name ? (
              <span
                className="hidden max-w-[140px] truncate rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-normal text-muted-foreground sm:inline-flex sm:items-center sm:gap-1"
                title="Active company (single-company mode)"
              >
                <Building2 className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                {myCompany.name}
              </span>
            ) : null}
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
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn('font-medium transition-colors hover:text-foreground', isActive ? 'text-primary' : 'text-muted-foreground')
                  }
                >
                  Admin
                </NavLink>
                <NavLink
                  to="/admin/company-consolidation"
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground',
                      isActive ? 'text-primary' : 'text-muted-foreground',
                    )
                  }
                  title="Admin: merge duplicates or align primary company context"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden />
                  Switch / merge companies
                </NavLink>
              </>
            ) : null}
            {session ? (
              <>
                <NotificationBell />
                <ProfileMenu />
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
        {isConfigured && session ? <ActiveCompanyBanner /> : null}
      </header>
      <main className="mx-auto max-w-6xl animate-fade-in-up px-4 py-6 motion-reduce:animate-none">{children}</main>
    </div>
  )
}
