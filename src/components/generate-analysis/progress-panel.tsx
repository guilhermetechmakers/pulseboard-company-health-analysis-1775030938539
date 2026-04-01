import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ProgressStepper } from '@/components/analysis/progress-stepper'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'validate', label: 'Validate inputs' },
  { id: 'aggregate', label: 'Aggregate company data' },
  { id: 'llm', label: 'AI reasoning' },
  { id: 'persist', label: 'Save report' },
]

export interface ProgressPanelProps {
  progress: number
  logs: string[]
  isVisible: boolean
  statusLabel?: string
  className?: string
}

function stepIndexFromProgress(p: number): number {
  if (p >= 85) return 3
  if (p >= 50) return 2
  if (p >= 20) return 1
  return 0
}

export function ProgressPanel({ progress, logs, isVisible, statusLabel, className }: ProgressPanelProps) {
  if (!isVisible) return null
  const safeLogs = Array.isArray(logs) ? logs : []
  const pct = typeof progress === 'number' && Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0
  const activeIndex = stepIndexFromProgress(pct)

  return (
    <Card
      className={cn(
        'space-y-4 p-4 animate-fade-in-up motion-reduce:animate-none motion-reduce:transition-none',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Live progress</p>
        {statusLabel ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{statusLabel}</span>
        ) : null}
      </div>
      <ProgressStepper steps={STEPS} activeIndex={activeIndex} />
      <div className="space-y-2">
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground">
          Live updates from the analysis worker. You can navigate away — check Reports or notifications when complete.
        </p>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity log</p>
        <div className="h-48 overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-3">
          <ol className="space-y-2 text-xs font-mono text-foreground/90" aria-live="polite">
            {safeLogs.length === 0 ? (
              <li className="text-muted-foreground">Waiting for log lines…</li>
            ) : (
              safeLogs.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`} className="break-words">
                  {line}
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </Card>
  )
}
