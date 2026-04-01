import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { differenceInHours, format, parseISO } from 'date-fns'
import { BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { DataCompletenessMeter } from '@/components/integrations/data-completeness-meter'
import { SyncHistoryPanel } from '@/components/integrations/sync-history-panel'
import { HealthTrendChart } from '@/components/charts/health-trend-chart'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { EmptyStateCta } from '@/components/dashboard/empty-state-cta'
import { CompanyHeaderCard } from '@/components/dashboard/company-header-card'
import { DashboardHealthBreakdownGrid } from '@/components/dashboard/dashboard-health-breakdown-grid'
import { DashboardAnalysisPanel } from '@/components/dashboard/dashboard-analysis-panel'
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar'
import { RecentReportsList } from '@/components/dashboard/recent-reports-list'
import { IntegrationsTile } from '@/components/dashboard/integrations-tile'
import { TipsWidget } from '@/components/dashboard/tips-widget'
import { DashboardSearchBar } from '@/components/dashboard/dashboard-search-bar'
import { DashboardNotificationsPanel } from '@/components/notifications/dashboard-notifications-panel'
import { useMyCompany } from '@/hooks/use-my-company'
import { useIntegrations } from '@/hooks/use-integrations'
import { useSyncJobs } from '@/hooks/use-sync-jobs'
import {
  useCompanyAggregates,
  hasFinancialSignals,
  hasMarketSignals,
  hasSocialSignals,
} from '@/hooks/use-company-aggregates'
import { useCompanyReports } from '@/hooks/use-analysis'
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner'
import { useAuth } from '@/contexts/auth-context'
import { useVerificationResend } from '@/hooks/use-verification-resend'
import { buildCompletenessSlices, completenessPercent, healthSubscores } from '@/lib/dashboard-utils'
import { asRecord, pickNumber } from '@/lib/safe-data'
import { cn } from '@/lib/utils'
import { useCompanyHealthScores, useComputeHealthScore } from '@/hooks/use-health-scores'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'
import { useDashboardOverviewSafe } from '@/hooks/use-dashboard-overview'
import type { ReportRow } from '@/types/analysis'
import type { DashboardHealthSparkPoint, DashboardReportSnippet } from '@/types/dashboard'
import type { CompanyHealthScoreRow } from '@/types/health-score'

function toSparkPoints(rows: CompanyHealthScoreRow[]): DashboardHealthSparkPoint[] {
  const list = Array.isArray(rows) ? rows : []
  const chronological = [...list].reverse()
  return chronological.map((r) => ({
    scored_at: r.scored_at,
    overall: r.overall,
    financial: r.financial,
    market: r.market,
    brand_social: r.brand_social,
  }))
}

function scoreByLabel(subs: { label: string; value: number }[], label: string): number {
  const hit = subs.find((s) => s.label === label)
  return hit?.value ?? 0
}

function toTipsReport(row: ReportRow | null): DashboardReportSnippet | null {
  if (!row) return null
  return {
    id: row.id,
    company_id: row.company_id,
    status: row.status,
    executive_summary: row.executive_summary,
    created_at: row.created_at,
    analysis_depth: row.analysis_depth,
    health_scores: row.health_scores,
    action_plan: row.action_plan,
    risks: row.risks,
  }
}

export function DashboardPage() {
  const { user, isEmailVerified, isConfigured, session } = useAuth()
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
  const reportsQuery = useCompanyReports(companyId ?? null)
  const reports = Array.isArray(reportsQuery.data) ? reportsQuery.data : []
  const overview = useDashboardOverviewSafe(companyId)

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

  const subs = healthSubscores(company?.health_scores ?? agg?.latestReport?.health_scores ?? {})
  const fallbackFinancial = scoreByLabel(subs, 'Financial')
  const fallbackMarket = scoreByLabel(subs, 'Market')
  const fallbackBrand = scoreByLabel(subs, 'Brand / social')

  const healthSparkline = useMemo((): DashboardHealthSparkPoint[] => {
    if (overview.healthSparkline.length > 0) return overview.healthSparkline
    return toSparkPoints(healthHistory)
  }, [overview.healthSparkline, healthHistory])

  const lastAnalysisAt =
    company?.last_analysis_at ?? agg?.latestReport?.created_at ?? overview.recentReports[0]?.created_at ?? null

  const latestReportId = agg?.latestReport?.id ?? overview.recentReports[0]?.id ?? null

  const revenue = agg?.financials?.revenue ?? overview.financialSnapshot?.revenue ?? null
  const profit = agg?.financials?.profit ?? overview.financialSnapshot?.profit ?? null
  const cash = agg?.financials?.cash ?? overview.financialSnapshot?.cash ?? null

  const tipsReport = toTipsReport(agg?.latestReport ?? null)

  if (isConfigured && session && !companyLoading && !company) {
    return (
      <section className="space-y-6 animate-fade-in-up motion-reduce:animate-none" aria-label="Dashboard onboarding">
        <EmailVerificationBanner
          email={user?.email}
          isVerified={isEmailVerified}
          onResend={() => void resend()}
          isResending={isSending}
          cooldownSeconds={cooldown}
        />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your workspace will appear here once a company is configured.</p>
        </div>
        <EmptyStateCta />
      </section>
    )
  }

  return (
    <section className="space-y-8 animate-fade-in-up motion-reduce:animate-none">
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
        <DashboardSearchBar className="md:max-w-sm" />
      </div>

      {company && companyId ? (
        <QuickActionsBar
          companyId={companyId}
          hasLatestReport={Boolean(latestReportId)}
          latestReportId={latestReportId}
          isRefreshingScore={computeHealth.isPending}
          onRefreshScore={() => {
            if (companyId) void computeHealth.mutateAsync({ companyId })
          }}
        />
      ) : null}

      {staleIntegration ? (
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
      ) : null}

      {!company || !companyId ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DashboardLayout>
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:items-start">
            <div className="min-w-0 space-y-8">
              <CompanyHeaderCard
                company={company}
                overallScore={overall}
                lastAnalysisAt={lastAnalysisAt}
                revenue={revenue}
                profit={profit}
                cash={cash}
              />

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
                        <CacheStatusBadge meta={agg?.pulseCache} isFetching={aggFetching} isStale={aggStale} />
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

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">Health breakdown</h2>
                  <CacheStatusBadge meta={healthPulse} isFetching={healthFetching} isStale={healthStale} />
                </div>
                <p className="mb-4 text-sm text-muted-foreground">Sub-scores with recent history sparklines.</p>
                <DashboardHealthBreakdownGrid
                  healthSparkline={healthSparkline}
                  fallbackFinancial={fallbackFinancial}
                  fallbackMarket={fallbackMarket}
                  fallbackBrand={fallbackBrand}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <DashboardAnalysisPanel
                  reportId={latestReportId}
                  status={agg?.latestReport?.status ?? null}
                  executiveSummary={agg?.latestReport?.executive_summary ?? null}
                  isFetching={aggFetching}
                  isStale={aggStale}
                  pulseCache={agg?.pulseCache}
                />
                <Card className="border-border/80 p-6 shadow-card">
                  <h2 className="mb-2 text-lg font-semibold tracking-tight">Complete your data</h2>
                  <p className="mb-4 text-sm text-muted-foreground">Address gaps to improve score quality and AI output.</p>
                  <ul className="space-y-2 text-sm" aria-label="Incomplete data categories">
                    {(slices ?? []).filter((s) => !s.done).length === 0 ? (
                      <li className="text-muted-foreground">All guided slices satisfied. Nice work.</li>
                    ) : (
                      (slices ?? [])
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
                        ))
                    )}
                  </ul>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <HealthTrendChart
                    data={chartData.length > 0 ? chartData : undefined}
                    overallHistory={overallHistoryPoints.length > 1 ? overallHistoryPoints : undefined}
                  />
                </div>
                <IntegrationsTile integrations={integrations ?? []} />
              </div>

              <RecentReportsList reports={reports} />

              <SyncHistoryPanel jobs={jobs ?? []} isLoading={jobsLoading} />

              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Connect GA4, QuickBooks, LinkedIn, or Stripe under{' '}
                <Link to="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
                  Settings → Integrations
                </Link>{' '}
                to enrich financial, web, social, and billing signals.
              </div>
            </div>

            <aside className="min-w-0 space-y-6 xl:sticky xl:top-24">
              {overview.unreadInboxCount > 0 ? (
                <Card className="border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-medium text-foreground">
                    {overview.unreadInboxCount} unread{' '}
                    {overview.unreadInboxCount === 1 ? 'notification' : 'notifications'}
                  </p>
                  <Button asChild variant="ghost" className="h-auto px-0 text-primary hover:text-primary">
                    <Link to="/notifications">Open inbox</Link>
                  </Button>
                </Card>
              ) : null}
              <TipsWidget completenessSlices={slices} latestReport={tipsReport} />
              <div className={cn('hidden xl:block')}>
                <DashboardNotificationsPanel />
              </div>
            </aside>
          </div>
        </DashboardLayout>
      )}

      <div className={cn('xl:hidden')}>
        <DashboardNotificationsPanel />
      </div>
    </section>
  )
}
