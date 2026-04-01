import { describe, expect, it } from 'vitest'
import { describeActiveCompanyScopeConflict, isActiveCompanyHeaderAligned } from '@/lib/active-company-scope'

describe('active-company-scope', () => {
  it('allows missing header', () => {
    expect(isActiveCompanyHeaderAligned(null, 'a')).toBe(true)
    expect(isActiveCompanyHeaderAligned('  ', 'a')).toBe(true)
  })

  it('requires exact match when header present', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(isActiveCompanyHeaderAligned(id, id)).toBe(true)
    expect(isActiveCompanyHeaderAligned(id, '660e8400-e29b-41d4-a716-446655440000')).toBe(false)
  })

  it('documents remediation copy', () => {
    expect(describeActiveCompanyScopeConflict().length).toBeGreaterThan(10)
  })
})
