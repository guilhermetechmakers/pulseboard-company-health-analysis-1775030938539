import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepItem {
  id: string
  label: string
}

interface ProgressStepperProps {
  steps: StepItem[]
  activeIndex: number
  className?: string
}

export function ProgressStepper({ steps, activeIndex, className }: ProgressStepperProps) {
  const safeSteps = Array.isArray(steps) ? steps : []
  return (
    <ol className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap', className)} aria-label="Analysis progress">
      {(safeSteps ?? []).map((step, index) => {
        const done = index < activeIndex
        const current = index === activeIndex
        return (
          <li
            key={step.id}
            className={cn(
              'flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-300',
              done && 'border-accent/40 bg-accent/5 text-accent',
              current && 'border-primary bg-primary/5 shadow-card ring-2 ring-primary/20',
              !done && !current && 'border-border text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                done && 'border-accent bg-accent text-white',
                current && 'animate-pulse border-primary bg-primary text-primary-foreground',
              )}
              aria-hidden
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className="font-medium">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
