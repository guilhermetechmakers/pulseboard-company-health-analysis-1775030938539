import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PulseCacheMeta } from '@/types/pulse-cache'

export interface CacheStatusBadgeProps {
  meta?: PulseCacheMeta | null
  /** React Query: refetch in flight */
  isFetching?: boolean
  /** React Query: data older than staleTime */
  isStale?: boolean
  className?: string
}

export function CacheStatusBadge({ meta, isFetching, isStale, className }: CacheStatusBadgeProps) {
  const fromEdge = meta?.source === 'cache' && meta.cacheHit
  const fromClient = meta?.source === 'client' && meta.cacheHit
  const label = isFetching
    ? 'Refreshing…'
    : fromClient
      ? 'Browser cache'
      : fromEdge
        ? 'Edge cache'
        : isStale
          ? 'May be stale'
          : 'Live'

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-normal tabular-nums',
        (fromEdge || fromClient) && !isFetching && 'border-primary/40 bg-primary/5 text-primary',
        isStale && !isFetching && !fromEdge && !fromClient && 'border-[rgb(245,158,11)]/50 bg-[rgb(245,158,11)]/10 text-foreground',
        className,
      )}
      title={
        meta?.ttlSeconds
          ? `TTL about ${meta.ttlSeconds}s · ${meta.cachedAt ? `cached ${meta.cachedAt}` : 'origin fetch'}`
          : undefined
      }
    >
      {label}
      {meta?.ttlSeconds != null && !isFetching ? ` · ~${meta.ttlSeconds}s` : null}
    </Badge>
  )
}
