import type { ExportSectionKey } from '@/lib/export-schema'

export const EXPORT_SECTION_LABELS: Record<ExportSectionKey, string> = {
  executiveSummary: 'Executive summary',
  swot: 'SWOT',
  financial: 'Financial analysis',
  market: 'Market analysis',
  social: 'Social & brand',
  risks: 'Top risks',
  opportunities: 'Opportunities',
  actions: 'Action plan',
}
