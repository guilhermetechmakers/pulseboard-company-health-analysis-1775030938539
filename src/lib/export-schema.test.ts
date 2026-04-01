import { describe, expect, it } from 'vitest'
import { exportFormSchema, EXPORT_SECTION_KEYS } from '@/lib/export-schema'

describe('exportFormSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = exportFormSchema.safeParse({
      sections: [...EXPORT_SECTION_KEYS],
      orientation: 'portrait',
      format: 'pdf',
      primaryColor: '#0B6AF7',
      secondaryColor: '#064FD6',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects empty sections', () => {
    const parsed = exportFormSchema.safeParse({
      sections: [],
      orientation: 'portrait',
      format: 'pdf',
      primaryColor: '#0B6AF7',
      secondaryColor: '#064FD6',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts three-digit hex colors', () => {
    const parsed = exportFormSchema.safeParse({
      sections: ['executiveSummary'],
      orientation: 'landscape',
      format: 'html',
      primaryColor: '#0AF',
      secondaryColor: '#abc',
    })
    expect(parsed.success).toBe(true)
  })
})
