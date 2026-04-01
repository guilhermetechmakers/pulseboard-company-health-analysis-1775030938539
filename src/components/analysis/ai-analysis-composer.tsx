import type { AnalysisDepth } from '@/types/analysis'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const DEPTHS: { id: AnalysisDepth; label: string; hint: string }[] = [
  { id: 'brief', label: 'Brief', hint: 'Fast triage — shorter narratives.' },
  { id: 'standard', label: 'Standard', hint: 'Balanced depth for most SMB reviews.' },
  { id: 'deep', label: 'Deep', hint: 'Rich detail for consultants and diligence.' },
]

interface AiAnalysisComposerProps {
  analysisDepth: AnalysisDepth
  onDepthChange: (d: AnalysisDepth) => void
  benchmarking: boolean
  onBenchmarkingChange: (v: boolean) => void
  consent: boolean
  onConsentChange: (v: boolean) => void
  canSubmit: boolean
  onSubmit: () => void
  isRunning: boolean
  completenessPercent: number
}

export function AiAnalysisComposer({
  analysisDepth,
  onDepthChange,
  benchmarking,
  onBenchmarkingChange,
  consent,
  onConsentChange,
  canSubmit,
  onSubmit,
  isRunning,
  completenessPercent,
}: AiAnalysisComposerProps) {
  return (
    <Card className="space-y-6 p-4 md:p-6">
      <div>
        <h3 className="text-lg font-semibold">Analysis options</h3>
        <p className="text-sm text-muted-foreground">Depth controls verbosity; benchmarking adds peer context when enabled.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(DEPTHS ?? []).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onDepthChange(d.id)}
            className={cn(
              'rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-card',
              analysisDepth === d.id ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border bg-card',
            )}
          >
            <p className="font-semibold text-foreground">{d.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d.hint}</p>
          </button>
        ))}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/40">
        <Checkbox
          checked={benchmarking}
          onCheckedChange={onBenchmarkingChange}
          aria-label="Enable benchmarking context"
          className="mt-1"
        />
        <span>
          <span className="font-medium">Industry benchmarking</span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Allow the model to reference typical SMB patterns where your data is thin (clearly labeled as assumptions).
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/40">
        <Checkbox checked={consent} onCheckedChange={onConsentChange} aria-label="Consent to AI processing" className="mt-1" />
        <span>
          <span className="font-medium">Consent to AI processing</span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Required. Your company context is sent to the LLM to generate this report. Do not include secrets you cannot share.
          </span>
        </span>
      </label>

      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
        <p className="font-medium text-primary">Data completeness: {completenessPercent}%</p>
        <p className="mt-1 text-muted-foreground">Higher completeness improves signal quality. You can still run analysis below 100%.</p>
      </div>

      <Button type="button" className="w-full sm:w-auto" disabled={!canSubmit || isRunning} onClick={onSubmit}>
        {isRunning ? 'Running analysis…' : 'Start analysis'}
      </Button>
    </Card>
  )
}
