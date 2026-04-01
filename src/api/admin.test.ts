import { describe, expect, it } from 'vitest'
import {
  normalizeAdminUsersResponse,
  normalizeRecentActivity,
  normalizeStringArray,
  normalizeSystemHealth,
  normalizeTrend,
  normalizeUsageMetrics,
} from '@/api/admin'

describe('admin API normalizers', () => {
  it('normalizeStringArray guards non-arrays', () => {
    expect(normalizeStringArray(null)).toEqual([])
    expect(normalizeStringArray('x')).toEqual([])
    expect(normalizeStringArray(['a', 1, 'b'])).toEqual(['a', 'b'])
  })

  it('normalizeTrend drops invalid entries', () => {
    expect(normalizeTrend(null)).toEqual([])
    expect(normalizeTrend([{ date: '2026-01-01', count: 2 }, { foo: 1 }, { date: '', count: 1 }])).toEqual([
      { date: '2026-01-01', count: 2 },
    ])
  })

  it('normalizeRecentActivity guards shapes', () => {
    expect(normalizeRecentActivity(undefined)).toEqual([])
    const one = normalizeRecentActivity([
      { id: '1', adminId: 'a', action: 'x', targetUserId: 't', timestamp: 'iso', metadata: { k: 1 } },
      null,
      { id: '', adminId: '', action: '', targetUserId: '', timestamp: '', metadata: [] },
    ])
    expect(one).toHaveLength(1)
    expect(one[0]?.metadata).toEqual({ k: 1 })
  })

  it('normalizeUsageMetrics fills defaults', () => {
    const m = normalizeUsageMetrics({ topIssues: [1, 'ok'], companiesTrend: 'bad' })
    expect(m.activeCompanies).toBe(0)
    expect(m.topIssues).toEqual(['ok'])
    expect(m.companiesTrend).toEqual([])
  })

  it('normalizeSystemHealth defaults unknown status', () => {
    expect(normalizeSystemHealth({ status: 'purple', details: 'nope' }).status).toBe('yellow')
    expect(normalizeSystemHealth({ status: 'green', details: ['ok'] }).details).toEqual(['ok'])
  })

  it('normalizeAdminUsersResponse guards data array', () => {
    expect(normalizeAdminUsersResponse({ data: null, total: 10 })).toEqual({ data: [], total: 10 })
    expect(
      normalizeAdminUsersResponse({
        data: [{ id: 'u1', email: 'a@b.co', name: 'A', role: 'admin', status: 'active', createdAt: '', lastLogin: '' }],
        total: 1,
      }).data,
    ).toHaveLength(1)
  })
})
