import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { SyncHistoryPanel } from '@/components/integrations/sync-history-panel'
import { useMyCompany } from '@/hooks/use-my-company'
import { useCompanyReports } from '@/hooks/use-analysis'
import { AnalysisHistoryList } from '@/components/analysis/analysis-history-list'
import { useIntegrations } from '@/hooks/use-integrations'
import { useSyncJobs } from '@/hooks/use-sync-jobs'
import {
  useCompanyAggregates,
  hasFinancialSignals,
  hasMarketSignals,
  hasSocialSignals,
} from '@/hooks/use-company-aggregates'
import { buildCompletenessSlices, completenessPercent, healthSubscores } from '@/lib/dashboard-utils'
import { pickNumber, asRecord } from '@/lib/safe-data'

export function CompanyDetailPage() {
  const { data: company, isLoading } = useMyCompany()
  const companyId = company?.id
  const { data: integrations = [] } = useIntegrations(companyId)
  const { data: jobs, isLoading: jobsLoading } = useSyncJobs(companyId)
  const { data: agg, isLoading: aggLoading } = useCompanyAggregates(companyId)
  const { data: companyReports = [] } = useCompanyReports(companyId ?? null)

  if (isLoading) {
    return (
      <section className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </section>
    )
  }

  if (!company) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-semibold">Company workspace</h1>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No company on file yet.</p>
          <Button asChild className="mt-4">
            <Link to="/company/create">Create company</Link>
          </Button>
        </Card>
      </section>
    )
  }

  const slices = buildCompletenessSlices(
    company,
    hasFinancialSignals(agg?.financials),
    hasMarketSignals(agg?.market),
    hasSocialSignals(agg?.social),
    (integrations ?? []).filter((i) => i.status === 'connected').length,
  )
  const pct = completenessPercent(slices)
  const overall = pickNumber(asRecord(company.health_scores).overall)

  return (
    <section className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{company.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {[company.industry, company.stage].filter(Boolean).join(' · ') || 'Complete your profile for richer analysis.'}
          </p>
          {company.website && (
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {company.website}
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="primary" className="gap-2">
            <Link to="/generate">
              <Sparkles className="h-4 w-4" />
              Analyze
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/settings">Integrations</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 transition-shadow duration-200 hover:shadow-lg lg:col-span-2">
          <h2 className="text-lg font-semibold">Health score</h2>
          <p className="text-sm text-muted-foreground">Drill-down from stored scoring model.</p>
          <div className="mt-4 text-4xl font-semibold text-primary">{overall ?? '—'}</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {healthSubscores(company.health_scores).map((s) => (
              <div key={s.label} className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Data completeness</h2>
          <Progress value={pct} className="mt-4" />
          <p className="mt-2 text-sm text-muted-foreground">{pct}% complete</p>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-medium">Connector status</h3>
              <ul className="mt-3 space-y-2 text-sm">
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
              <Button asChild variant="ghost" className="mt-4 w-full">
                <Link to="/settings">Manage integrations</Link>
              </Button>
            </Card>
            <Card className="p-6">
              <h3 className="font-medium">Snapshot signals</h3>
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
        <TabsContent value="financials">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              Edit structured financial metrics used for scoring and AI prompts.
            </p>
            <Button asChild className="mt-4">
              <Link to="/financials">Open financials form</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="market">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Competitors, pricing matrix, and opportunity/threat tags.</p>
            <Button asChild className="mt-4">
              <Link to="/market">Open market data form</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="social">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Channels, engagement, and web traffic inputs.</p>
            <Button asChild className="mt-4">
              <Link to="/social-brand">Open social & brand form</Link>
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="reports">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Analysis runs</h3>
              <Button asChild variant="primary">
                <Link to="/generate">New analysis</Link>
              </Button>
            </div>
            {agg?.latestReport ? (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Latest aggregate: {agg.latestReport.status}</p>
                <Button asChild className="mt-2">
                  <Link to={`/report/${agg.latestReport.id}`}>Open latest</Link>
                </Button>
              </Card>
            ) : null}
            <AnalysisHistoryList reports={Array.isArray(companyReports) ? companyReports : []} />
          </div>
        </TabsContent>
        <TabsContent value="activity">
          <SyncHistoryPanel jobs={jobs ?? []} isLoading={jobsLoading} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
