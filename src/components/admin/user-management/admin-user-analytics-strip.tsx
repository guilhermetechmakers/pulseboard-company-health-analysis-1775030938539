import { useQuery } from '@tanstack/react-query'
import { BarChart3, Shield, Users } from 'lucide-react'
import { fetchAdminUsageMetrics } from '@/api/admin'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function AdminUserAnalyticsStrip({ className }: { className?: string }) {
  const q = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => fetchAdminUsageMetrics(),
  })

  if (q.isLoading) {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-3', className)} aria-busy="true" aria-label="Loading admin metrics">
        {(Array.from({ length: 3 }) ?? []).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  if (q.isError || !q.data) {
    return null
  }

  const m = q.data
  const sessions = typeof m.activeSessionsApprox === 'number' ? m.activeSessionsApprox : 0
  const adminActs = typeof m.adminActions === 'number' ? m.adminActions : 0

  return (
    <section
      aria-label="Admin analytics related to user management"
      className={cn('grid gap-3 sm:grid-cols-3', className)}
    >
      <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          Activity (24h)
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{sessions}</p>
        <p className="text-xs text-muted-foreground">User activity log rows</p>
      </Card>
      <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" aria-hidden />
          Admin actions (24h)
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{adminActs}</p>
        <p className="text-xs text-muted-foreground">Suspensions, impersonation, exports</p>
      </Card>
      <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
          Pipeline health
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{m.uptimePct.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">Completed vs failed (7d)</p>
      </Card>
    </section>
  )
}
