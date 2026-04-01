/**
 * @file Search API normalization tests + E2E outline (run in Cypress/Playwright separately).
 *
 * E2E outline:
 * 1) Sign in, open /search, type in query — autosuggest in header shows grouped results.
 * 2) Keyboard ↓/↑ and Enter selects item and navigates to company/report/profile.
 * 3) Apply facet filters, click "Save filters to URL", reload — state restores from query string.
 * 4) Open result detail dialog, export JSON, close with Escape (focus trap via Radix Dialog).
 * 5) Admin: user scope returns multiple profiles; non-admin: only self in Users bucket.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { autosuggestPulse, previewPulseEntity, searchPulseEntities } from '@/api/search'
import * as pulseSearchApi from '@/lib/pulse-search-api'

vi.mock('@/lib/pulse-search-api', () => ({
  invokePulseSearch: vi.fn(),
}))

describe('searchPulseEntities', () => {
  beforeEach(() => {
    vi.mocked(pulseSearchApi.invokePulseSearch).mockReset()
  })

  it('normalizes empty and malformed data arrays', async () => {
    vi.mocked(pulseSearchApi.invokePulseSearch).mockResolvedValueOnce({ data: { data: null, count: null } })
    const a = await searchPulseEntities({
      query: '',
      scope: 'all',
      filters: {},
      page: 1,
      pageSize: 10,
    })
    expect(a.data).toEqual([])
    expect(a.count).toBe(0)
  })

  it('returns typed items when edge responds correctly', async () => {
    vi.mocked(pulseSearchApi.invokePulseSearch).mockResolvedValueOnce({
      data: {
        data: [{ id: '1', type: 'company', title: 'Co', subtitle: 'SaaS' }],
        count: 1,
      },
    })
    const b = await searchPulseEntities({
      query: 'c',
      scope: 'companies',
      filters: {},
      page: 1,
      pageSize: 20,
    })
    expect(b.count).toBe(1)
    expect(b.data[0]?.title).toBe('Co')
  })
})

describe('autosuggestPulse', () => {
  beforeEach(() => {
    vi.mocked(pulseSearchApi.invokePulseSearch).mockReset()
  })

  it('returns empty buckets on missing data', async () => {
    vi.mocked(pulseSearchApi.invokePulseSearch).mockResolvedValueOnce({})
    const r = await autosuggestPulse('x')
    expect(r.companies).toEqual([])
    expect(r.reports).toEqual([])
    expect(r.users).toEqual([])
  })
})

describe('previewPulseEntity', () => {
  beforeEach(() => {
    vi.mocked(pulseSearchApi.invokePulseSearch).mockReset()
  })

  it('returns null when payload incomplete', async () => {
    vi.mocked(pulseSearchApi.invokePulseSearch).mockResolvedValueOnce({ data: { id: 'x' } })
    expect(await previewPulseEntity('x', 'company')).toBeNull()
  })
})
