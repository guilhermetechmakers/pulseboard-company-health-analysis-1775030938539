import { describe, expect, it } from 'vitest'
import { exportFormSchema, EXPORT_SECTION_KEYS } from '@/lib/export-schema'

describe('exportFormSchema', () => {
  const base = {
    sections: [...EXPORT_SECTION_KEYS],
    orientation: 'portrait' as const,
    pageSize: 'A4' as const,
    format: 'pdf' as const,
    primaryColor: '#0B6AF7',
    secondaryColor: '#064FD6',
    includeLogo: false,
    whiteLabel: false,
    notifyByEmail: false,
    deliveryEmail: '',
  }

  it('accepts a valid payload', () => {
    const parsed = exportFormSchema.safeParse(base)
    expect(parsed.success).toBe(true)
  })

  it('rejects empty sections', () => {
    const parsed = exportFormSchema.safeParse({ ...base, sections: [] })
    expect(parsed.success).toBe(false)
  })

  it('accepts three-digit hex colors', () => {
    const parsed = exportFormSchema.safeParse({
      ...base,
      sections: ['executiveSummary'],
      orientation: 'landscape',
      format: 'html',
      primaryColor: '#0AF',
      secondaryColor: '#abc',
    })
    expect(parsed.success).toBe(true)
  })

  it('requires delivery email when notify is on', () => {
    const parsed = exportFormSchema.safeParse({
      ...base,
      notifyByEmail: true,
      deliveryEmail: '',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts notify with valid email', () => {
    const parsed = exportFormSchema.safeParse({
      ...base,
      notifyByEmail: true,
      deliveryEmail: 'a@b.co',
    })
    expect(parsed.success).toBe(true)
  })
})
