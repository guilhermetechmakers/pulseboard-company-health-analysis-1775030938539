import type { AnalysisDepth } from '@/types/analysis'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const DEPTHS: { id: AnalysisDepth; label: string; hint: string }[] = [
  { id: 'brief', label: 'Brief', hint: 'Fast triage — shorter narratives.' },
  { id: 'standard', label: 'Standard', hint: 'Balanced depth for most SMB reviews.' },
  { id: 'deep', label: 'Deep', hint: 'Rich detail for consultants and diligence.' },
]

export interface AnalysisOptionsPanelProps {
  analysisDepth: AnalysisDepth
  onDepthChange: (d: AnalysisDepth) => void
  benchmarking: boolean
  onBenchmarkingChange: (v: boolean) => void
  sendToEmail: boolean
  onSendToEmailChange: (v: boolean) => void
  email: string
  onEmailChange: (v: string) => void
  emailError?: string
  disabled?: boolean
  completenessPercent: number
  className?: string
}

export function AnalysisOptionsPanel({
  analysisDepth,
  onDepthChange,
  benchmarking,
  onBenchmarkingChange,
  sendToEmail,
  onSendToEmailChange,
  email,
  onEmailChange,
  emailError,
  disabled,
  completenessPercent,
  className,
}: AnalysisOptionsPanelProps) {
  return (
    <Card className={cn('space-y-6 p-4 md:p-6', className)}>
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Analysis options</h3>
        <p className="text-sm text-muted-foreground">Depth controls verbosity; benchmarking adds peer context when enabled.</p>
      </div>

      <div role="radiogroup" aria-label="Analysis depth" className="grid gap-3 sm:grid-cols-3">
        {(DEPTHS ?? []).map((d) => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={analysisDepth === d.id}
            disabled={disabled}
            onClick={() => onDepthChange(d.id)}
            className={cn(
              'rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-card motion-reduce:transform-none',
              analysisDepth === d.id ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border bg-card',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <p className="font-semibold text-foreground">{d.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d.hint}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Industry benchmarking</p>
          <p className="text-sm text-muted-foreground">Allow typical SMB patterns where your data is thin.</p>
        </div>
        <Switch
          checked={benchmarking}
          onCheckedChange={onBenchmarkingChange}
          disabled={disabled}
          aria-label="Include benchmarks"
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Email report link</p>
            <p className="text-sm text-muted-foreground">Optional — sends when Resend is configured on the server.</p>
          </div>
          <Switch checked={sendToEmail} onCheckedChange={onSendToEmailChange} disabled={disabled} aria-label="Send to email" />
        </div>
        {sendToEmail ? (
          <div className="space-y-1.5">
            <Label htmlFor="report-email">Email address</Label>
            <Input
              id="report-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              disabled={disabled}
              className={cn('rounded-lg border-border', emailError ? 'border-destructive' : '')}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'report-email-err' : undefined}
            />
            {emailError ? (
              <p id="report-email-err" className="text-xs text-destructive" role="alert">
                {emailError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
        <p className="font-medium text-primary">Data completeness: {completenessPercent}%</p>
        <p className="mt-1 text-muted-foreground">Higher completeness improves signal quality before the model runs.</p>
      </div>
    </Card>
  )
}
