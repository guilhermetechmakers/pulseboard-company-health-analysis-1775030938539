import { Outlet, NavLink } from 'react-router-dom'
import { LayoutGrid, ScrollText, Shield, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNav = [
  { to: '/admin', label: 'Overview', end: true, icon: LayoutGrid },
  { to: '/admin/users', label: 'User management', end: false, icon: Users },
  { to: '/admin/audit-logs', label: 'Audit logs', end: false, icon: ScrollText },
]

export function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-6 lg:flex-row lg:gap-8">
      <aside
        className="surface-card w-full shrink-0 border-border/80 p-4 lg:w-56 animate-slide-in-left motion-reduce:animate-none"
        aria-label="Admin navigation"
      >
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Shield className="h-5 w-5" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">Admin</span>
        </div>
        <nav className="flex flex-col gap-1">
          {(adminNav ?? []).map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200',
                  'hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-6 text-xs text-muted-foreground">
          Tenant and region filters are planned for multi-region rollouts.
        </p>
      </aside>
      <div className="min-w-0 flex-1 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4 animate-fade-in-down motion-reduce:animate-none">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Operations</h1>
            <p className="text-sm text-muted-foreground">Usage metrics, pipeline health, and account controls.</p>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
