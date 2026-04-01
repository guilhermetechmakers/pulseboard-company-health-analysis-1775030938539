import { describe, expect, it } from 'vitest'
import {
  normalizeAdminUsersResponse,
  normalizeRecentActivity,
  normalizeStringArray,
  normalizeTrend,
  normalizeUsageMetrics,
} from '@/api/admin'

describe('admin API guards', () => {
  it('normalizeStringArray handles non-arrays', () => {
    expect(normalizeStringArray(null)).toEqual([])
    expect(normalizeStringArray({})).toEqual([])
    expect(normalizeStringArray(['a', 1, 'b'])).toEqual(['a', 'b'])
  })

  it('normalizeTrend filters invalid rows', () => {
    expect(normalizeTrend(null)).toEqual([])
    expect(
      normalizeTrend([
        { date: '2026-01-01', count: 2 },
        { date: '', count: 1 },
        null,
      ]),
    ).toEqual([{ date: '2026-01-01', count: 2 }])
  })

  it('normalizeRecentActivity guards nested metadata', () => {
    expect(normalizeRecentActivity(undefined)).toEqual([])
    const rows = normalizeRecentActivity([
      { id: '1', adminId: 'a', action: 'x', targetUserId: '', timestamp: 't', metadata: {} },
      { id: '', adminId: 'a', action: 'x', targetUserId: 'u', timestamp: 't', metadata: [] },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe('1')
  })

  it('normalizeUsageMetrics supplies defaults', () => {
    const m = normalizeUsageMetrics(null)
    expect(m.activeCompanies).toBe(0)
    expect(m.topIssues.length).toBeGreaterThan(0)
    expect(Array.isArray(m.companiesTrend)).toBe(true)
  })

  it('normalizeAdminUsersResponse coerces data array', () => {
    expect(normalizeAdminUsersResponse(null)).toEqual({ data: [], total: 0 })
    const r = normalizeAdminUsersResponse({ data: null, total: 5 })
    expect(r.data).toEqual([])
    expect(r.total).toBe(5)
    const ok = normalizeAdminUsersResponse({
      data: [{ id: 'u1', email: 'a@b.com', name: 'A', role: 'founder', status: 'active', createdAt: '', lastLogin: '' }],
      total: 1,
    })
    expect(ok.data).toHaveLength(1)
    expect(ok.total).toBe(1)
  })
})
