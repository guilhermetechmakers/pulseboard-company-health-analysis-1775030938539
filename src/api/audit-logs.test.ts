import { describe, expect, it } from 'vitest'
import { normalizeAuditLogRow, normalizeAuditLogsListResponse, normalizeAuditLogsStats } from '@/api/audit-logs'

describe('audit-logs API normalization', () => {
  it('normalizeAuditLogsListResponse guards non-array logs', () => {
    expect(normalizeAuditLogsListResponse(null)).toEqual({
      total: 0,
      page: 1,
      pageSize: 20,
      logs: [],
    })
    const r = normalizeAuditLogsListResponse({
      logs: null,
      total: 3,
      page: 2,
      pageSize: 10,
    })
    expect(r.logs).toEqual([])
    expect(r.total).toBe(3)
  })

  it('normalizeAuditLogRow maps target and core fields', () => {
    const row = normalizeAuditLogRow({
      id: '550e8400-e29b-41d4-a716-446655440000',
      actorId: null,
      action: 'test',
      target: { entity: 'application', entityId: 'e1', a: 1 },
      notes: 'n',
      createdAt: 't',
      actorEmail: 'x@y.com',
      actorName: 'X',
    })
    expect(row?.target?.entity).toBe('application')
    expect(row?.target?.a).toBe(1)
    expect(row?.notes).toBe('n')
  })

  it('normalizeAuditLogsStats handles missing series', () => {
    const s = normalizeAuditLogsStats({})
    expect(s.series).toEqual([])
    expect(s.total).toBe(0)
  })
})
