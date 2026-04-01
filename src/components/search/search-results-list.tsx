import { Building2, ChevronRight, FileText, UserRound } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { SearchItem } from '@/types/search'
import { SearchHighlight } from '@/components/search/search-highlight'
import { searchI18n } from '@/lib/search-i18n'
import { cn } from '@/lib/utils'

function TypeIcon({ type }: { type: SearchItem['type'] }) {
  if (type === 'company') return <Building2 className="h-4 w-4 text-primary" aria-hidden />
  if (type === 'report') return <FileText className="h-4 w-4 text-primary" aria-hidden />
  return <UserRound className="h-4 w-4 text-primary" aria-hidden />
}

export function SearchResultsList({
  items,
  query,
  loading,
  onSelect,
  onLoadMore,
  hasMore,
}: {
  items: SearchItem[]
  query: string
  loading: boolean
  onSelect: (item: SearchItem) => void
  onLoadMore?: () => void
  hasMore: boolean
}) {
  const list = items ?? []

  if (loading && list.length === 0) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!loading && list.length === 0) {
    return (
      <Card className="border-dashed p-8 text-center shadow-card">
        <p className="font-medium text-foreground">{searchI18n.noMatches}</p>
        <p className="mt-1 text-sm text-muted-foreground">{searchI18n.tryAdjust}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2" aria-label="Search results">
        {(list ?? []).map((item) => (
          <li key={`${item.type}-${item.id}`}>
            <Card
              className={cn(
                'flex cursor-pointer items-start gap-3 p-4 shadow-card transition-all duration-200 hover:scale-[1.01] hover:shadow-md',
              )}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(item)
                }
              }}
            >
              <div className="mt-0.5 rounded-lg bg-muted p-2">
                <TypeIcon type={item.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    <SearchHighlight text={item.title} query={query} />
                  </h3>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{item.type}</span>
                </div>
                {item.subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{item.subtitle}</p> : null}
                {(item.snippets ?? []).length ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {(item.snippets ?? []).map((s, i) => (
                      <span key={i}>
                        <SearchHighlight text={s} query={query} />
                        {i < (item.snippets?.length ?? 0) - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </p>
                ) : null}
                {item.updatedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(item.updatedAt).toLocaleString()}</p>
                ) : null}
              </div>
              <Button type="button" variant="ghost" className="h-9 shrink-0 gap-1 px-2" aria-label={searchI18n.openDetail}>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </Card>
          </li>
        ))}
      </ul>
      {hasMore && onLoadMore ? (
        <Button type="button" variant="secondary" className="w-full" onClick={onLoadMore}>
          {searchI18n.loadMore}
        </Button>
      ) : null}
    </div>
  )
}
