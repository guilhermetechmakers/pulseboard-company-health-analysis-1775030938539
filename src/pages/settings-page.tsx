import { useCallback, useEffect, useId, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SyncHistoryPanel } from '@/components/integrations/sync-history-panel'
import { SettingsContainer } from '@/components/settings/settings-container'
import type { IntegrationProvider } from '@/types/integrations'
import { useAuth } from '@/contexts/auth-context'
import { useUserProfile } from '@/hooks/use-auth-profile'
import { useMyCompany } from '@/hooks/use-my-company'
import { useIntegrations, useEnsureIntegrationMutation } from '@/hooks/use-integrations'
import { useSyncJobs } from '@/hooks/use-sync-jobs'
import { csvImportRequest, integrationOAuthExchange } from '@/api/integration-functions'
import { supabase } from '@/lib/supabase'

const csvSchema = z.object({
  csvText: z.string().min(3, 'Paste at least one row'),
  targetModel: z.enum(['financials', 'market', 'social']),
  fileName: z.string().optional(),
})

type CsvForm = z.infer<typeof csvSchema>

export function SettingsPage() {
  const csvSectionRef = useRef<HTMLElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const formId = useId()
  const { user } = useAuth()
  const userId = user?.id
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId)
  const { data: company, isLoading } = useMyCompany()
  const companyId = company?.id
  const { data: integrations = [], isLoading: intLoading } = useIntegrations(companyId)
  const { data: jobs, isLoading: jobsLoading } = useSyncJobs(companyId)
  const ensureIntegration = useEnsureIntegrationMutation(companyId)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CsvForm>({
    resolver: zodResolver(csvSchema),
    defaultValues: { csvText: '', targetModel: 'financials', fileName: 'import.csv' },
  })

  const scrollToCsv = useCallback(() => {
    csvSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code || !companyId) return
    const providerParam = searchParams.get('provider') as IntegrationProvider | null
    const stored = sessionStorage.getItem('pb_oauth_provider') as IntegrationProvider | null
    const provider = providerParam ?? stored
    if (!provider || !['ga4', 'quickbooks', 'linkedin', 'stripe', 'csv'].includes(provider)) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await integrationOAuthExchange(companyId, provider, code)
        if (cancelled) return
        if (res?.error) toast.error(String(res.error))
        else toast.success('Integration connected')
        sessionStorage.removeItem('pb_oauth_provider')
        setSearchParams({}, { replace: true })
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, companyId, setSearchParams])

  useEffect(() => {
    if (window.location.hash === '#csv-import') {
      scrollToCsv()
    }
  }, [scrollToCsv])

  async function onCsvSubmit(values: CsvForm) {
    if (!companyId) return
    await ensureIntegration.mutateAsync('csv')
    const result = await csvImportRequest({
      companyId,
      csvText: values.csvText,
      targetModel: values.targetModel,
      fileName: values.fileName || 'import.csv',
    })
    if (result.error) {
      toast.error(String(result.error))
      return
    }
    toast.success(`Imported ${result.rowsProcessed ?? 0} rows`)
    reset({ csvText: '', targetModel: values.targetModel, fileName: values.fileName })
  }

  if (isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </section>
    )
  }

  if (!companyId) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <Card className="p-8 text-center text-muted-foreground">
          Create a company before managing settings.
        </Card>
      </section>
    )
  }

  const safeIntegrations = Array.isArray(integrations) ? integrations : []

  return (
    <SettingsContainer
      userId={userId}
      companyId={companyId}
      profile={profile}
      profileLoading={profileLoading}
      integrations={safeIntegrations}
      integrationsLoading={intLoading}
      onCsvFocus={scrollToCsv}
    >
      <section
        ref={csvSectionRef}
        id="csv-import"
        className="scroll-mt-24 rounded-xl border border-border bg-card p-6 shadow-card"
        aria-labelledby={`${formId}-csv-heading`}
      >
        <h2 id={`${formId}-csv-heading`} className="text-lg font-semibold">
          CSV upload connector (run import)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Financials require <code className="rounded bg-muted px-1">revenue</code> and{' '}
          <code className="rounded bg-muted px-1">expenses</code> columns (header row). Use the preview above first, then commit
          rows here via <code className="rounded bg-muted px-1">pulse-data-io</code>.
        </p>
        {!supabase && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable import.
          </p>
        )}
        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onCsvSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-target`} className="text-sm font-medium">
                Target model
              </label>
              <select
                id={`${formId}-target`}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                {...register('targetModel')}
              >
                <option value="financials">Financials</option>
                <option value="market">Market</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${formId}-file`} className="text-sm font-medium">
                File label
              </label>
              <Input id={`${formId}-file`} placeholder="import.csv" {...register('fileName')} className="mt-1" />
            </div>
          </div>
          <div>
            <label htmlFor={`${formId}-csv`} className="text-sm font-medium">
              CSV / TSV content
            </label>
            <textarea
              id={`${formId}-csv`}
              rows={8}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder={'revenue,expenses\n100000,80000'}
              {...register('csvText')}
              aria-invalid={Boolean(errors.csvText)}
            />
            {errors.csvText && (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {errors.csvText.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting || !supabase} className="min-h-[44px]">
            {isSubmitting ? 'Importing…' : 'Run import'}
          </Button>
        </form>
      </section>

      <SyncHistoryPanel jobs={jobs ?? []} isLoading={jobsLoading} />

      <Card className="border-dashed p-6">
        <h3 className="font-medium">Audit & compliance</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sensitive actions are logged to <code className="rounded bg-muted px-1">audit_logs</code> and{' '}
          <code className="rounded bg-muted px-1">user_activity_logs</code> via Edge Functions and RLS-scoped clients.
        </p>
      </Card>
    </SettingsContainer>
  )
}
