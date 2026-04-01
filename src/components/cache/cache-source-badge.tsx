import { Database, HardDrive, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PulseCacheMeta } from '@/types/pulse-cache'

export interface CacheSourceBadgeProps {
  meta?: PulseCacheMeta | null
  className?: string
}

function labelFor(meta: PulseCacheMeta): { text: string; icon: typeof Database } {
  if (meta.source === 'client') {
    return { text: 'Browser cache', icon: HardDrive }
  }
  if (meta.source === 'cache' || meta.cacheHit) {
    return { text: 'Edge cache', icon: Database }
  }
  return { text: 'Fresh', icon: RefreshCw }
}

export function CacheSourceBadge({ meta, className }: CacheSourceBadgeProps) {
  if (!meta) return null
  const { text, icon: Icon } = labelFor(meta)
  const ttlHint = meta.ttlSeconds > 0 ? ` · TTL ~${Math.round(meta.ttlSeconds)}s` : ''
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal text-muted-foreground motion-reduce:transition-none',
        meta.cacheHit && 'border-primary/30 bg-primary/5 text-foreground',
        className,
      )}
      title={meta.cacheKey ? `Key: ${meta.cacheKey}` : undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {text}
        {ttlHint}
      </span>
    </Badge>
  )
}
