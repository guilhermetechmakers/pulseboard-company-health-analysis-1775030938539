import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, X } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useUserProfile } from '@/hooks/use-auth-profile'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { autosuggestPulse } from '@/api/search'
import type { SearchItem } from '@/types/search'
import { searchI18n } from '@/lib/search-i18n'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchHighlight } from '@/components/search/search-highlight'

export interface GlobalSearchBarProps {
  placeholder?: string
  className?: string
}

type SuggestCacheEntry = { at: number; data: Awaited<ReturnType<typeof autosuggestPulse>> }
const suggestCache = new Map<string, SuggestCacheEntry>()
const SUGGEST_TTL_MS = 45_000

function flattenSuggestions(bundle: Awaited<ReturnType<typeof autosuggestPulse>>): SearchItem[] {
  const c = bundle?.companies ?? []
  const r = bundle?.reports ?? []
  const u = bundle?.users ?? []
  return [...(c ?? []), ...(r ?? []), ...(u ?? [])]
}

function sectionLabel(type: SearchItem['type']): string {
  if (type === 'company') return searchI18n.sectionCompanies
  if (type === 'report') return searchI18n.sectionReports
  return searchI18n.sectionUsers
}

export function GlobalSearchBar({ placeholder, className }: GlobalSearchBarProps = {}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: profile } = useUserProfile(user?.id)
  const isAdmin = profile?.role === 'admin' && profile?.account_status !== 'suspended'
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof autosuggestPulse>> | null>(null)
  const debounced = useDebouncedValue(value, 250)
  const abortRef = useRef<AbortController | null>(null)

  const runSuggest = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 1) {
      setBundle({ companies: [], reports: [], users: [] })
      setLoading(false)
      return
    }
    const cacheKey = trimmed.toLowerCase()
    const hit = suggestCache.get(cacheKey)
    if (hit && Date.now() - hit.at < SUGGEST_TTL_MS) {
      setBundle(hit.data)
      setLoading(false)
      return
    }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    try {
      const data = await autosuggestPulse(trimmed, ac.signal)
      suggestCache.set(cacheKey, { at: Date.now(), data })
      setBundle(data)
    } catch {
      if (!ac.signal.aborted) {
        setBundle({ companies: [], reports: [], users: [] })
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void runSuggest(debounced)
  }, [debounced, runSuggest])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const flat = bundle ? flattenSuggestions(bundle) : []
  const grouped: { label: string; items: SearchItem[] }[] = []
  if (bundle) {
    if ((bundle.companies ?? []).length) grouped.push({ label: searchI18n.sectionCompanies, items: bundle.companies ?? [] })
    if ((bundle.reports ?? []).length) grouped.push({ label: searchI18n.sectionReports, items: bundle.reports ?? [] })
    if ((bundle.users ?? []).length) grouped.push({ label: searchI18n.sectionUsers, items: bundle.users ?? [] })
  }

  const selectItem = (item: SearchItem) => {
    setOpen(false)
    setValue('')
    if (item.type === 'company') navigate('/company')
    else if (item.type === 'report') navigate(`/report/${item.id}`)
    else navigate(isAdmin ? '/admin/users' : '/profile')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && value.trim()) {
      setOpen(true)
    }
    if (!open || flat.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flat[activeIndex]
      if (item) selectItem(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    setActiveIndex(0)
  }, [debounced, bundle])

  return (
    <div ref={rootRef} className={cn('relative w-full min-w-[200px] max-w-md flex-1', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          ref={inputRef}
          id="global-search-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[activeIndex] ? `suggest-${flat[activeIndex].id}` : undefined}
          placeholder={placeholder ?? searchI18n.globalPlaceholder}
          className="h-10 border-border pl-9 pr-20 transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
          value={value}
          onChange={(ev) => {
            setValue(ev.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-label={searchI18n.autosuggestLoading} /> : null}
          {value ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground"
              aria-label={searchI18n.clear}
              onClick={() => {
                setValue('')
                setBundle({ companies: [], reports: [], users: [] })
                inputRef.current?.focus()
              }}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      {open && value.trim().length > 0 ? (
        <div
          id={listId}
          role="listbox"
          aria-label={searchI18n.globalPlaceholder}
          className="animate-fade-in-down motion-reduce:animate-none absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-card py-2 shadow-card"
        >
          <p className="px-3 pb-1 text-xs text-muted-foreground">{searchI18n.keyboardHint}</p>
          {flat.length === 0 && !loading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">{searchI18n.noMatches}</div>
          ) : null}
          {grouped.map((g) => (
            <div key={g.label}>
              <div className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.label}</div>
              <ul className="space-y-0.5">
                {(g.items ?? []).map((item) => {
                  const globalIdx = flat.findIndex((x) => x.id === item.id && x.type === item.type)
                  const isActive = globalIdx === activeIndex
                  return (
                    <li key={`${item.type}-${item.id}`}>
                      <button
                        type="button"
                        id={`suggest-${item.id}`}
                        role="option"
                        aria-selected={isActive}
                        className={cn(
                          'flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors duration-200',
                          isActive ? 'bg-muted' : 'hover:bg-muted/80',
                        )}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onClick={() => selectItem(item)}
                      >
                        <span className="font-medium text-foreground">
                          <SearchHighlight text={item.title} query={value} />
                        </span>
                        {item.subtitle ? (
                          <span className="text-xs text-muted-foreground">
                            {sectionLabel(item.type)} · {item.subtitle}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{sectionLabel(item.type)}</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <div className="border-t border-border px-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-full"
              onClick={() => {
                setOpen(false)
                navigate(`/search?q=${encodeURIComponent(value.trim())}`)
              }}
            >
              {searchI18n.searchTitle}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
