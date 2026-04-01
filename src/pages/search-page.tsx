import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useUserProfile } from '@/hooks/use-auth-profile'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { searchPulseEntities } from '@/api/search'
import { PageTemplate } from '@/components/layout/page-template'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  SearchFacetPanel,
  defaultFacetDraft,
  draftToFilters,
  type FacetDraft,
} from '@/components/search/search-facet-panel'
import { SearchResultsList } from '@/components/search/search-results-list'
import { SearchDetailDialog } from '@/components/search/search-detail-dialog'
import { searchI18n } from '@/lib/search-i18n'
import type { SearchItem } from '@/types/search'
import { toast } from 'sonner'

function parseFacetParams(sp: URLSearchParams): FacetDraft {
  const d = defaultFacetDraft()
  d.industryText = sp.get('industry') ?? ''
  d.tagsText = sp.get('tags') ?? ''
  d.healthMin = sp.get('hmin') ?? ''
  d.healthMax = sp.get('hmax') ?? ''
  d.since = sp.get('since') ?? ''
  d.until = sp.get('until') ?? ''
  d.ownerIdsText = sp.get('owners') ?? ''
  const rs = sp.get('rs')
  if (rs) {
    d.reportStatus = new Set(
      rs.split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    )
  }
  const scope = sp.get('scope')
  if (scope === 'all' || scope === 'companies' || scope === 'reports' || scope === 'users') {
    d.scope = scope
  }
  const inc = sp.get('inc')
  if (inc) {
    d.scopeCompanies = inc.includes('c')
    d.scopeReports = inc.includes('r')
    d.scopeUsers = inc.includes('u')
  }
  return d
}

function applyFacetToParams(sp: URLSearchParams, draft: FacetDraft) {
  const setOrDel = (k: string, v: string) => {
    if (v) sp.set(k, v)
    else sp.delete(k)
  }
  setOrDel('scope', draft.scope)
  const inc = [
    draft.scopeCompanies ? 'c' : '',
    draft.scopeReports ? 'r' : '',
    draft.scopeUsers ? 'u' : '',
  ]
    .filter(Boolean)
    .join(',')
  setOrDel('inc', inc)
  setOrDel('industry', draft.industryText.trim())
  setOrDel('tags', draft.tagsText.trim())
  setOrDel('hmin', draft.healthMin.trim())
  setOrDel('hmax', draft.healthMax.trim())
  setOrDel('since', draft.since)
  setOrDel('until', draft.until)
  const rs = [...draft.reportStatus].join(',')
  setOrDel('rs', rs)
  setOrDel('owners', draft.ownerIdsText.trim())
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const { session, user } = useAuth()
  const { data: profile } = useUserProfile(user?.id)
  const isAdmin = profile?.role === 'admin' && profile?.account_status !== 'suspended'

  const [q, setQ] = useState(() => params.get('q') ?? '')
  const [draft, setDraft] = useState<FacetDraft>(() => parseFacetParams(params))
  const [selected, setSelected] = useState<SearchItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [pageSize, setPageSize] = useState(20)

  const debouncedQ = useDebouncedValue(q, 250)

  useEffect(() => {
    setParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        if (debouncedQ.trim()) sp.set('q', debouncedQ.trim())
        else sp.delete('q')
        return sp
      },
      { replace: true },
    )
  }, [debouncedQ, setParams])

  const { scope, filters } = useMemo(() => draftToFilters(draft, isAdmin), [draft, isAdmin])

  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  useEffect(() => {
    setPageSize(20)
  }, [debouncedQ, scope, filterKey])

  const searchQuery = useQuery({
    queryKey: ['pulse-search', 'full', debouncedQ, scope, filterKey, pageSize],
    enabled: Boolean(session),
    queryFn: ({ signal }) =>
      searchPulseEntities(
        {
          query: debouncedQ,
          scope,
          filters,
          page: 1,
          pageSize,
        },
        signal,
      ),
  })

  const items = searchQuery.data?.data ?? []
  const total = searchQuery.data?.count ?? 0
  const hasMore = total > (items?.length ?? 0)

  const syncUrlFilters = useCallback(() => {
    setParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        applyFacetToParams(sp, draft)
        const dq = debouncedQ.trim()
        if (dq) sp.set('q', dq)
        else sp.delete('q')
        return sp
      },
      { replace: false },
    )
    toast.success('Filter link updated — copy from the address bar to share.')
  }, [draft, debouncedQ, setParams])

  const resetAll = useCallback(() => {
    setDraft(defaultFacetDraft())
    setQ('')
    setPageSize(20)
    setParams(new URLSearchParams(), { replace: false })
  }, [setParams])

  return (
    <PageTemplate title={searchI18n.searchTitle} description={searchI18n.searchDescription}>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="page-search-q">Full-text query</Label>
            <Input
              id="page-search-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchI18n.globalPlaceholder}
              className="h-10 max-w-xl"
            />
            <p className="text-xs text-muted-foreground">
              {searchI18n.resultCount(total)}
              {searchQuery.isFetching ? ` · ${searchI18n.loading}` : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" className="transition-transform duration-200 hover:scale-[1.02]" onClick={syncUrlFilters}>
            Save filters to URL
          </Button>
          <Button type="button" variant="ghost" onClick={resetAll}>
            {searchI18n.resetUrl}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <SearchResultsList
            items={items}
            query={debouncedQ}
            loading={searchQuery.isLoading}
            onSelect={(item) => {
              setSelected(item)
              setDetailOpen(true)
            }}
            hasMore={hasMore}
            onLoadMore={hasMore ? () => setPageSize((s) => Math.min(s + 20, 200)) : undefined}
          />
        </div>
        <SearchFacetPanel draft={draft} onChange={setDraft} isAdmin={isAdmin} className="lg:sticky lg:top-24" />
      </div>

      <SearchDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={selected}
        isAdmin={isAdmin}
        userId={user?.id}
      />
    </PageTemplate>
  )
}
