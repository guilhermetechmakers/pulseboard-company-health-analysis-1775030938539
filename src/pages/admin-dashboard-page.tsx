import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowRight, FileBarChart, Gauge, ScrollText, Server } from 'lucide-react'
import { fetchAdminSystemHealth, fetchAdminUsageMetrics } from '@/api/admin'
import { KpiCard } from '@/components/admin/kpi-card'
import { AdminTimeSeriesChart } from '@/components/admin/time-series-chart'
import { SystemHealthPanel } from '@/components/admin/system-health-panel'
import { RecentActivityTable } from '@/components/admin/recent-activity-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function trendSeries(points: { count: number }[]): number[] {
  const p = Array.isArray(points) ? points : []
  return p.map((x) => (typeof x?.count === 'number' ? x.count : 0))
}

export function AdminDashboardPage() {
  const metricsQuery = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => fetchAdminUsageMetrics(),
  })

  const healthQuery = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => fetchAdminSystemHealth(),
  })

  const metrics = metricsQuery.data
  const companiesSpark = useMemo(() => trendSeries(metrics?.companiesTrend ?? []), [metrics?.companiesTrend])
  const reportsSpark = useMemo(() => trendSeries(metrics?.reportsTrend ?? []), [metrics?.reportsTrend])

  const topIssues = Array.isArray(metrics?.topIssues) ? metrics.topIssues : []

  if (metricsQuery.isLoading || healthQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading admin dashboard">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (metricsQuery.isError || healthQuery.isError || !metrics) {
    return (
      <Card className="surface-card border-destructive/30 p-6 text-sm text-destructive">
        Could not load admin metrics. Confirm Edge Functions are deployed and your profile role is set to{' '}
        <code className="rounded bg-muted px-1">admin</code>.
      </Card>
    )
  }

  const health = healthQuery.data ?? { status: 'yellow' as const, details: [] }

  return (
    <div className="space-y-8 pb-10 animate-fade-in-up motion-reduce:animate-none">
      <section aria-label="Filters" className="flex flex-wrap gap-3">
        <label className="flex flex-col text-xs font-medium text-muted-foreground">
          Time range
          <select
            className="mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue="14d"
            aria-label="Time range filter"
          >
            <option value="14d">Last 14 days (UTC)</option>
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-muted-foreground">
          Tenant
          <select
            disabled
            className="mt-1 cursor-not-allowed rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm opacity-70"
            aria-label="Tenant filter (disabled)"
          >
            <option>All tenants</option>
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-muted-foreground">
          Region
          <select
            disabled
            className="mt-1 cursor-not-allowed rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm opacity-70"
            aria-label="Region filter (disabled)"
          >
            <option>Global</option>
          </select>
        </label>
      </section>

      <section aria-label="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            title="Active companies"
            value={metrics.activeCompanies}
            hint="Total companies on record"
            trend={companiesSpark}
          />
          <KpiCard
            title="Reports today"
            value={metrics.dailyReports}
            hint={`${metrics.weeklyReports} this week · ${metrics.monthlyReports} this month`}
            trend={reportsSpark}
          />
          <KpiCard title="Pipeline uptime" value={`${metrics.uptimePct.toFixed(1)}%`} hint="Completed vs failed (7d)" />
          <KpiCard title="Latency (est.)" value={`${Math.round(metrics.latencyMs)} ms`} hint="Queue-aware estimate" />
          <KpiCard title="Error rate" value={`${metrics.errorRate.toFixed(1)}%`} hint="Failed analyses (7d)" />
          <KpiCard
            title="Admin actions (24h)"
            value={metrics.adminActions}
            hint={`${metrics.activeSessionsApprox} activity log rows (24h)`}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <AdminTimeSeriesChart companiesTrend={metrics.companiesTrend} reportsTrend={metrics.reportsTrend} />
          <RecentActivityTable items={metrics.recentActivity} />
        </div>
        <div className="space-y-6">
          <SystemHealthPanel health={health} />
          <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Activity className="h-5 w-5 text-primary" aria-hidden />
              Top issues
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground" role="list">
              {(topIssues ?? []).map((issue, i) => (
                <li key={`${i}-${issue.slice(0, 32)}`} className="flex gap-2">
                  <span className="text-primary" aria-hidden>
                    •
                  </span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="surface-card border-border/80 p-4 shadow-card">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Quick actions</h2>
            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="justify-between shadow-card transition-transform duration-200 hover:scale-[1.02]"
              >
                <Link to="/admin/users">
                  <span className="flex items-center gap-2">
                    <FileBarChart className="h-4 w-4" aria-hidden />
                    User management
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-70" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="justify-between">
                <Link to="/admin/audit-logs">
                  <span className="flex items-center gap-2">
                    <ScrollText className="h-4 w-4" aria-hidden />
                    Audit logs & errors
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-70" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="justify-between">
                <Link to="/settings">
                  <span className="flex items-center gap-2">
                    <Server className="h-4 w-4" aria-hidden />
                    Integrations & settings
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-70" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-between text-muted-foreground">
                <Link to="/dashboard">
                  <span className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" aria-hidden />
                    Back to product dashboard
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-70" aria-hidden />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
