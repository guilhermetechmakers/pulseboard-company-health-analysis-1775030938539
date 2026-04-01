export type SearchEntityType = 'company' | 'report' | 'user'

export interface SearchItem {
  id: string
  type: SearchEntityType
  title: string
  subtitle?: string
  snippets?: string[]
  updatedAt?: string
  ownerId?: string
}

export interface SearchFiltersPayload {
  scopes?: ('companies' | 'reports' | 'users')[]
  industry?: string[]
  healthScore?: { min?: number; max?: number }
  lastAnalyzed?: { since?: string; until?: string }
  ownerIds?: string[]
  tags?: string[]
  reportStatus?: string[]
}

export type SearchScopeParam = 'companies' | 'reports' | 'users' | 'all'

export interface SearchRequestBody {
  query: string
  scope: SearchScopeParam
  filters: SearchFiltersPayload
  pagination: { page: number; pageSize: number }
}

export interface SearchResponseNormalized {
  data: SearchItem[]
  count: number
}

export interface AutosuggestResponseNormalized {
  companies: SearchItem[]
  reports: SearchItem[]
  users: SearchItem[]
}

export interface SearchPreviewNormalized {
  id: string
  type: SearchEntityType
  title: string
  summary?: string
  raw: Record<string, unknown>
}
