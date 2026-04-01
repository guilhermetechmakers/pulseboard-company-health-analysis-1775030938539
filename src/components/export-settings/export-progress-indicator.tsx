import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type ExportProgressPhase =
  | 'idle'
  | 'submitting'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

export interface ExportProgressIndicatorProps {
  phase: ExportProgressPhase
  progressPercent: number
  statusLabel: string
  errorMessage?: string | null
  className?: string
}

export function ExportProgressIndicator({
  phase,
  progressPercent,
  statusLabel,
  errorMessage,
  className,
}: ExportProgressIndicatorProps) {
  const busy = phase === 'submitting' || phase === 'queued' || phase === 'processing'
  const pct = Math.min(100, Math.max(0, progressPercent))

  return (
    <div
      className={cn('space-y-2', className)}
      role="status"
      aria-live="polite"
      aria-busy={busy}
      aria-label="Export progress"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : null}
          Export status
        </span>
        <span>{statusLabel}</span>
      </div>
      <Progress value={pct} className="h-2 motion-reduce:transition-none" />
      {phase === 'failed' && errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  )
}
