import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Link2, Share2 } from 'lucide-react'
import { PageTemplate } from '@/components/layout/page-template'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReportViewerEditorBlock, type ReportEditorHandle } from '@/components/analysis/report-viewer-editor-block'
import { SnapshotManager } from '@/components/analysis/snapshot-manager'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'
import {
  useCreateReportSnapshot,
  useReport,
  useReportHealthForAnalysis,
  useReportSnapshots,
  useRestoreReportSnapshot,
  useUpdateReportSections,
  useUpdateReportSwot,
} from '@/hooks/use-analysis'
import { useMyCompany } from '@/hooks/use-my-company'
import { supabase } from '@/lib/supabase'
import { ReportSectionNav } from '@/components/report-viewer/report-section-nav'
import { ReportViewerHealthStrip } from '@/components/report-viewer/report-viewer-health-strip'
import { ReportViewerKpiCharts } from '@/components/report-viewer/report-viewer-kpi-charts'
import { ReportViewerExportStrip } from '@/components/report-viewer/report-viewer-export-strip'
import { ReportViewerNotificationsChip } from '@/components/report-viewer/report-viewer-notifications-chip'
import { SwotQuadrantEditor } from '@/components/report-viewer/swot-quadrant-editor'
import { REPORT_VIEWER_NAV, parseReportHealthScores } from '@/types/report-viewer'
import { cn } from '@/lib/utils'

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

function statusLabel(status: string): string {
  if (status === 'in_progress') return 'generating'
  if (status === 'completed') return 'completed'
  return status || 'draft'
}

