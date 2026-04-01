import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { PulseCacheMeta } from '@/types/pulse-cache'
import { CacheSourceBadge } from '@/components/cache/cache-source-badge'

export interface CachedSectionProps {
  title?: string
  isLoading: boolean
  skeleton: ReactNode
  pulseCache?: PulseCacheMeta | null
  /** When true and stale window passed, show a soft warning */
  showStaleNotice?: boolean
  className?: string
  headerClassName?: string
  badgeClassName?: string
  children: ReactNode
}

function isPastStale(meta: PulseCacheMeta | null | undefined): boolean {
  if (!meta?.staleAt) return false
  const t = Date.parse(meta.staleAt)
  return Number.isFinite(t) && Date.now() > t
}

export function CachedSection({
  title,
  isLoading,
  skeleton,
  pulseCache,
  showStaleNotice = true,
  className,
  headerClassName,
  badgeClassName,
  children,
}: CachedSectionProps) {
  const stale = showStaleNotice && isPastStale(pulseCache ?? null)

  return (
    <section className={cn('space-y-3', className)} aria-busy={isLoading}>
      {(title ?? pulseCache) ? (
        <div className={cn('flex flex-wrap items-center justify-between gap-2', headerClassName)}>
          {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : <span />}
          <CacheSourceBadge meta={pulseCache} className={badgeClassName} />
        </div>
      ) : null}
      {isLoading ? skeleton : children}
      {stale ? (
        <p
          className="rounded-lg border border-[rgb(245,158,11)]/35 bg-[rgb(245,158,11)]/10 px-3 py-2 text-xs text-foreground motion-reduce:animate-none"
          role="status"
        >
          Data may be slightly stale — use refresh actions for a guaranteed fresh read.
        </p>
      ) : null}
    </section>
  )
}
