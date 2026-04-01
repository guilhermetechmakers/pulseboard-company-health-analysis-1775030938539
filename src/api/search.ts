import { invokePulseSearch, PulseSearchError } from '@/lib/pulse-search-api'
import { normalizeAutosuggestBundle, normalizeSearchItems } from '@/lib/search-normalize'
import type {
  AutosuggestResponseNormalized,
  SearchFiltersPayload,
  SearchPreviewNormalized,
  SearchResponseNormalized,
  SearchScopeParam,
} from '@/types/search'

type EdgeSearchWrapper = {
  data?: {
    data?: unknown
    count?: unknown
  }
}

type EdgeAutosuggestWrapper = {
  data?: {
    companies?: unknown
    reports?: unknown
    users?: unknown
  }
}

type EdgePreviewWrapper = {
  data?: {
    id?: unknown
    type?: unknown
    title?: unknown
    summary?: unknown
    raw?: unknown
  }
  error?: unknown
}

export async function searchPulseEntities(
  input: {
    query: string
    scope: SearchScopeParam
    filters: SearchFiltersPayload
    page: number
    pageSize: number
  },
  signal?: AbortSignal,
): Promise<SearchResponseNormalized> {
  const res = await invokePulseSearch<EdgeSearchWrapper>(
    {
      op: 'search',
      query: input.query.slice(0, 200),
      scope: input.scope,
      filters: input.filters,
      pagination: { page: input.page, pageSize: input.pageSize },
    },
    signal,
  )

  const inner = res?.data ?? {}
  const list = Array.isArray(inner.data) ? inner.data : []
  const countRaw = inner.count
  const count = typeof countRaw === 'number' && Number.isFinite(countRaw) ? countRaw : normalizeSearchItems(list).length

  return {
    data: normalizeSearchItems(list),
    count,
  }
}

export async function autosuggestPulse(input: string, signal?: AbortSignal): Promise<AutosuggestResponseNormalized> {
  const trimmed = input.trim().slice(0, 120)
  const res = await invokePulseSearch<EdgeAutosuggestWrapper>(
    {
      op: 'autosuggest',
      input: trimmed,
    },
    signal,
  )

  const bundle = normalizeAutosuggestBundle(res?.data ?? {})
  return bundle
}

export async function previewPulseEntity(
  id: string,
  entityType: 'company' | 'report' | 'user',
  signal?: AbortSignal,
): Promise<SearchPreviewNormalized | null> {
  let res: EdgePreviewWrapper
  try {
    res = await invokePulseSearch<EdgePreviewWrapper>(
      {
        op: 'preview',
        id,
        entityType,
      },
      signal,
    )
  } catch (e) {
    if (e instanceof PulseSearchError && e.status === 404) {
      return null
    }
    throw e
  }

  if (!res?.data || typeof res.data !== 'object' || Array.isArray(res.data)) {
    return null
  }
  const d = res.data as Record<string, unknown>
  const rid = typeof d.id === 'string' ? d.id : null
  const type = d.type
  const title = typeof d.title === 'string' ? d.title : null
  const summary = typeof d.summary === 'string' ? d.summary : undefined
  const raw = d.raw && typeof d.raw === 'object' && !Array.isArray(d.raw) ? (d.raw as Record<string, unknown>) : {}
  if (!rid || !title || (type !== 'company' && type !== 'report' && type !== 'user')) {
    return null
  }
  return {
    id: rid,
    type,
    title,
    summary,
    raw,
  }
}
