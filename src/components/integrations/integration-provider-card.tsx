import { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Plug } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  integrationOAuthStart,
  integrationOAuthExchange,
  integrationSync,
} from '@/api/integration-functions'
import type { IntegrationProvider } from '@/types/integrations'
import type { IntegrationRow } from '@/types/integrations'

export interface IntegrationProviderCardProps {
  companyId: string
  provider: IntegrationProvider
  label: string
  description: string
  scopes: string[]
  integration: IntegrationRow | undefined
  onCsvFocus?: () => void
}

export function IntegrationProviderCard({
  companyId,
  provider,
  label,
  description,
  scopes,
  integration,
  onCsvFocus,
}: IntegrationProviderCardProps) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!integration?.id) throw new Error('Connect first')
      return integrationSync(integration.id)
    },
    onSuccess: (data) => {
      if (data?.error) toast.error(String(data.error))
      else toast.success('Sync completed')
      void qc.invalidateQueries({ queryKey: ['integrations', companyId] })
      void qc.invalidateQueries({ queryKey: ['sync-jobs', companyId] })
      void qc.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cadenceMutation = useMutation({
    mutationFn: async (cadence: string) => {
      if (!supabase || !integration?.id) return
      const { error } = await supabase.from('integrations').update({ cadence }).eq('id', integration.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Sync cadence updated')
      void qc.invalidateQueries({ queryKey: ['integrations', companyId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const status = integration?.status ?? 'disconnected'
  const statusBadge =
    status === 'connected'
      ? 'success'
      : status === 'error'
        ? 'destructive'
        : status === 'syncing' || status === 'connecting'
          ? 'warning'
          : 'outline'

  async function handleConnect() {
    if (provider === 'csv') {
      onCsvFocus?.()
      toast.message('Scroll to CSV import', { description: 'Paste rows and choose a target model.' })
      return
    }
    setBusy(true)
    try {
      const redirectUri = `${window.location.origin}/settings`
      const res = await integrationOAuthStart(companyId, provider, redirectUri)
      const url = res.authUrl
      if (url) {
        sessionStorage.setItem('pb_oauth_provider', provider)
        window.location.assign(url)
        return
      }
      toast.error('Could not start OAuth')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleMockExchange() {
    setBusy(true)
    try {
      await integrationOAuthExchange(companyId, provider, 'mock_code')
      toast.success(`${label} connected (demo token)`)
      void qc.invalidateQueries({ queryKey: ['integrations', companyId] })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      className={cn(
        'flex h-full flex-col gap-4 p-6 transition-all duration-200 hover:shadow-lg',
        status === 'connected' && 'ring-1 ring-primary/20',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-medium">{label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant={statusBadge}>{status}</Badge>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Scopes / access</p>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          {(scopes ?? []).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {integration?.last_synced_at ? (
          <span>
            Last synced{' '}
            <time dateTime={integration.last_synced_at}>
              {formatDistanceToNow(new Date(integration.last_synced_at), { addSuffix: true })}
            </time>
          </span>
        ) : (
          <span>No sync yet</span>
        )}
        {integration?.next_sync_at && integration.cadence !== 'manual' && (
          <span className="text-muted-foreground/80">
            · Next: {formatDistanceToNow(new Date(integration.next_sync_at), { addSuffix: true })}
          </span>
        )}
      </div>
      {integration?.last_error && status === 'error' && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {integration.last_error}
        </p>
      )}
      {integration?.id && provider !== 'csv' && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`cadence-${integration.id}`} className="text-xs font-medium text-muted-foreground">
            Cadence
          </label>
          <select
            id={`cadence-${integration.id}`}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            value={integration.cadence}
            onChange={(e) => cadenceMutation.mutate(e.target.value)}
            disabled={cadenceMutation.isPending}
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="manual">Manual only</option>
          </select>
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          className="gap-2"
          onClick={handleConnect}
          disabled={busy || syncMutation.isPending}
          aria-label={`Connect ${label}`}
        >
          <Plug className="h-4 w-4" />
          {provider === 'csv' ? 'Import CSV' : 'Connect'}
        </Button>
        {provider !== 'csv' && (
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => syncMutation.mutate()}
            disabled={!integration?.id || status === 'disconnected' || syncMutation.isPending}
            aria-label={`Sync ${label}`}
          >
            <RefreshCw className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')} />
            Sync now
          </Button>
        )}
        {import.meta.env.DEV && provider !== 'csv' && (
          <Button type="button" variant="ghost" onClick={handleMockExchange} disabled={busy}>
            Demo connect
          </Button>
        )}
      </div>
    </Card>
  )
}
