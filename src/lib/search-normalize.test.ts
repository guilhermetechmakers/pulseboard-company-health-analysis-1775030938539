import { describe, expect, it } from 'vitest'
import { normalizeAutosuggestBundle, normalizeSearchItems } from '@/lib/search-normalize'
import { mockMalformedApiPayload, mockSearchItem } from '@/lib/search-mocks'

describe('normalizeSearchItems', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeSearchItems(null)).toEqual([])
    expect(normalizeSearchItems({})).toEqual([])
  })

  it('keeps valid rows and drops invalid', () => {
    const raw = (mockMalformedApiPayload() as { data: { data: unknown[] } }).data.data
    const out = normalizeSearchItems(raw)
    expect(out).toHaveLength(2)
    expect(out[0]?.type).toBe('company')
    expect(out[1]?.type).toBe('report')
  })

  it('normalizes optional fields safely', () => {
    const one = mockSearchItem({ snippets: undefined })
    const list = normalizeSearchItems([one, { ...one, snippets: ['a', 1, 'b'] }])
    expect(list[0]?.snippets).toBeUndefined()
    expect(list[1]?.snippets).toEqual(['a', 'b'])
  })
})

describe('normalizeAutosuggestBundle', () => {
  it('returns empty buckets for malformed payload', () => {
    expect(normalizeAutosuggestBundle(null)).toEqual({ companies: [], reports: [], users: [] })
  })

  it('parses nested bundle', () => {
    const b = normalizeAutosuggestBundle({
      companies: [mockSearchItem({ type: 'company' })],
      reports: [],
      users: null,
    })
    expect(b.companies).toHaveLength(1)
    expect(b.reports).toEqual([])
    expect(b.users).toEqual([])
  })
})
