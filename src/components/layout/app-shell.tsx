import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, FileText } from 'lucide-react'

const links = [
  { to: '/', label: 'Landing' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/company', label: 'Company' },
  { to: '/settings', label: 'Integrations' },
  { to: '/company/create', label: 'Create Company' },
  { to: '/analysis/generate', label: 'Generate Analysis' },
]

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            PulseBoard
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
            <Link to="/report/sample" className="inline-flex items-center gap-1 hover:text-foreground">
              <FileText className="h-4 w-4" />
              Report
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl animate-fade-in-up px-4 py-6">{children}</main>
    </div>
  )
}
