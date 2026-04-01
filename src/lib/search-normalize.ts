import type { SearchItem, SearchEntityType } from '@/types/search'

export function normalizeSearchItems(raw: unknown): SearchItem[] {
  if (!Array.isArray(raw)) return []
  const out: SearchItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id : null
    const type = r.type as SearchEntityType
    const title = typeof r.title === 'string' ? r.title : null
    if (!id || !title || (type !== 'company' && type !== 'report' && type !== 'user')) continue
    const subtitle = typeof r.subtitle === 'string' ? r.subtitle : undefined
    const updatedAt = typeof r.updatedAt === 'string' ? r.updatedAt : undefined
    const ownerId = typeof r.ownerId === 'string' ? r.ownerId : undefined
    const snippets = Array.isArray(r.snippets)
      ? (r.snippets ?? []).filter((s): s is string => typeof s === 'string')
      : undefined
    out.push({
      id,
      type,
      title,
      subtitle,
      snippets: snippets?.length ? snippets : undefined,
      updatedAt,
      ownerId,
    })
  }
  return out
}

export function normalizeAutosuggestBundle(raw: unknown): {
  companies: SearchItem[]
  reports: SearchItem[]
  users: SearchItem[]
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { companies: [], reports: [], users: [] }
  }
  const d = raw as Record<string, unknown>
  return {
    companies: normalizeSearchItems(d.companies),
    reports: normalizeSearchItems(d.reports),
    users: normalizeSearchItems(d.users),
  }
}
