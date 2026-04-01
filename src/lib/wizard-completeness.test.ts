import { describe, expect, it } from 'vitest'
import { wizardCompletenessPercent, wizardMeetsMinimumThreshold } from '@/lib/wizard-completeness'
import { EMPTY_WIZARD_DATA, type OnboardingWizardData } from '@/types/company-wizard'

describe('wizard completeness', () => {
  it('empty wizard fails threshold', () => {
    expect(wizardMeetsMinimumThreshold(EMPTY_WIZARD_DATA)).toBe(false)
    expect(wizardCompletenessPercent(EMPTY_WIZARD_DATA)).toBe(0)
  })

  it('guards null-like arrays', () => {
    const partial = {
      ...EMPTY_WIZARD_DATA,
      step2: {
        ...EMPTY_WIZARD_DATA.step2,
        products_services: null as unknown as string[],
      },
    } as OnboardingWizardData
    expect(wizardMeetsMinimumThreshold(partial)).toBe(false)
  })

  it('passes when minimum slices satisfied', () => {
    const ok: OnboardingWizardData = {
      step1: { name: 'Acme', website: 'https://acme.test' },
      step2: {
        industry: 'Software',
        business_model: 'B2B',
        products_services: ['Widgets'],
        target_customers: 'SMB',
      },
      step3: { ...EMPTY_WIZARD_DATA.step3, revenue: '100000' },
      step4: { ...EMPTY_WIZARD_DATA.step4, competitors: [{ name: 'OtherCo' }] },
      step5: { ...EMPTY_WIZARD_DATA.step5, channels: [{ platform: 'LinkedIn', followers: '100', engagement: '2' }] },
    }
    expect(wizardMeetsMinimumThreshold(ok)).toBe(true)
    expect(wizardCompletenessPercent(ok)).toBe(100)
  })
})
