import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EXPORT_SECTION_KEYS, type ExportFormValues, type ExportSectionKey } from '@/lib/export-schema'
import { EXPORT_SECTION_LABELS } from '@/lib/export-section-labels'

export interface ExportSummaryPanelProps {
  values: ExportFormValues
}

export function ExportSummaryPanel({ values }: ExportSummaryPanelProps) {
  const sections = Array.isArray(values.sections) ? values.sections : []
  const keys = (EXPORT_SECTION_KEYS as readonly ExportSectionKey[]).filter((k) => sections.includes(k))

  return (
    <Card className="space-y-3 border-dashed p-4 transition-shadow duration-200 hover:shadow-sm">
      <p className="text-sm font-semibold">Configuration summary</p>
      <div className="flex flex-wrap gap-1.5">
        {(keys ?? []).map((k) => (
          <Badge key={k} variant="outline" className="font-normal">
            {EXPORT_SECTION_LABELS[k]}
          </Badge>
        ))}
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>
          Page: {values.pageSize} · {values.orientation}
        </li>
        <li>Format: {values.format.toUpperCase()}</li>
        <li>Logo in file: {values.includeLogo ? 'Yes' : 'No'}</li>
        <li>Branding: {values.whiteLabel ? 'White-label (no PulseBoard footer)' : 'Standard (attribution footer)'}</li>
        <li>Email on complete: {values.notifyByEmail ? `Yes → ${values.deliveryEmail || '…'}` : 'No'}</li>
      </ul>
    </Card>
  )
}
