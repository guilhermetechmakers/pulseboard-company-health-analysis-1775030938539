import { describe, expect, it } from 'vitest'
import { parseWizardDataFromUnknown } from '@/lib/onboarding-wizard-parse'

describe('parseWizardDataFromUnknown', () => {
  it('returns defaults for non-object', () => {
    const r = parseWizardDataFromUnknown(null)
    expect(r.step1.name).toBe('')
    expect(Array.isArray(r.step2.products_services)).toBe(true)
    expect((r.step4.competitors ?? []).length).toBe(0)
  })

  it('normalizes nested arrays safely', () => {
    const r = parseWizardDataFromUnknown({
      step4: { competitors: [{ name: 'A' }, null, { foo: 1 }] },
      step5: { channels: [{ platform: 'X', followers: '1', engagement: '' }] },
    })
    expect((r.step4.competitors ?? []).map((c) => c.name)).toEqual(['A'])
    expect((r.step5.channels ?? []).length).toBe(1)
  })
})
