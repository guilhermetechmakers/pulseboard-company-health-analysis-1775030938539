import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { INTEGRATION_PROVIDERS, type IntegrationRow } from '@/types/integrations'
import type { DashboardIntegrationSnippet } from '@/types/dashboard'

export interface IntegrationsTileProps {
  integrations: (IntegrationRow | DashboardIntegrationSnippet)[]
  className?: string
}

function labelFor(provider: string): string {
  const hit = INTEGRATION_PROVIDERS.find((p) => p.id === provider)
  return hit?.label ?? provider
}

function statusIcon(status: string) {
  if (status === 'connected' || status === 'syncing') {
    return status === 'syncing' ? (
      <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-[rgb(22,163,74)]" aria-hidden />
    )
  }
  return <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden />
}

export function IntegrationsTile({ integrations, className }: IntegrationsTileProps) {
  const rows = Array.isArray(integrations) ? integrations : []
  const byProvider = new Map(rows.map((r) => [r.provider, r]))

  return (
    <Card className={cn('border-border/80 p-6 transition-shadow duration-200 hover:shadow-md', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Integrations &amp; imports</h2>
          <p className="text-sm text-muted-foreground">QuickBooks, GA4, LinkedIn, Stripe, and CSV — scoped to this company.</p>
        </div>
        <Button asChild variant="secondary" className="h-9 gap-1 px-3 py-2 text-xs hover:scale-100">
          <Link to="/settings">
            Manage
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
      <ul className="space-y-2" aria-label="Integration connectors">
        {INTEGRATION_PROVIDERS.map((p) => {
          const row = byProvider.get(p.id)
          const status = row?.status ?? 'disconnected'
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5 transition-colors duration-200 hover:bg-muted/25"
            >
              <div className="flex min-w-0 items-center gap-2">
                {statusIcon(status)}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{labelFor(p.id)}</p>
                  <p className="text-xs capitalize text-muted-foreground">{status.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <Button asChild variant="ghost" className="h-8 shrink-0 px-2 py-1.5 text-xs hover:scale-100">
                <Link to="/settings">{row ? 'Details' : 'Connect'}</Link>
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        OAuth tokens stay server-side; use Settings to start or refresh a connection.
      </p>
    </Card>
  )
}
