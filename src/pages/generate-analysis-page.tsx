import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTemplate } from '@/components/layout/page-template'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AiAnalysisComposer } from '@/components/analysis/ai-analysis-composer'
import { ProgressStepper } from '@/components/analysis/progress-stepper'
import {
  useCompanyAnalysisContext,
  useCompleteness,
  useRunAnalysis,
  useUserCompany,
} from '@/hooks/use-analysis'
import { supabase } from '@/lib/supabase'
import type { AnalysisDepth } from '@/types/analysis'

const STEPS = [
  { id: 'validate', label: 'Validate inputs' },
  { id: 'aggregate', label: 'Aggregate company data' },
  { id: 'llm', label: 'AI reasoning' },
  { id: 'persist', label: 'Save report' },
]

export function GenerateAnalysisPage() {
  const navigate = useNavigate()
  const { data: company, isLoading: companyLoading } = useUserCompany()
  const companyId = company?.id ?? null
  const { data: ctx } = useCompanyAnalysisContext(companyId)
  const { fields, percent } = useCompleteness(company, ctx)
  const runAnalysis = useRunAnalysis()

  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('standard')
  const [benchmarking, setBenchmarking] = useState(false)
  const [consent, setConsent] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [simulatedProgress, setSimulatedProgress] = useState(0)

  const safeFields = useMemo(() => (Array.isArray(fields) ? fields : []), [fields])

  useEffect(() => {
    if (!runAnalysis.isPending) {
      setStepIndex(0)
      setSimulatedProgress(0)
      return
    }
    setStepIndex(0)
    setSimulatedProgress(15)
    const t1 = window.setTimeout(() => {
      setStepIndex(1)
      setSimulatedProgress(35)
    }, 600)
    const t2 = window.setTimeout(() => {
      setStepIndex(2)
      setSimulatedProgress(65)
    }, 1400)
    const t3 = window.setTimeout(() => {
      setStepIndex(3)
      setSimulatedProgress(88)
    }, 2200)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [runAnalysis.isPending])

  const canSubmit = Boolean(companyId) && consent && !runAnalysis.isPending

  if (!supabase) {
    return (
      <PageTemplate
        title="Generate analysis"
        description="Configure depth, benchmarking, and consent — then run the AI health engine."
      >
        <Card className="border-dashed p-6 text-sm text-muted-foreground">
          Connect Supabase (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) to run analyses.
        </Card>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Generate analysis"
      description="Validate completeness, choose analysis depth, capture consent, and monitor the AI pipeline."
    >
      {!companyId && !companyLoading ? (
        <Card className="space-y-3 border-dashed p-6">
          <p className="font-medium text-foreground">No company on file</p>
          <p className="text-sm text-muted-foreground">Create your company workspace first, then return here to run analysis.</p>
          <Button type="button" variant="secondary" onClick={() => navigate('/company/create')}>
            Create company
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-2">
          <Card className="p-4">
            <h3 className="text-base font-semibold">Input completeness</h3>
            <p className="mb-3 text-sm text-muted-foreground">Fields that strengthen model signal for your workspace.</p>
            <ul className="space-y-2 text-sm">
              {(safeFields ?? []).map((f) => (
                <li
                  key={f.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${f.filled ? 'border-accent/30 bg-accent/5' : 'border-border'}`}
                >
                  <span>{f.label}</span>
                  <span className={f.filled ? 'text-accent' : 'text-muted-foreground'}>{f.filled ? 'Ready' : 'Missing'}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-4 xl:col-span-3">
          <AiAnalysisComposer
            analysisDepth={analysisDepth}
            onDepthChange={setAnalysisDepth}
            benchmarking={benchmarking}
            onBenchmarkingChange={setBenchmarking}
            consent={consent}
            onConsentChange={setConsent}
            canSubmit={canSubmit}
            isRunning={runAnalysis.isPending}
            completenessPercent={percent}
            onSubmit={async () => {
              if (!companyId) return
              try {
                const res = await runAnalysis.mutateAsync({
                  companyId,
                  analysisDepth,
                  benchmarking,
                })
                setSimulatedProgress(100)
                const rid = res?.data?.reportId
                if (rid) {
                  navigate(`/report/${rid}`)
                }
              } catch {
                setStepIndex(0)
                setSimulatedProgress(0)
              }
            }}
          />

          {runAnalysis.isPending ? (
            <Card className="space-y-4 p-4 animate-fade-in-up">
              <ProgressStepper steps={STEPS} activeIndex={stepIndex} />
              <div className="space-y-2">
                <Progress value={simulatedProgress} />
                <p className="text-xs text-muted-foreground motion-reduce:transition-none">
                  Estimated time depends on model load. You can leave this page — the report will appear in history when complete.
                </p>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </PageTemplate>
  )
}
