import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AdminSystemHealth } from '@/types/admin'

export interface SystemHealthPanelProps {
  health: AdminSystemHealth
}

export function SystemHealthPanel({ health }: SystemHealthPanelProps) {
  const status = health?.status ?? 'yellow'
  const details = Array.isArray(health?.details) ? health.details : []

  const label =
    status === 'green' ? 'Healthy' : status === 'yellow' ? 'Degraded' : 'Critical'
  const Icon = status === 'green' ? CheckCircle2 : status === 'red' ? AlertTriangle : Info

  return (
    <Card
      className={cn(
        'surface-card border-border/80 p-4 shadow-card transition-shadow duration-200 hover:shadow-md',
        status === 'red' && 'border-destructive/40',
        status === 'yellow' && 'border-[rgb(245,158,11)]/50',
        status === 'green' && 'border-accent/40',
      )}
      role="region"
      aria-label="System health"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Icon
          className={cn(
            'h-5 w-5',
            status === 'green' && 'text-accent',
            status === 'yellow' && 'text-[rgb(245,158,11)]',
            status === 'red' && 'text-destructive',
          )}
          aria-hidden
        />
        <h2 className="text-lg font-semibold tracking-tight">System health</h2>
        <Badge
          variant="outline"
          className={cn(
            status === 'green' && 'bg-accent/15 text-accent',
            status === 'yellow' && 'bg-[rgb(245,158,11)]/15 text-[rgb(180,83,9)]',
            status === 'red' && 'bg-destructive/15 text-destructive',
          )}
        >
          {label}
        </Badge>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground" role="list">
        {(details ?? []).map((line, i) => (
          <li key={`${i}-${line.slice(0, 24)}`} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
