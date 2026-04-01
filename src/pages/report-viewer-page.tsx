import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageTemplate } from '@/components/layout/page-template'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportViewerEditorBlock } from '@/components/analysis/report-viewer-editor-block'
import { SnapshotManager } from '@/components/analysis/snapshot-manager'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'
import { useCreateReportSnapshot, useReport, useReportSnapshots, useUpdateReportSections } from '@/hooks/use-analysis'
import { supabase } from '@/lib/supabase'

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportViewerPage() {
  const { id, reportId: reportIdParam } = useParams()
  const reportId = id ?? reportIdParam
  const {
    data: report,
    isLoading,
    error,
    pulseCache: reportPulse,
    isFetching: reportFetching,
    isStale: reportStale,
  } = useReport(reportId)
  const companyId = report?.company_id
  const { data: companyMeta } = useQuery({
    queryKey: ['company-meta', companyId],
    enabled: Boolean(supabase && companyId),
    queryFn: async () => {
      if (!supabase || !companyId) return null
      const { data, error: qErr } = await supabase.from('companies').select('name, industry').eq('id', companyId).maybeSingle()
      if (qErr) throw new Error(qErr.message)
      return data
    },
  })
  const { data: snapshots } = useReportSnapshots(reportId)
  const updateReport = useUpdateReportSections()
  const createSnapshot = useCreateReportSnapshot()

  const swot = useMemo(() => {
    const raw = report?.swot
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return { strengths: [] as string[], weaknesses: [] as string[], opportunities: [] as string[], threats: [] as string[] }
    }
    const o = raw as Record<string, unknown>
    return {
      strengths: asStringArray(o.strengths),
      weaknesses: asStringArray(o.weaknesses),
      opportunities: asStringArray(o.opportunities),
      threats: asStringArray(o.threats),
    }
  }, [report?.swot])

  const [rawOpen, setRawOpen] = useState(false)

  if (!supabase) {
    return (
      <PageTemplate title="Report viewer" description="Review and edit AI-generated sections.">
        <Card className="p-6 text-sm text-muted-foreground">Supabase is not configured.</Card>
      </PageTemplate>
    )
  }

  if (!reportId) {
    return (
      <PageTemplate title="Report viewer" description="Missing report id.">
        <Link to="/dashboard" className="inline-flex">
          <Button variant="secondary" type="button">
            Back to dashboard
          </Button>
        </Link>
      </PageTemplate>
    )
  }

  if (isLoading) {
    return (
      <PageTemplate title="Loading report" description="Fetching analysis output.">
        <Card className="h-40 animate-pulse bg-muted motion-reduce:animate-none" />
      </PageTemplate>
    )
  }

  if (error || !report) {
    return (
      <PageTemplate title="Report unavailable" description="We could not load this report.">
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-primary underline">
          Return to dashboard
        </Link>
      </PageTemplate>
    )
  }

  const exec = report.executive_summary ?? ''
  const fin = report.financial_analysis ?? ''
  const market = report.market_analysis ?? ''
  const social = report.social_analysis ?? ''
  const payloadJson = JSON.stringify(report.payload ?? {}, null, 2)

  const safeSnapshots = Array.isArray(snapshots) ? snapshots : []

  const companyName = typeof companyMeta?.name === 'string' ? companyMeta.name : null
  const companyIndustry = typeof companyMeta?.industry === 'string' ? companyMeta.industry : null

  return (
    <PageTemplate
      title="Report viewer"
      description={`${companyName ?? 'Company'}${companyIndustry ? ` · ${companyIndustry}` : ''} · Analysis ${report.status} · ${report.analysis_depth ?? 'standard'} · ${new Date(report.created_at).toLocaleString()}`}
    >
      <Card className="mb-6 border-border/80 p-5 shadow-card no-print">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Report header</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{companyName ?? 'Company report'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generated {new Date(report.created_at).toLocaleString()}
              {report.analysis_depth ? ` · Depth: ${report.analysis_depth}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CacheStatusBadge meta={reportPulse} isFetching={reportFetching} isStale={reportStale} />
            <Badge variant="outline" className="capitalize">
              {report.status}
            </Badge>
            {report.benchmarking_enabled ? <Badge variant="warning">Benchmarking</Badge> : null}
          </div>
        </div>
      </Card>

      <div className="mb-6 flex flex-wrap gap-2 no-print">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const md = [
              `# Executive summary`,
              exec,
              `## SWOT`,
              `### Strengths`,
              ...(swot.strengths ?? []).map((s) => `- ${s}`),
              `### Weaknesses`,
              ...(swot.weaknesses ?? []).map((s) => `- ${s}`),
              `### Opportunities`,
              ...(swot.opportunities ?? []).map((s) => `- ${s}`),
              `### Threats`,
              ...(swot.threats ?? []).map((s) => `- ${s}`),
              `## Financial`,
              fin,
              `## Market`,
              market,
              `## Social`,
              social,
            ].join('\n\n')
            downloadText(`pulseboard-report-${report.id}.md`, md, 'text/markdown')
          }}
        >
          Export Markdown
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadText(`pulseboard-report-${report.id}.json`, payloadJson, 'application/json')}
        >
          Export JSON snapshot
        </Button>
        <Link to={`/export/${report.id}`} className="inline-flex">
          <Button type="button" variant="ghost">
            PDF settings
          </Button>
        </Link>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          Print layout
        </Button>
      </div>

      <Tabs defaultValue="sections" className="no-print">
        <TabsList>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="swot">SWOT</TabsTrigger>
          <TabsTrigger value="risks">Risks & actions</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <ReportViewerEditorBlock
            title="Executive summary"
            value={exec}
            isSaving={updateReport.isPending}
            autoSaveDebounceMs={1600}
            onSave={async (next) => {
              await updateReport.mutateAsync({ reportId: report.id, patch: { executive_summary: next } })
            }}
          />
          <ReportViewerEditorBlock
            title="Financial analysis"
            value={fin}
            isSaving={updateReport.isPending}
            autoSaveDebounceMs={1600}
            onSave={async (next) => {
              await updateReport.mutateAsync({ reportId: report.id, patch: { financial_analysis: next } })
            }}
          />
          <ReportViewerEditorBlock
            title="Market analysis"
            value={market}
            isSaving={updateReport.isPending}
            autoSaveDebounceMs={1600}
            onSave={async (next) => {
              await updateReport.mutateAsync({ reportId: report.id, patch: { market_analysis: next } })
            }}
          />
          <ReportViewerEditorBlock
            title="Social & brand analysis"
            value={social}
            isSaving={updateReport.isPending}
            autoSaveDebounceMs={1600}
            onSave={async (next) => {
              await updateReport.mutateAsync({ reportId: report.id, patch: { social_analysis: next } })
            }}
          />
        </TabsContent>

        <TabsContent value="swot">
          <div className="grid gap-4 md:grid-cols-2">
            {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map((key) => (
              <Card key={key} className="p-4">
                <h3 className="mb-2 capitalize text-base font-semibold">{key}</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {(swot[key] ?? []).length === 0 ? <li className="list-none italic">No items</li> : null}
                  {(swot[key] ?? []).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 text-base font-semibold">Top risks</h3>
            <ul className="space-y-2 text-sm">
              {(Array.isArray(report.risks) ? report.risks : []).map((r, i) => {
                const row = r as { title?: string; severity?: string; detail?: string }
                return (
                  <li key={`${row.title ?? 'risk'}-${i}`} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{row.title ?? 'Risk'}</p>
                    <p className="text-xs text-warning">{row.severity ?? ''}</p>
                    <p className="text-muted-foreground">{row.detail ?? ''}</p>
                  </li>
                )
              })}
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-base font-semibold">Opportunities</h3>
            <ul className="space-y-2 text-sm">
              {(Array.isArray(report.opportunities) ? report.opportunities : []).map((r, i) => {
                const row = r as { title?: string; impact?: string; detail?: string }
                return (
                  <li key={`${row.title ?? 'opp'}-${i}`} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{row.title ?? 'Opportunity'}</p>
                    <p className="text-xs text-accent">{row.impact ?? ''}</p>
                    <p className="text-muted-foreground">{row.detail ?? ''}</p>
                  </li>
                )
              })}
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-base font-semibold">Action plan</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {(Array.isArray(report.action_plan) ? report.action_plan : []).map((r, i) => {
                const row = r as { priority?: number; action?: string; rationale?: string }
                return (
                  <li key={`${row.action ?? 'act'}-${i}`}>
                    <p className="font-medium">{row.action ?? 'Action'}</p>
                    <p className="text-muted-foreground">{row.rationale ?? ''}</p>
                  </li>
                )
              })}
            </ol>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots">
          <SnapshotManager
            snapshots={safeSnapshots}
            isCreating={createSnapshot.isPending}
            onCreate={async (label) => {
              await createSnapshot.mutateAsync({
                reportId: report.id,
                label,
                sections: {
                  executive_summary: report.executive_summary ?? '',
                  financial_analysis: report.financial_analysis ?? '',
                  market_analysis: report.market_analysis ?? '',
                  social_analysis: report.social_analysis ?? '',
                  swot_json: JSON.stringify(report.swot ?? {}),
                },
              })
            }}
          />
        </TabsContent>
      </Tabs>

      <Card className="print-report-root mt-8 hidden p-4 print:block">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h2 className="text-foreground">Print-ready summary</h2>
          <h3>Executive summary</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">{exec || '—'}</p>
          <h3>Financial</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">{fin || '—'}</p>
          <h3>Market</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">{market || '—'}</p>
          <h3>Social &amp; brand</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">{social || '—'}</p>
        </div>
      </Card>

      <Card className="mt-8 p-4 no-print">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left text-sm font-semibold"
          onClick={() => setRawOpen((o) => !o)}
          aria-expanded={rawOpen}
        >
          Raw AI payload & metadata
          <span className="text-muted-foreground">{rawOpen ? 'Hide' : 'Show'}</span>
        </button>
        {rawOpen ? (
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-muted p-3 text-xs motion-reduce:scroll-auto">
            {payloadJson}
          </pre>
        ) : null}
      </Card>
    </PageTemplate>
  )
}
