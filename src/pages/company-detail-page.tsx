import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyDetailShell } from '@/components/company/detail/company-detail-shell'
import { CompanyHeader } from '@/components/company/detail/company-header'
import { HealthScorePanel } from '@/components/company/detail/health-score-panel'
import { DataCompletenessBadge } from '@/components/company/detail/data-completeness-badge'
import { AIAnalysisPanel } from '@/components/company/detail/ai-analysis-panel'
import { ReportsPanel } from '@/components/company/detail/reports-panel'
import { ActivityLogPanel } from '@/components/company/detail/activity-log-panel'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'
import { SaveInputSnapshotPanel } from '@/components/company/save-input-snapshot-panel'
import { CompanyWorkspaceForms } from '@/components/company/company-workspace-forms'
import { FinancialsForm } from '@/components/company/forms/financials-form'
import { MarketDataForm } from '@/components/company/forms/market-data-form'
import { SocialBrandForm } from '@/components/company/forms/social-brand-form'
import { DataIoActivityPanel } from '@/components/data-io/data-io-activity-panel'
import { AnalysisHistoryTimeline } from '@/components/company/analysis-history-timeline'
import { OnboardingWizard } from '@/components/company/onboarding-wizard'
import { useMyCompany } from '@/hooks/use-my-company'
import { useCompanyReports } from '@/hooks/use-analysis'
import { useIntegrations } from '@/hooks/use-integrations'
import { useSyncJobs } from '@/hooks/use-sync-jobs'
import {
  useCompanyAggregates,
  hasFinancialSignals,
  hasMarketSignals,
  hasSocialSignals,
} from '@/hooks/use-company-aggregates'
import { useCompanyHealthScores, useComputeHealthScore } from '@/hooks/use-health-scores'
import { useCompanyActivityFeed } from '@/hooks/use-company-activity-feed'
import { useAuth } from '@/contexts/auth-context'
import {
  buildCompletenessSlices,
  completenessPercent,
  healthSubscores,
  type CompanyDetailTab,
} from '@/lib/dashboard-utils'
import { pickNumber, asRecord } from '@/lib/safe-data'
import type { CompanyHealthScoreRow } from '@/types/health-score'

const TAB_VALUES: CompanyDetailTab[] = ['overview', 'data', 'financials', 'market', 'social', 'reports', 'activity']

function subScoreMap(scores: unknown): Record<string, number> {
  const entries = healthSubscores(scores)
  const m: Record<string, number> = {}
  for (const e of entries) {
    m[e.label] = e.value
  }
  return m
}

function normalizeTab(raw: string | null): CompanyDetailTab {
  if (raw && TAB_VALUES.includes(raw as CompanyDetailTab)) return raw as CompanyDetailTab
  return 'overview'
}

