import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { searchI18n } from '@/lib/search-i18n'
import type { SearchFiltersPayload, SearchScopeParam } from '@/types/search'
import { cn } from '@/lib/utils'

const COMMON_INDUSTRIES = ['SaaS', 'E-commerce', 'Professional services', 'Healthcare', 'Manufacturing', 'Fintech']

const REPORT_STATUSES = ['queued', 'running', 'completed', 'failed'] as const

export interface FacetDraft {
  scope: SearchScopeParam
  scopeCompanies: boolean
  scopeReports: boolean
  scopeUsers: boolean
  industryText: string
  tagsText: string
  healthMin: string
  healthMax: string
  since: string
  until: string
  reportStatus: Set<string>
  ownerIdsText: string
}

export function defaultFacetDraft(): FacetDraft {
  return {
    scope: 'all',
    scopeCompanies: true,
    scopeReports: true,
    scopeUsers: true,
    industryText: '',
    tagsText: '',
    healthMin: '',
    healthMax: '',
    since: '',
    until: '',
    reportStatus: new Set(),
    ownerIdsText: '',
  }
}

export function draftToFilters(d: FacetDraft, isAdmin: boolean): { scope: SearchScopeParam; filters: SearchFiltersPayload } {
  const scopes: ('companies' | 'reports' | 'users')[] = []
  if (d.scopeCompanies) scopes.push('companies')
  if (d.scopeReports) scopes.push('reports')
  if (d.scopeUsers) scopes.push('users')

  const industry = (d.industryText ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const tags = (d.tagsText ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const healthMinN = Number(d.healthMin)
  const healthMaxN = Number(d.healthMax)
  const healthScore: SearchFiltersPayload['healthScore'] = {}
  if (Number.isFinite(healthMinN)) healthScore.min = healthMinN
  if (Number.isFinite(healthMaxN)) healthScore.max = healthMaxN

  const ownerIds = isAdmin
    ? (d.ownerIdsText ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  let lastAnalyzed: SearchFiltersPayload['lastAnalyzed']
  if (d.since || d.until) {
    lastAnalyzed = {}
    if (d.since) lastAnalyzed.since = `${d.since}T00:00:00.000Z`
    if (d.until) lastAnalyzed.until = `${d.until}T23:59:59.999Z`
  }

  const filters: SearchFiltersPayload = {
    scopes: scopes.length ? scopes : ['companies', 'reports', 'users'],
    ...(industry.length ? { industry } : {}),
    ...(Object.keys(healthScore).length ? { healthScore } : {}),
    ...(lastAnalyzed ? { lastAnalyzed } : {}),
    ...(tags.length ? { tags } : {}),
    ...(d.reportStatus.size ? { reportStatus: [...d.reportStatus] } : {}),
    ...(ownerIds.length ? { ownerIds } : {}),
  }

  return { scope: d.scope, filters }
}

export function SearchFacetPanel({
  draft,
  onChange,
  isAdmin,
  className,
}: {
  draft: FacetDraft
  onChange: (next: FacetDraft) => void
  isAdmin: boolean
  className?: string
}) {
  const set = (patch: Partial<FacetDraft>) => onChange({ ...draft, ...patch })

  return (
    <Card className={cn('space-y-4 p-4 shadow-card transition-shadow duration-200 hover:shadow-md', className)}>
      <div>
        <h3 className="text-base font-semibold text-foreground">{searchI18n.filters}</h3>
        <p className="text-xs text-muted-foreground">Scope, industries, health bands, dates, and report status sync to the URL.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Result scope</Label>
        <div className="flex flex-wrap gap-3">
          {(['all', 'companies', 'reports', 'users'] as const).map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="search-scope"
                checked={draft.scope === s}
                onChange={() => set({ scope: s })}
                className="h-4 w-4 accent-primary"
              />
              <span className="capitalize">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Include in “all”</Label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.scopeCompanies}
              onCheckedChange={(c) => set({ scopeCompanies: c === true })}
            />
            {searchI18n.sectionCompanies}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.scopeReports}
              onCheckedChange={(c) => set({ scopeReports: c === true })}
            />
            {searchI18n.sectionReports}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.scopeUsers}
              onCheckedChange={(c) => set({ scopeUsers: c === true })}
            />
            {searchI18n.sectionUsers}
          </label>
        </div>
        {!isAdmin ? <p className="text-xs text-muted-foreground">{searchI18n.adminUsersHint}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="facet-industry" className="text-xs font-medium">
          Industries (comma-separated)
        </Label>
        <Input
          id="facet-industry"
          value={draft.industryText}
          onChange={(e) => set({ industryText: e.target.value })}
          placeholder="SaaS, Fintech"
          className="h-9"
        />
        <div className="flex flex-wrap gap-2">
          {(COMMON_INDUSTRIES ?? []).map((ind) => (
            <Button
              key={ind}
              type="button"
              variant="secondary"
              className="h-8 px-2 text-xs transition-transform duration-200 hover:scale-[1.02]"
              onClick={() => {
                const cur = draft.industryText.trim()
                const next = cur ? `${cur}, ${ind}` : ind
                set({ industryText: next })
              }}
            >
              + {ind}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="health-min" className="text-xs">
            Health score min (0–100)
          </Label>
          <Input
            id="health-min"
            inputMode="numeric"
            value={draft.healthMin}
            onChange={(e) => set({ healthMin: e.target.value })}
            placeholder="0"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="health-max" className="text-xs">
            Health score max (0–100)
          </Label>
          <Input
            id="health-max"
            inputMode="numeric"
            value={draft.healthMax}
            onChange={(e) => set({ healthMax: e.target.value })}
            placeholder="100"
            className="h-9"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="since" className="text-xs">
            Last analyzed after
          </Label>
          <Input id="since" type="date" value={draft.since} onChange={(e) => set({ since: e.target.value })} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="until" className="text-xs">
            Last analyzed before
          </Label>
          <Input id="until" type="date" value={draft.until} onChange={(e) => set({ until: e.target.value })} className="h-9" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Report status</Label>
        <div className="flex flex-wrap gap-3">
          {(REPORT_STATUSES ?? []).map((st) => (
            <label key={st} className="flex items-center gap-2 text-sm capitalize">
              <Checkbox
                checked={draft.reportStatus.has(st)}
                onCheckedChange={(c) => {
                  const next = new Set(draft.reportStatus)
                  if (c === true) next.add(st)
                  else next.delete(st)
                  set({ reportStatus: next })
                }}
              />
              {st}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags" className="text-xs font-medium">
          Tags overlap (comma-separated)
        </Label>
        <Input
          id="tags"
          value={draft.tagsText}
          onChange={(e) => set({ tagsText: e.target.value })}
          placeholder="priority, enterprise"
          className="h-9"
        />
      </div>

      {isAdmin ? (
        <div className="space-y-2">
          <Label htmlFor="owners" className="text-xs font-medium">
            Owner user IDs (comma-separated)
          </Label>
          <Input
            id="owners"
            value={draft.ownerIdsText}
            onChange={(e) => set({ ownerIdsText: e.target.value })}
            placeholder="UUIDs for company owner filter"
            className="h-9 font-mono text-xs"
          />
        </div>
      ) : null}
    </Card>
  )
}