export function ReportViewerPage() {
  const { id, reportId: reportIdParam } = useParams()
  const reportId = id ?? reportIdParam
  const { data: myCompany } = useMyCompany()
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
  const { data: healthBundle, isLoading: healthLoading } = useReportHealthForAnalysis(reportId)
  const updateReport = useUpdateReportSections()
  const updateSwot = useUpdateReportSwot()
  const createSnapshot = useCreateReportSnapshot()
  const restoreSnapshot = useRestoreReportSnapshot()

  const execRef = useRef<ReportEditorHandle>(null)
  const finRef = useRef<ReportEditorHandle>(null)
  const mktRef = useRef<ReportEditorHandle>(null)
  const socRef = useRef<ReportEditorHandle>(null)

  const [rawOpen, setRawOpen] = useState(false)

  const healthRow = healthBundle?.row ?? null
  const embedded = healthBundle?.embedded ?? {}
  const parsedHealth = useMemo(
    () =>
      parseReportHealthScores(
        healthRow
          ? {
              overall: healthRow.overall,
              financial: healthRow.financial,
              market: healthRow.market,
              brand_social: healthRow.brand_social,
              benchmarks: healthRow.benchmarks,
            }
          : null,
        embedded,
      ),
    [healthRow, embedded],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 's') return
      e.preventDefault()
      const refs = [execRef, finRef, mktRef, socRef]
      void Promise.all(
        refs.map(async (r) => {
          await r.current?.flushSave()
        }),
      ).then(() => toast.message('Sections synced'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
        <Card className="h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
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

  if (myCompany?.id && report.company_id !== myCompany.id) {
    return <Navigate to="/company/scope-notice?reason=report" replace />
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
      description={`${companyName ?? 'Company'}${companyIndustry ? ` · ${companyIndustry}` : ''}`}
    >
      <div className="no-print mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {REPORT_VIEWER_NAV.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="secondary"
            className="h-9 shrink-0 rounded-full px-3 text-sm"
            onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ReportSectionNav items={REPORT_VIEWER_NAV} />

        <div className="min-w-0 flex-1 space-y-8 animate-fade-in motion-reduce:animate-none">
          <Card className="border-border/80 p-5 shadow-card no-print">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Report header</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{companyName ?? 'Company report'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generated {new Date(report.created_at).toLocaleString()}
                  {report.analysis_depth ? ` · Depth: ${report.analysis_depth}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ReportViewerNotificationsChip />
                <CacheStatusBadge meta={reportPulse} isFetching={reportFetching} isStale={reportStale} />
                <Badge variant="outline" className="capitalize">
                  {statusLabel(report.status)}
                </Badge>
                {report.benchmarking_enabled ? <Badge variant="warning">Benchmarking</Badge> : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 gap-2 px-3 text-sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href)
                    toast.success('Shareable link copied')
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </div>
          </Card>

          <ReportViewerHealthStrip scores={parsedHealth} isLoading={healthLoading} />
          <ReportViewerKpiCharts scores={parsedHealth} />

          <div className="no-print flex flex-wrap gap-2">
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
              <Button type="button" variant="ghost" className="gap-2">
                <Link2 className="h-4 w-4" />
                PDF settings
              </Button>
            </Link>
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              Print layout
            </Button>
          </div>

          <ReportViewerEditorBlock
            ref={execRef}
            sectionId="section-exec"
            title="Executive summary"
            value={exec}
            isSaving={updateReport.isPending || updateSwot.isPending}
            autoSaveDebounceMs={1600}
            onSave={async (next) => {
              await updateReport.mutateAsync({ reportId: report.id, sectionKey: 'executive_summary', content: next })
            }}
          />

          <SwotQuadrantEditor
            swot={report.swot ?? {}}
            isSaving={updateSwot.isPending}
            onSave={async (next) => {
              await updateSwot.mutateAsync({ reportId: report.id, swot: next })
            }}
          />

          <ReportViewerEditorBlock
            ref={finRef}
            sectionId="section-fin"
            title="Financial analysis"
            value={fin}
            isSaving={updateReport.isPending || updateSwot.isPending}
            autoSaveDebounceMs={1600}
            onSave={async (next) => {
              await updateReport.mutateAsync({ reportId: report.id, sectionKey: 'financial_analysis', content: next })
            }}
          />
          <ReportViewerEditorBlock
            ref={mktRef}
            sectionId="section-mkt"
            title="Market analysis"
            value={market}
            isSaving={updateReport.isPending || updateSwot.isPending}
            autoSaveDebounceMs={1600}
            onSave={async (next) => {
              await updateReport.mutateAsync({ reportId: report.id, sectionKey: 'market_analysis', content: next })
            }}
          />
          <ReportViewerEditorBlock
            ref={socRef}
            sectionId="section-soc"
            title="Social & brand analysis"
            value={social}
            isSaving={updateReport.isPending || updateSwot.isPending}
            autoSaveDebounceMs={1600}
            onSave={async (next) => {
              await updateReport.mutateAsync({ reportId: report.id, sectionKey: 'social_analysis', content: next })
            }}
          />

          <Card id="section-risks" className={cn('scroll-mt-24 space-y-4 border-border/80 p-4 shadow-card')}>
            <h3 className="text-base font-semibold text-foreground">Top risks</h3>
            <ul className="space-y-2 text-sm">
              {(Array.isArray(report.risks) ? report.risks : []).map((r, i) => {
                const row = r as { title?: string; severity?: string; detail?: string }
                return (
                  <li key={`${row.title ?? 'risk'}-${i}`} className="rounded-xl border border-border/80 p-3 transition-shadow hover:shadow-card">
                    <p className="font-medium text-foreground">{row.title ?? 'Risk'}</p>
                    <p className="text-xs text-warning">{row.severity ?? ''}</p>
                    <p className="text-muted-foreground">{row.detail ?? ''}</p>
                  </li>
                )
              })}
            </ul>
            <h3 className="text-base font-semibold text-foreground">Opportunities</h3>
            <ul className="space-y-2 text-sm">
              {(Array.isArray(report.opportunities) ? report.opportunities : []).map((r, i) => {
                const row = r as { title?: string; impact?: string; detail?: string }
                return (
                  <li key={`${row.title ?? 'opp'}-${i}`} className="rounded-xl border border-border/80 p-3 transition-shadow hover:shadow-card">
                    <p className="font-medium text-foreground">{row.title ?? 'Opportunity'}</p>
                    <p className="text-xs text-accent">{row.impact ?? ''}</p>
                    <p className="text-muted-foreground">{row.detail ?? ''}</p>
                  </li>
                )
              })}
            </ul>
            <h3 className="text-base font-semibold text-foreground">Action plan</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {(Array.isArray(report.action_plan) ? report.action_plan : []).map((r, i) => {
                const row = r as { priority?: number; action?: string; rationale?: string }
                return (
                  <li key={`${row.action ?? 'act'}-${i}`}>
                    <p className="font-medium text-foreground">{row.action ?? 'Action'}</p>
                    <p className="text-muted-foreground">{row.rationale ?? ''}</p>
                  </li>
                )
              })}
            </ol>
          </Card>

          <SnapshotManager
            snapshots={safeSnapshots}
            isCreating={createSnapshot.isPending}
            isRestoring={restoreSnapshot.isPending}
            onCreate={async (snapLabel, snapNotes) => {
              await createSnapshot.mutateAsync({
                reportId: report.id,
                label: snapLabel,
                notes: snapNotes || undefined,
                sections: {
                  executive_summary: report.executive_summary ?? '',
                  financial_analysis: report.financial_analysis ?? '',
                  market_analysis: report.market_analysis ?? '',
                  social_analysis: report.social_analysis ?? '',
                  swot_json: JSON.stringify(report.swot ?? {}),
                },
              })
            }}
            onRestore={async (snap) => {
              await restoreSnapshot.mutateAsync({ reportId: report.id, snapshot: snap })
            }}
          />

          <ReportViewerExportStrip reportId={report.id} />

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

          <Card className="mt-8 border-border/80 p-4 no-print">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground"
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
        </div>
      </div>
    </PageTemplate>
  )
}
