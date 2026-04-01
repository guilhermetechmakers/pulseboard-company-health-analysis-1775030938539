import { Skeleton } from '@/components/ui/skeleton'
import {
  CsvUploadConnector,
  GoogleAnalyticsConnector,
  LinkedInConnector,
  QuickBooksConnector,
  StripeConnector,
} from '@/components/settings/connectors/integration-connectors'
import type { IntegrationRow } from '@/types/integrations'
import { cn } from '@/lib/utils'

export interface IntegrationsCenterProps {
  companyId: string
  integrations: IntegrationRow[]
  isLoading: boolean
  onCsvFocus?: () => void
}

export function IntegrationsCenter({ companyId, integrations, isLoading, onCsvFocus }: IntegrationsCenterProps) {
  const list = Array.isArray(integrations) ? integrations : []

  if (isLoading) {
    return (
      <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl md:col-span-2" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold tracking-tight">Integrations center</h2>
      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        OAuth connectors store encrypted credentials server-side. Status shows Connected, Syncing, or Error with last sync
        timestamps. Use Sync now after connecting to pull normalized snapshots into your workspace.
      </p>
      <div
        className={cn(
          'grid auto-rows-fr gap-4',
          'md:grid-cols-2',
          'motion-safe:[&>*]:animate-fade-in motion-reduce:[&>*]:animate-none',
        )}
      >
        <QuickBooksConnector companyId={companyId} integrations={list} onCsvFocus={onCsvFocus} />
        <GoogleAnalyticsConnector companyId={companyId} integrations={list} onCsvFocus={onCsvFocus} />
        <LinkedInConnector companyId={companyId} integrations={list} onCsvFocus={onCsvFocus} />
        <StripeConnector companyId={companyId} integrations={list} onCsvFocus={onCsvFocus} />
        <div className="md:col-span-2">
          <CsvUploadConnector companyId={companyId} integrations={list} onCsvFocus={onCsvFocus} />
        </div>
      </div>
    </div>
  )
}
