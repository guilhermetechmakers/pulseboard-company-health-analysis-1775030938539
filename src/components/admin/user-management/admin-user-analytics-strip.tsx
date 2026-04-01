import { useQuery } from '@tanstack/react-query'
import { BarChart3, Shield, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchAdminUsageMetrics } from '@/api/admin'
import { useAdminUserManagementStatsQuery } from '@/hooks/use-admin-users'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const CHART_PRIMARY = 'rgb(var(--primary))'
const CHART_MUTED = 'rgb(148 163 184)'

function UserManagementCharts({ className }: { className?: string }) {
  const q = useAdminUserManagementStatsQuery()

  if (q.isLoading) {
    return (
      <div className={cn('grid gap-3 lg:grid-cols-2', className)} aria-busy="true">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }

  if (q.isError || !q.data) {
    return null
  }

  const s = q.data
  const roles = Array.isArray(s.roleDistribution) ? s.roleDistribution : []
  const trend = Array.isArray(s.suspensionTrend) ? s.suspensionTrend : []
  const roleChartData = roles.map((r) => ({
    role: r.role.length > 12 ? `${r.role.slice(0, 10)}…` : r.role,
    count: typeof r.count === 'number' ? r.count : 0,
  }))
  const trendChartData = trend.length > 0 ? trend : []

  return (
    <div className={cn('grid gap-3 lg:grid-cols-2', className)}>
      <Card className="surface-card border-border/80 p-4 shadow-card">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role distribution</h3>
        <div className="mt-2 h-52 w-full" aria-label="Bar chart of users by role">
          {roleChartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No role data.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" opacity={0.6} />
                <XAxis dataKey="role" tick={{ fontSize: 11 }} stroke={CHART_MUTED} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={CHART_MUTED} width={32} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid rgb(var(--border))',
                    background: 'rgb(var(--card))',
                  }}
                />
                <Bar dataKey="count" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
      <Card className="surface-card border-border/80 p-4 shadow-card">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Suspensions (7 days)
        </h3>
        <div className="mt-2 h-52 w-full" aria-label="Line chart of suspension events by day">
          {trendChartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No suspension events in this window.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" opacity={0.6} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={CHART_MUTED} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={CHART_MUTED} width={28} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid rgb(var(--border))',
                    background: 'rgb(var(--card))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Suspensions"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

/** Optional focused panel: user-management charts only (Recharts). */
export function AdminAnalyticsPanel({ className }: { className?: string }) {
  return <UserManagementCharts className={className} />
}

export function AdminUserAnalyticsStrip({ className }: { className?: string }) {
  const q = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => fetchAdminUsageMetrics(),
  })
  const statsQ = useAdminUserManagementStatsQuery()

  if (q.isLoading) {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading admin metrics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Array.from({ length: 4 }) ?? []).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    )
  }

  if (q.isError || !q.data) {
    return null
  }

  const m = q.data
  const sessions = typeof m.activeSessionsApprox === 'number' ? m.activeSessionsApprox : 0
  const adminActs = typeof m.adminActions === 'number' ? m.adminActions : 0
  const st = statsQ.data
  const totalUsers = st && typeof st.totalUsers === 'number' ? st.totalUsers : null
  const activeUsers = st && typeof st.activeUsers === 'number' ? st.activeUsers : null
  const suspendedUsers = st && typeof st.suspendedUsers === 'number' ? st.suspendedUsers : null

  return (
    <section aria-label="Admin analytics related to user management" className={cn('space-y-3', className)}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            Directory
          </div>
          {statsQ.isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tabular-nums">{totalUsers ?? '—'}</p>
          )}
          <p className="text-xs text-muted-foreground">Total profiles</p>
        </Card>
        <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" aria-hidden />
            Active / suspended
          </div>
          {statsQ.isLoading ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {activeUsers ?? '—'} / {suspendedUsers ?? '—'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Account status breakdown</p>
        </Card>
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
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
            Admin actions (24h)
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{adminActs}</p>
          <p className="text-xs text-muted-foreground">Suspensions, impersonation, exports</p>
        </Card>
      </div>
      <Card className="surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
              Pipeline health
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{m.uptimePct.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Completed vs failed reports (7d)</p>
          </div>
        </div>
      </Card>
      <UserManagementCharts />
    </section>
  )
}