export function CompanyDetailPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = normalizeTab(searchParams.get('tab'))

  const setTab = (next: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('tab', next)
        return p
      },
      { replace: true },
    )
  }

  const { data: company, isLoading } = useMyCompany()
  const companyId = company?.id
  const { data: integrations = [] } = useIntegrations(companyId)
  const { data: jobs, isLoading: jobsLoading } = useSyncJobs(companyId)
  const {
    data: agg,
    isLoading: aggLoading,
    isFetching: aggFetching,
    isStale: aggStale,
  } = useCompanyAggregates(companyId)
  const {
    data: companyReports = [],
    pulseCache: reportsPulse,
    isFetching: reportsFetching,
    isStale: reportsStale,
  } = useCompanyReports(companyId ?? null)
  const {
    data: healthHistory = [],
    isLoading: healthLoading,
    isFetching: healthFetching,
    isStale: healthStale,
    pulseCache: healthPulse,
  } = useCompanyHealthScores(companyId ?? null, 48)
  const computeHealth = useComputeHealthScore()
  const [selectedHealthId, setSelectedHealthId] = useState<string | null>(null)

  const { data: activityFeed = [], isLoading: activityFeedLoading } = useCompanyActivityFeed(
    companyId,
    user?.id,
  )

  const safeHistory = useMemo(
    () => (Array.isArray(healthHistory) ? healthHistory : []) as CompanyHealthScoreRow[],
    [healthHistory],
  )

  const slices = buildCompletenessSlices(
    company,
    hasFinancialSignals(agg?.financials),
    hasMarketSignals(agg?.market),
    hasSocialSignals(agg?.social),
    (integrations ?? []).filter((i) => i.status === 'connected').length,
  )
  const pct = completenessPercent(slices)
  const subMap = subScoreMap(company?.health_scores)
  const overallStored = pickNumber(asRecord(company?.health_scores).overall)

  const latestRow = safeHistory[0]
  const financialVal =
    latestRow?.financial != null && Number.isFinite(Number(latestRow.financial))
      ? Number(latestRow.financial)
      : subMap['Financial'] ?? 0
  const marketVal =
    latestRow?.market != null && Number.isFinite(Number(latestRow.market))
      ? Number(latestRow.market)
      : subMap['Market'] ?? 0
  const brandVal =
    latestRow?.brand_social != null && Number.isFinite(Number(latestRow.brand_social))
      ? Number(latestRow.brand_social)
      : subMap['Brand / social'] ?? 0
  const overallVal =
    latestRow?.overall != null && Number.isFinite(Number(latestRow.overall))
      ? Number(latestRow.overall)
      : overallStored ?? subMap['Overall'] ?? null

  const fin = agg?.financials as Record<string, unknown> | null | undefined
  const monthlyRevenue = fin?.revenue != null ? Number(fin.revenue) : null
  const profitRaw = fin?.profit != null ? Number(fin.profit) : null
  const profitMarginPct =
    monthlyRevenue != null &&
    profitRaw != null &&
    Number.isFinite(monthlyRevenue) &&
    Number.isFinite(profitRaw) &&
    monthlyRevenue !== 0
      ? (profitRaw / monthlyRevenue) * 100
      : null
  const cashBalance = fin?.cash != null ? Number(fin.cash) : null

  const tabParam = searchParams.get('tab')
  useEffect(() => {
    if (tabParam && !TAB_VALUES.includes(tabParam as CompanyDetailTab)) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', 'overview')
          return p
        },
        { replace: true },
      )
    }
  }, [tabParam, setSearchParams])

  if (isLoading) {
    return (
      <section className="space-y-6 animate-fade-in motion-reduce:animate-none">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </section>
    )
  }

  if (!company || !companyId) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Company workspace</h1>
        <p className="text-muted-foreground">
          PulseBoard enforces one company per account. Complete the guided wizard to create your workspace.
        </p>
        <OnboardingWizard mode="create" />
      </section>
    )
  }

  return (
    <CompanyDetailShell>
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Company workspace</h1>
          <p className="mt-1 text-muted-foreground">
            Primary PulseBoard workspace — structured inputs, health scoring, AI analysis, and exports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] gap-2"
            disabled={computeHealth.isPending}
            onClick={() => void computeHealth.mutateAsync({ companyId })}
          >
            <RefreshCw className={`h-4 w-4 ${computeHealth.isPending ? 'animate-spin' : ''}`} aria-hidden />
            Refresh health score
          </Button>
          <Button asChild variant="primary" className="min-h-[44px] gap-2 transition-transform duration-200 hover:scale-[1.02]">
            <Link to="/generate">
              <Sparkles className="h-4 w-4" />
              Generate analysis
            </Link>
          </Button>
          <Button asChild variant="secondary" className="min-h-[44px]">
            <Link to="/settings">Integrations</Link>
          </Button>
        </div>
      </div>

      <CompanyHeader
        company={company}
        monthlyRevenue={monthlyRevenue}
        profitMarginPct={profitMarginPct}
        cashBalance={cashBalance}
        overallHealth={overallVal}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {healthLoading ? (
          <Skeleton className="h-80 w-full lg:col-span-2" />
        ) : (
          <div className="lg:col-span-2">
            <HealthScorePanel
              className="lg:col-span-2"
              pulseCache={healthPulse}
              isFetching={healthFetching}
              isStale={healthStale}
              overall={overallVal}
              financial={financialVal}
              market={marketVal}
              brandSocial={brandVal}
              history={safeHistory}
            />
          </div>
        )}
        <div className="space-y-4">
          <DataCompletenessBadge percent={pct} slices={slices} />
          <Card className="border-border/80 p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">Aggregate cache</p>
            <div className="mt-2">
              <CacheStatusBadge meta={agg?.pulseCache} isFetching={aggFetching} isStale={aggStale} />
            </div>
          </Card>
        </div>
      </div>

      <AIAnalysisPanel report={agg?.latestReport ?? null} companyId={companyId} />

      <SaveInputSnapshotPanel
        companyId={companyId}
        company={company}
        financials={agg?.financials ?? null}
        market={agg?.market ?? null}
        social={agg?.social ?? null}
      />

      <DataIoActivityPanel companyId={companyId} />

      <AnalysisHistoryTimeline
        entries={safeHistory}
        selectedId={selectedHealthId}
        onSelect={(e) => setSelectedHealthId((prev) => (prev === e.id ? null : e.id))}
      />

      <Tabs defaultValue="overview" value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1" aria-label="Company workspace sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data">Edit data</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/80 p-6 shadow-card transition-shadow duration-200 hover:shadow-md">
              <h3 className="font-semibold">Connector status</h3>
              <ul className="mt-3 space-y-2 text-sm" aria-label="Integration connectors">
                {(integrations ?? []).length === 0 ? (
                  <li className="text-muted-foreground">No connectors yet.</li>
                ) : (
                  (integrations ?? []).map((i) => (
                    <li key={i.id} className="flex justify-between border-b border-border/60 py-2 last:border-0">
                      <span className="capitalize">{i.provider}</span>
                      <span className="text-muted-foreground">{i.status}</span>
                    </li>
                  ))
                )}
              </ul>
              <Button asChild variant="ghost" className="mt-4 w-full min-h-[44px]">
                <Link to="/settings">Manage integrations</Link>
              </Button>
            </Card>
            <Card className="border-border/80 p-6 shadow-card transition-shadow duration-200 hover:shadow-md">
              <h3 className="font-semibold">Snapshot signals</h3>
              {aggLoading ? (
                <Skeleton className="mt-4 h-24 w-full" />
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Financials row: {agg?.financials ? 'present' : 'empty'}</li>
                  <li>GA4 analytics: {agg?.analytics ? 'present' : 'empty'}</li>
                  <li>Social: {agg?.social ? 'present' : 'empty'}</li>
                  <li>Billing: {agg?.billing ? 'present' : 'empty'}</li>
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="data" className="mt-6">
          <CompanyWorkspaceForms
            companyId={companyId}
            company={company}
            financials={agg?.financials ?? null}
            market={agg?.market ?? null}
            social={agg?.social ?? null}
          />
        </TabsContent>
        <TabsContent value="financials" className="mt-6 space-y-4">
          <FinancialsForm companyId={companyId} financials={agg?.financials ?? null} />
          <Card className="border-border/80 p-6 shadow-card">
            <p className="text-sm text-muted-foreground">Advanced calculators, uploads, and CAC/LTV live on the dedicated route.</p>
            <Button asChild className="mt-4 min-h-[44px]" variant="secondary">
              <Link to="/financials">Open full financials page</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="market" className="mt-6 space-y-4">
          <MarketDataForm companyId={companyId} market={agg?.market ?? null} />
          <Card className="border-border/80 p-6 shadow-card">
            <p className="text-sm text-muted-foreground">Pricing matrix and threat/opportunity priorities on the dedicated market page.</p>
            <Button asChild className="mt-4 min-h-[44px]" variant="secondary">
              <Link to="/market">Open full market form</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="social" className="mt-6 space-y-4">
          <SocialBrandForm companyId={companyId} social={agg?.social ?? null} />
          <Card className="border-border/80 p-6 shadow-card">
            <p className="text-sm text-muted-foreground">CSV import and extended channel rows on the dedicated social & brand page.</p>
            <Button asChild className="mt-4 min-h-[44px]" variant="secondary">
              <Link to="/social-brand">Open full social form</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <ReportsPanel
            companyId={companyId}
            reports={Array.isArray(companyReports) ? companyReports : []}
            pulseCache={reportsPulse}
            isFetching={reportsFetching}
            isStale={reportsStale}
          />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <ActivityLogPanel
            jobs={jobs ?? []}
            jobsLoading={jobsLoading}
            feed={Array.isArray(activityFeed) ? activityFeed : []}
            feedLoading={activityFeedLoading}
          />
        </TabsContent>
      </Tabs>
    </CompanyDetailShell>
  )
}
