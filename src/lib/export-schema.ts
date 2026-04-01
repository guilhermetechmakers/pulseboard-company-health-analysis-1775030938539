import { z } from 'zod'

export const EXPORT_SECTION_KEYS = [
  'executiveSummary',
  'swot',
  'financial',
  'market',
  'social',
  'risks',
  'opportunities',
  'actions',
] as const

export type ExportSectionKey = (typeof EXPORT_SECTION_KEYS)[number]

export const exportSectionKeySchema = z.enum(EXPORT_SECTION_KEYS)

export const exportFormSchema = z.object({
  sections: z.array(exportSectionKeySchema).min(1, 'Select at least one section'),
  orientation: z.enum(['portrait', 'landscape']),
  format: z.enum(['pdf', 'html']),
  primaryColor: z
    .string()
    .min(4)
    .refine((s) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s), 'Use a valid hex color'),
  secondaryColor: z
    .string()
    .min(4)
    .refine((s) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s), 'Use a valid hex color'),
})

export type ExportFormValues = z.infer<typeof exportFormSchema>
