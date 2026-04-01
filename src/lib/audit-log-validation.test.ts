import { describe, expect, it } from 'vitest'
import {
  auditLogCreateBodySchema,
  parseAuditLogCreateBody,
  parseAuditLogsListParams,
} from '@/lib/audit-log-validation'

describe('audit-log-validation', () => {
  it('parseAuditLogsListParams supplies defaults', () => {
    const p = parseAuditLogsListParams({})
    expect(p.page).toBe(1)
    expect(p.pageSize).toBe(20)
    expect(p.sort).toBe('desc')
  })

  it('auditLogCreateBodySchema rejects empty action', () => {
    const r = auditLogCreateBodySchema.safeParse({ action: '   ' })
    expect(r.success).toBe(false)
  })

  it('parseAuditLogCreateBody accepts minimal payload', () => {
    const b = parseAuditLogCreateBody({ action: 'user_login' })
    expect(b.action).toBe('user_login')
  })

  it('parseAuditLogCreateBody rejects bad actorId', () => {
    expect(() => parseAuditLogCreateBody({ action: 'x', actorId: 'not-uuid' })).toThrow()
  })
})
