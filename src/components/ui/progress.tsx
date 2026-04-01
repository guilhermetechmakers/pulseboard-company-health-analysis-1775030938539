import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  className?: string
}

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn('h-2 w-full rounded-full bg-muted', className)}>
      <div
        className="h-2 rounded-full bg-primary transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  )
}
