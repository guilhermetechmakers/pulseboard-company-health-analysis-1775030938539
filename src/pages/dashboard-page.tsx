import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, FileDown, FileSpreadsheet, Plug, Sparkles } from 'lucide-react'
import { differenceInHours, format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { DataCompletenessMeter } from '@/components/integrations/data-completeness-meter'
import { SyncHistoryPanel } from '@/components/integrations/sync-history-panel'
import { HealthTrendChart } from '@/components/charts/health-trend-chart'
import { useMyCompany } from '@/hooks/use-my-company'
import { useIntegrations } from '@/hooks/use-integrations'
import { useSyncJobs } from '@/hooks/use-sync-jobs'
import {
  useCompanyAggregates,
  hasFinancialSignals,
  hasMarketSignals,
  hasSocialSignals,
} from '@/hooks/use-company-aggregates'
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner'
import { DashboardNotificationsPanel } from '@/components/notifications/dashboard-notifications-panel'
import { useAuth } from '@/contexts/auth-context'
import { useVerificationResend } from '@/hooks/use-verification-resend'
import { buildCompletenessSlices, completenessPercent, healthSubscores } from '@/lib/dashboard-utils'
import { asRecord, pickNumber } from '@/lib/safe-data'
import { cn } from '@/lib/utils'
import { useCompanyHealthScores, useComputeHealthScore } from '@/hooks/use-health-scores'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'

export function DashboardPage() {
  const { user, isEmailVerified } = useAuth()
  const { resend, cooldown, isSending } = useVerificationResend(user?.email)
  const { data: company, isLoading: companyLoading } = useMyCompany()
  const companyId = company?.id
  const { data: integrations = [], isLoading: intLoading } = useIntegrations(companyId)
  const { data: jobs, isLoading: jobsLoading } = useSyncJobs(companyId)
  const {
    data: agg,
    isLoading: aggLoading,
    isFetching: aggFetching,
    isStale: aggStale,
  } = useCompanyAggregates(companyId)
  const {
    data: healthHistory = [],
    isFetching: healthFetching,
    isStale: healthStale,
    pulseCache: healthPulse,
  } = useCompanyHealthScores(companyId ?? null, 16)
  const computeHealth = useComputeHealthScore()

  const loading = companyLoading || intLoading || aggLoading

  const overallHistoryPoints = useMemo(() => {
    const rows = Array.isArray(healthHistory) ? [...healthHistory] : []
    const chronological = rows.reverse()
    return chronological.map((r) => {
      let label = ''
      try {
        label = format(parseISO(r.scored_at), 'MMM d')
      } catch {
        label = r.scored_at.slice(5, 10)
      }
      return {
        label,
        score: typeof r.overall === 'number' && Number.isFinite(r.overall) ? r.overall : 0,
      }
    })
  }, [healthHistory])

  const slices = buildCompletenessSlices(
    company,
    hasFinancialSignals(agg?.financials),
    hasMarketSignals(agg?.market),
    hasSocialSignals(agg?.social),
    (integrations ?? []).filter((i) => i.status === 'connected').length,
  )
  const pct = completenessPercent(slices)

  const staleIntegration = (integrations ?? []).find((i) => {
    if (!i.last_synced_at || i.status !== 'connected') return false
    return differenceInHours(new Date(), parseISO(i.last_synced_at)) > 48
  })

  const overall =
    pickNumber(asRecord(company?.health_scores).overall) ??
    pickNumber(asRecord(agg?.latestReport?.health_scores).overall) ??
    null

  const chartData = healthSubscores(company?.health_scores ?? agg?.latestReport?.health_scores).map((s) => ({
    label: s.label,
    score: s.value,
  }))

  if (!companyLoading && !company) {
    return (
      <section className="space-y-8 animate-fade-in-up">
        <EmailVerificationBanner
          email={user?.email}
          isVerified={isEmailVerified}
          onResend={() => void resend()}
          isResending={isSending}
          cooldownSeconds={cooldown}
        />
        <div className="surface-card relative overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
          <div className="relative space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">Set up your company</h1>
            <p className="mx-auto max-w-lg text-muted-foreground">
              PulseBoard is single-company focused. Create a profile to unlock health scoring, integrations, and AI
              analysis.
            </p>
            <Button asChild className="mt-2 shadow-card transition-all duration-200 hover:scale-[1.03] hover:shadow-lg">
              <Link to="/company/create">Create company</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-8 animate-fade-in-up">
      <EmailVerificationBanner
        email={user?.email}
        isVerified={isEmailVerified}
        onResend={() => void resend()}
        isResending={isSending}
        cooldownSeconds={cooldown}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            At-a-glance health, data freshness, and quick actions for {company?.name ?? 'your company'}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={!companyId || computeHealth.isPending}
            onClick={() => companyId && void computeHealth.mutateAsync({ companyId })}
          >
            Refresh score (rules)
          </Button>
          <Button asChild variant="primary" className="gap-2 transition-all duration-200 hover:scale-[1.02]">
            <Link to="/generate">
              <Sparkles className="h-4 w-4" />
              Run analysis
            </Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/settings">
              <Plug className="h-4 w-4" />
              Connectors
            </Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/settings#csv-import">
              <FileSpreadsheet className="h-4 w-4" />
              Import CSV
            </Link>
          </Button>
          {agg?.latestReport?.id ? (
            <Button asChild variant="secondary" className="gap-2 transition-all duration-200 hover:scale-[1.02]">
              <Link to={`/export/${agg.latestReport.id}`}>
                <FileDown className="h-4 w-4" />
                Export report
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {staleIntegration && (
        <div
          className="rounded-xl border border-[rgb(245,158,11)]/40 bg-[rgb(245,158,11)]/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <strong className="font-medium">Stale connector data:</strong>{' '}
          <span className="capitalize">{staleIntegration.provider}</span> last synced{' '}
          {staleIntegration.last_synced_at
            ? new Date(staleIntegration.last_synced_at).toLocaleString()
            : 'never'}
          . Consider syncing from Settings.
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 transition-shadow duration-200 hover:shadow-lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Overall health</h2>
              <div className="flex flex-wrap items-center gap-2">
                <CacheStatusBadge
                  meta={agg?.pulseCache}
                  isFetching={aggFetching}
                  isStale={aggStale}
                />
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
              </div>
            </div>
            {overall != null ? (
              <p className="text-4xl font-semibold text-primary">{overall}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Run an analysis to populate your composite health score.</p>
            )}
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Data completeness</p>
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">{pct}% of guided data slices satisfied</p>
            </div>
          </Card>
          <DataCompletenessMeter percent={pct} slices={slices} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 transition-all duration-200 hover:shadow-md lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Health breakdown</h2>
            <CacheStatusBadge meta={healthPulse} isFetching={healthFetching} isStale={healthStale} />
          </div>
          <p className="mb-4 text-sm text-muted-foreground">Sub-scores from the latest stored health model.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {healthSubscores(company?.health_scores ?? {}).map((s) => (
              <div
                key={s.label}
                className={cn(
                  'rounded-xl border border-border bg-card p-4 transition-transform duration-200 hover:scale-[1.01]',
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Latest analysis</h2>
            <CacheStatusBadge meta={agg?.pulseCache} isFetching={aggFetching} isStale={aggStale} />
          </div>
          {agg?.latestReport ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Status: {agg.latestReport.status}</p>
              <Button asChild variant="secondary" className="w-full text-sm">
                <Link to={`/report/${agg.latestReport.id}`}>Open report</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reports yet. Generate analysis when your data is ready.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HealthTrendChart
            data={chartData.length > 0 ? chartData : undefined}
            overallHistory={overallHistoryPoints.length > 1 ? overallHistoryPoints : undefined}
          />
        </div>
        <Card className="border-border/80 p-6 shadow-card">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Complete your data</h2>
          <p className="mb-4 text-sm text-muted-foreground">Address gaps to improve score quality and AI output.</p>
          <ul className="space-y-2 text-sm" aria-label="Incomplete data categories">
            {slices
              .filter((s) => !s.done)
              .map((s) => (
                <li key={s.key}>
                  <Link
                    to={s.href}
                    className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            {slices.every((s) => s.done) ? (
              <li className="text-muted-foreground">All guided slices satisfied. Nice work.</li>
            ) : null}
          </ul>
        </Card>
      </div>

      <DashboardNotificationsPanel />

      <SyncHistoryPanel jobs={jobs ?? []} isLoading={jobsLoading} />

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Connect GA4, QuickBooks, LinkedIn, or Stripe under{' '}
        <Link to="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
          Settings → Integrations
        </Link>{' '}
        to enrich financial, web, social, and billing signals.
      </div>
    </section>
  )
}
