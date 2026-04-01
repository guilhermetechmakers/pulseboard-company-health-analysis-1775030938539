import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Bell } from 'lucide-react'
import { PageTemplate } from '@/components/layout/page-template'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataCompletenessChecklist } from '@/components/generate-analysis/data-completeness-checklist'
import { AnalysisOptionsPanel } from '@/components/generate-analysis/analysis-options-panel'
import { ConsentSection } from '@/components/generate-analysis/consent-section'
import { StartAnalysisButton } from '@/components/generate-analysis/start-analysis-button'
import { ProgressPanel } from '@/components/generate-analysis/progress-panel'
import { ResultsSummaryCard } from '@/components/generate-analysis/results-summary-card'
import { NotificationsHintCard } from '@/components/generate-analysis/notifications-hint-card'
import { useCompanyAnalysisContext, useCompleteness, useRunAnalysisJob } from '@/hooks/use-analysis'
import { useMyCompany } from '@/hooks/use-my-company'
import { useAuth } from '@/contexts/auth-context'
import { coreAnalysisReadiness, completenessPercent } from '@/lib/analysis-completeness'
import type { AnalysisDepth } from '@/types/analysis'
import type { AnalysisStatusResults } from '@/types/analysis-job'

const emailSchema = z.string().email()

export function GenerateAnalysisPage() {
  const { user } = useAuth()
  const { data: company, isLoading: companyLoading } = useMyCompany()
  const companyId = company?.id ?? null
  const { data: ctx } = useCompanyAnalysisContext(companyId)
  const { fields } = useCompleteness(company, ctx)
  const runAnalysisJob = useRunAnalysisJob()

  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('standard')
  const [benchmarking, setBenchmarking] = useState(false)
  const [sendToEmail, setSendToEmail] = useState(false)
  const [reportEmail, setReportEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [consent, setConsent] = useState(false)

  const [jobUi, setJobUi] = useState<{ progress: number; logs: string[]; status: string }>({
    progress: 0,
    logs: [],
    status: '',
  })
  const [completed, setCompleted] = useState<{
    reportId: string | null
    results?: AnalysisStatusResults | null
  } | null>(null)

  const safeFields = useMemo(() => (Array.isArray(fields) ? fields : []), [fields])
  const readiness = useMemo(() => coreAnalysisReadiness(safeFields), [safeFields])
  const pct = completenessPercent(safeFields)

  const checklistItems = useMemo(
    () => [
      {
        id: 'profile',
        label: 'Profile data',
        dot: readiness.profileOk ? ('ready' as const) : ('missing' as const),
        description: 'Company name, industry, and positioning notes.',
      },
      {
        id: 'financial',
        label: 'Financial data',
        dot: readiness.financialOk ? ('ready' as const) : ('missing' as const),
        description: 'At least revenue or cash signals.',
      },
      {
        id: 'market',
        label: 'Market data',
        dot: readiness.marketOk ? ('ready' as const) : ('missing' as const),
        description: 'Competitor or market context.',
      },
      {
        id: 'social',
        label: 'Social & brand data',
        dot: readiness.socialOk ? ('ready' as const) : ('missing' as const),
        description: 'Followers or engagement proxies.',
      },
      {
        id: 'consent',
        label: 'AI processing consent',
        dot: consent ? ('ready' as const) : ('missing' as const),
        description: 'Required before the engine runs.',
      },
    ],
    [readiness, consent],
  )

  const canSubmit =
    Boolean(companyId) &&
    readiness.allCoreMet &&
    consent &&
    !runAnalysisJob.isPending &&
    (!sendToEmail || emailSchema.safeParse(reportEmail.trim()).success)

  const handleSendToEmailChange = (v: boolean) => {
    setSendToEmail(v)
    setEmailError('')
    if (v && typeof user?.email === 'string' && user.email && !reportEmail.trim()) {
      setReportEmail(user.email)
    }
  }

  const handleStart = async () => {
    if (!companyId) return
    setEmailError('')
    if (sendToEmail && !emailSchema.safeParse(reportEmail.trim()).success) {
      setEmailError('Enter a valid email address.')
      return
    }
    if (!readiness.allCoreMet || !consent) return

    setCompleted(null)
    setJobUi({ progress: 0, logs: [], status: 'queued' })

    try {
      const out = await runAnalysisJob.mutateAsync({
        companyId,
        depth: analysisDepth,
        includeBenchmarks: benchmarking,
        sendToEmail,
        email: sendToEmail ? reportEmail.trim() : undefined,
        consentGiven: consent,
        onProgress: (s) => {
          setJobUi({
            progress: typeof s.progress === 'number' ? s.progress : 0,
            logs: Array.isArray(s.logs) ? [...s.logs] : [],
            status: s.status,
          })
        },
      })
      const fr = out.final
      const finalRid = typeof fr.reportId === 'string' && fr.reportId.trim() ? fr.reportId.trim() : null
      setCompleted({
        reportId: finalRid,
        results: fr.results ?? null,
      })
      setJobUi((u) => ({
        ...u,
        progress: 100,
        status: 'completed',
      }))
    } catch {
      setJobUi((u) => ({ ...u, status: 'failed' }))
    }
  }

  const statusLabel =
    jobUi.status === 'completed'
      ? 'Completed'
      : jobUi.status === 'failed'
        ? 'Failed'
        : jobUi.status === 'running'
          ? 'Running'
          : jobUi.status === 'queued'
            ? 'Queued'
            : runAnalysisJob.isPending
              ? 'Working'
              : 'Idle'

  const showProgress =
    runAnalysisJob.isPending ||
    jobUi.status === 'queued' ||
    jobUi.status === 'running' ||
    jobUi.status === 'failed'

  return (
    <PageTemplate
      title="Generate analysis"
      description="Validate completeness, choose analysis depth, capture consent, and monitor the AI pipeline with live logs."
    >
      <Card className="mb-6 border-dashed border-border p-4 text-sm text-muted-foreground">
        Without Supabase env vars, PulseBoard runs a <span className="font-medium text-foreground">session mock job</span>{' '}
        so you can exercise the UI; connect Supabase for real AI analysis and notifications.
      </Card>

      {!companyId && !companyLoading ? (
        <Card className="mb-6 space-y-3 border-dashed p-6">
          <p className="font-medium text-foreground">No company on file</p>
          <p className="text-sm text-muted-foreground">Create your company workspace first, then return here to run analysis.</p>
          <Button type="button" variant="secondary" className="min-h-[44px]" asChild>
            <Link to="/company/create">Create company</Link>
          </Button>
        </Card>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Job completion also surfaces in Sonner and your{' '}
          <Link to="/notifications" className="font-medium text-primary underline-offset-4 hover:underline">
            notifications inbox
          </Link>
          .
        </p>
        <Button type="button" variant="secondary" className="min-h-[44px] gap-2" asChild>
          <Link to="/notifications">
            <Bell className="h-4 w-4" aria-hidden />
            Inbox
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-2">
          <DataCompletenessChecklist items={checklistItems} percent={pct} />
          <NotificationsHintCard />
          {!readiness.allCoreMet ? (
            <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-950 dark:text-amber-100">
              <p className="font-medium">Finish required slices</p>
              <p className="mt-1 text-muted-foreground">
                Profile, financials, market, and social minimums must be met before Start analysis unlocks.
              </p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4 xl:col-span-3">
          <AnalysisOptionsPanel
            analysisDepth={analysisDepth}
            onDepthChange={setAnalysisDepth}
            benchmarking={benchmarking}
            onBenchmarkingChange={setBenchmarking}
            sendToEmail={sendToEmail}
            onSendToEmailChange={handleSendToEmailChange}
            email={reportEmail}
            onEmailChange={(v) => {
              setReportEmail(v)
              setEmailError('')
            }}
            emailError={emailError}
            disabled={runAnalysisJob.isPending}
            completenessPercent={pct}
          />

          <ConsentSection consent={consent} onConsentChange={setConsent} disabled={runAnalysisJob.isPending} />

          <div className="flex flex-wrap items-center gap-3">
            <StartAnalysisButton
              disabled={!canSubmit}
              isLoading={runAnalysisJob.isPending}
              onClick={() => void handleStart()}
            />
            {completed ? (
              <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setCompleted(null)}>
                Dismiss summary
              </Button>
            ) : null}
          </div>

          <ProgressPanel
            progress={jobUi.progress}
            logs={jobUi.logs}
            isVisible={showProgress}
            statusLabel={statusLabel}
          />

          {jobUi.status === 'failed' ? (
            <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              The analysis job did not complete. Check your notifications inbox for details or try again.
            </Card>
          ) : null}

          {completed ? (
            <ResultsSummaryCard reportId={completed.reportId} results={completed.results ?? undefined} />
          ) : null}
        </div>
      </div>
    </PageTemplate>
  )
}
