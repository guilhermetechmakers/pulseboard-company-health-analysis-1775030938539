import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { SyncHistoryPanel } from '@/components/integrations/sync-history-panel'
import { ProfileSummaryCard } from '@/components/company/profile-summary-card'
import { HealthScoreCard } from '@/components/company/health-score-card'
import { AnalysisHistoryPanel } from '@/components/analysis/analysis-history-panel'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'
import { AnalysisHistoryTimeline } from '@/components/company/analysis-history-timeline'
import { SaveInputSnapshotPanel } from '@/components/company/save-input-snapshot-panel'
import { CompanyWorkspaceForms } from '@/components/company/company-workspace-forms'
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
import { buildCompletenessSlices, completenessPercent, healthSubscores } from '@/lib/dashboard-utils'
import { pickNumber, asRecord } from '@/lib/safe-data'
import type { CompanyHealthScoreRow } from '@/types/health-score'

function subScoreMap(scores: unknown): Record<string, number> {
  const entries = healthSubscores(scores)
  const m: Record<string, number> = {}
  for (const e of entries) {
    m[e.label] = e.value
  }
  return m
}

export function CompanyDetailPage() {
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
        <Card className="p-8 text-center shadow-card">
          <p className="text-muted-foreground">No company on file yet.</p>
          <Button asChild className="mt-4 min-h-[44px] transition-transform duration-200 hover:scale-[1.02]">
            <Link to="/company/create">Create company</Link>
          </Button>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-8 animate-fade-in-up motion-reduce:animate-none">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Company workspace</h1>
          <p className="mt-1 text-muted-foreground">
            Primary PulseBoard workspace — edit structured inputs, refresh rule-based scores, and launch AI analysis.
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

      <ProfileSummaryCard company={company} />

      <div className="grid gap-6 lg:grid-cols-3">
        {healthLoading ? (
          <Skeleton className="h-80 w-full lg:col-span-2" />
        ) : (
          <div className="lg:col-span-2">
            <HealthScoreCard
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
        <Card className="border-border/80 p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Data completeness</h2>
            <CacheStatusBadge meta={agg?.pulseCache} isFetching={aggFetching} isStale={aggStale} />
          </div>
          <Progress value={pct} className="mt-4" />
          <p className="mt-2 text-sm text-muted-foreground">{pct}% complete</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Guided slices include profile, financials, market, social, and at least one connector.
          </p>
        </Card>
      </div>

      <SaveInputSnapshotPanel
        companyId={companyId}
        company={company}
        financials={agg?.financials ?? null}
        market={agg?.market ?? null}
        social={agg?.social ?? null}
      />

      <AnalysisHistoryTimeline
        entries={safeHistory}
        selectedId={selectedHealthId}
        onSelect={(e) => setSelectedHealthId((prev) => (prev === e.id ? null : e.id))}
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data">Edit data</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
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
        <TabsContent value="data">
          <CompanyWorkspaceForms
            companyId={companyId}
            company={company}
            financials={agg?.financials ?? null}
            market={agg?.market ?? null}
            social={agg?.social ?? null}
          />
        </TabsContent>
        <TabsContent value="financials">
          <Card className="border-border/80 p-6 shadow-card">
            <p className="text-sm text-muted-foreground">
              Full-page editor with uploads and calculators lives on the dedicated financials route.
            </p>
            <Button asChild className="mt-4 min-h-[44px]">
              <Link to="/financials">Open financials form</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="market">
          <Card className="border-border/80 p-6 shadow-card">
            <p className="text-sm text-muted-foreground">Structured competitor matrix and threat/opportunity tags.</p>
            <Button asChild className="mt-4 min-h-[44px]">
              <Link to="/market">Open market data form</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="social">
          <Card className="border-border/80 p-6 shadow-card">
            <p className="text-sm text-muted-foreground">Channel metrics, cadence, and traffic inputs.</p>
            <Button asChild className="mt-4 min-h-[44px]">
              <Link to="/social-brand">Open social & brand form</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="reports">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold tracking-tight">Analysis runs</h3>
              <Button asChild variant="primary" className="min-h-[44px]">
                <Link to="/generate">New analysis</Link>
              </Button>
            </div>
            {agg?.latestReport ? (
              <Card className="border-border/80 p-4 shadow-card">
                <p className="text-sm text-muted-foreground">Latest aggregate: {agg.latestReport.status}</p>
                <Button asChild className="mt-2 min-h-[44px]">
                  <Link to={`/report/${agg.latestReport.id}`}>Open latest</Link>
                </Button>
              </Card>
            ) : null}
            <AnalysisHistoryPanel
              companyId={companyId}
              reports={Array.isArray(companyReports) ? companyReports : []}
              pulseCache={reportsPulse}
              isFetching={reportsFetching}
              isStale={reportsStale}
            />
          </div>
        </TabsContent>
        <TabsContent value="activity">
          <SyncHistoryPanel jobs={jobs ?? []} isLoading={jobsLoading} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
