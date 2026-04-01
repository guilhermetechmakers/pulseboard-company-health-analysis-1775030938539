import { ChevronDown } from 'lucide-react'
import { HealthBreakdownPanel, type HealthBreakdownPanelProps } from '@/components/company/health-breakdown-panel'
import { CacheSourceBadge } from '@/components/cache/cache-source-badge'
import { CacheStatusBadge } from '@/components/cache/cache-status-badge'
import { cn } from '@/lib/utils'
import type { PulseCacheMeta } from '@/types/pulse-cache'

export interface HealthScoreCardProps extends HealthBreakdownPanelProps {
  pulseCache?: PulseCacheMeta | null
  defaultOpen?: boolean
  isFetching?: boolean
  isStale?: boolean
}

/**
 * Collapsible health breakdown (native details) with cache provenance.
 */
export function HealthScoreCard({
  pulseCache,
  defaultOpen = true,
  className,
  isFetching,
  isStale,
  ...panel
}: HealthScoreCardProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group rounded-xl border border-border/80 bg-card shadow-card transition-shadow duration-200 hover:shadow-lg motion-reduce:transition-none',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-6 py-4 text-left [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Health score</p>
          <p className="text-base font-semibold text-foreground">Breakdown &amp; history</p>
        </div>
        <div className="flex items-center gap-2">
          <CacheStatusBadge meta={pulseCache} isFetching={isFetching} isStale={isStale} className="hidden md:inline-flex" />
          <CacheSourceBadge meta={pulseCache} className="hidden sm:inline-flex" />
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </div>
      </summary>
      <div className="border-t border-border/60 px-6 pb-6 pt-2">
        <div className="mb-3 flex flex-wrap gap-2 sm:hidden">
          <CacheStatusBadge meta={pulseCache} isFetching={isFetching} isStale={isStale} />
          <CacheSourceBadge meta={pulseCache} />
        </div>
        <HealthBreakdownPanel {...panel} showHeader={false} className="border-0 bg-transparent p-0 shadow-none" />
      </div>
    </details>
  )
}
