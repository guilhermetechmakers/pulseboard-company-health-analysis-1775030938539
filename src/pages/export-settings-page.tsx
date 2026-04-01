import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Download, FileDown, Loader2, Palette } from 'lucide-react'
import { PageTemplate } from '@/components/layout/page-template'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ExportBrandingUploader } from '@/components/export-settings/export-branding-uploader'
import {
  ExportProgressIndicator,
  type ExportProgressPhase,
} from '@/components/export-settings/export-progress-indicator'
import { ExportDownloadPanel } from '@/components/export-settings/export-download-panel'
import { ExportEmailPanel } from '@/components/export-settings/export-email-panel'
import { ExportSummaryPanel } from '@/components/export-settings/export-summary-panel'
import { useReport } from '@/hooks/use-analysis'
import { useMyCompany } from '@/hooks/use-my-company'
import { useCompanyBranding, useUpsertCompanyBranding } from '@/hooks/use-company-branding'
import { useExportContextQuery } from '@/hooks/use-export-context'
import { useExportJob, useExportJobsForReport, useRefreshExportDownloadUrl, useStartReportExport } from '@/hooks/use-export-jobs'
import { supabase } from '@/lib/supabase'
import { invokeExportDownloadUrl } from '@/lib/supabase-functions'
import {
  EXPORT_SECTION_KEYS,
  exportFormSchema,
  type ExportFormValues,
  type ExportSectionKey,
} from '@/lib/export-schema'
import { EXPORT_SECTION_LABELS } from '@/lib/export-section-labels'
import { cn } from '@/lib/utils'
import type { ExportJobRow } from '@/types/export'
import { Badge, type BadgeProps } from '@/components/ui/badge'

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string')
}

function isExportSectionKey(s: string): s is ExportSectionKey {
  return (EXPORT_SECTION_KEYS as readonly string[]).includes(s)
}

function prefsFromBranding(exportPreferences: Record<string, unknown> | undefined): Partial<ExportFormValues> {
  const raw = exportPreferences ?? {}
  const sectionsRaw = raw.sections
  const sections = asStringArray(sectionsRaw).filter(isExportSectionKey)
  const orientation = raw.orientation === 'landscape' || raw.orientation === 'portrait' ? raw.orientation : undefined
  const pageSize = raw.pageSize === 'Letter' || raw.pageSize === 'A4' ? raw.pageSize : undefined
  const format = raw.format === 'html' || raw.format === 'pdf' ? raw.format : undefined
  const primaryColor = typeof raw.primaryColor === 'string' ? raw.primaryColor : undefined
  const secondaryColor = typeof raw.secondaryColor === 'string' ? raw.secondaryColor : undefined
  const includeLogo = typeof raw.includeLogo === 'boolean' ? raw.includeLogo : undefined
  const whiteLabel = typeof raw.whiteLabel === 'boolean' ? raw.whiteLabel : undefined
  const notifyByEmail = typeof raw.notifyByEmail === 'boolean' ? raw.notifyByEmail : undefined
  const deliveryEmail = typeof raw.deliveryEmail === 'string' ? raw.deliveryEmail : undefined
  return {
    sections,
    orientation,
    pageSize,
    format,
    primaryColor,
    secondaryColor,
    includeLogo,
    whiteLabel,
    notifyByEmail,
    deliveryEmail,
  }
}

function statusBadgeVariant(status: string): NonNullable<BadgeProps['variant']> {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'destructive'
  if (status === 'processing' || status === 'queued') return 'warning'
  return 'outline'
}

function normalizeHexForPicker(hex: string, fallback: string): string {
  const s = hex.trim()
  if (/^#[0-9A-Fa-f]{6}$/i.test(s)) return s.toUpperCase()
  if (/^#[0-9A-Fa-f]{3}$/i.test(s) && s.length === 4) {
    const r = s[1]
    const g = s[2]
    const b = s[3]
    return (`#${r}${r}${g}${g}${b}${b}`).toUpperCase()
  }
  return fallback
}

export function ExportSettingsPage() {
  const { id } = useParams()
  const reportId = id
  const { data: company } = useMyCompany()
  const companyId = company?.id
  const { data: report, isLoading: reportLoading, error: reportError } = useReport(reportId)
  const { data: branding, isLoading: brandingLoading } = useCompanyBranding(companyId)
  const { data: exportContext, isLoading: exportContextLoading } = useExportContextQuery(reportId)
  const upsertBranding = useUpsertCompanyBranding()
  const startExport = useStartReportExport()
  const refreshUrl = useRefreshExportDownloadUrl()
  const { data: jobHistory = [] } = useExportJobsForReport(reportId)

  const safeJobs: ExportJobRow[] = Array.isArray(jobHistory) ? jobHistory : []

  const [signedDownloadUrl, setSignedDownloadUrl] = useState<string | null>(null)
  const [lastExportId, setLastExportId] = useState<string | null>(null)
  const [pollExportId, setPollExportId] = useState<string | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [completedFileSize, setCompletedFileSize] = useState<number | null>(null)
  const pollCompleteHandled = useRef<string | null>(null)

  const defaultValues = useMemo<ExportFormValues>(
    () => ({
      sections: [...EXPORT_SECTION_KEYS],
      orientation: 'portrait',
      pageSize: 'A4',
      format: 'pdf',
      primaryColor: '#0B6AF7',
      secondaryColor: '#064FD6',
      includeLogo: false,
      whiteLabel: false,
      notifyByEmail: false,
      deliveryEmail: '',
    }),
    [],
  )

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues,
  })

  const { handleSubmit, watch, setValue, reset, formState } = form
  const watched = watch()

  const { data: polledJob } = useExportJob(pollExportId ?? undefined)

  useEffect(() => {
    if (!branding) return
    const prefs = prefsFromBranding(branding.export_preferences ?? {})
    reset({
      sections: prefs.sections?.length ? prefs.sections : [...EXPORT_SECTION_KEYS],
      orientation: prefs.orientation ?? 'portrait',
      pageSize: prefs.pageSize ?? 'A4',
      format: prefs.format ?? 'pdf',
      primaryColor: prefs.primaryColor ?? branding.primary_color ?? '#0B6AF7',
      secondaryColor: prefs.secondaryColor ?? branding.secondary_color ?? '#064FD6',
      includeLogo: prefs.includeLogo ?? false,
      whiteLabel: prefs.whiteLabel ?? false,
      notifyByEmail: prefs.notifyByEmail ?? false,
      deliveryEmail: prefs.deliveryEmail ?? '',
    })
  }, [branding, reset])

  useEffect(() => {
    let cancelled = false
    async function loadLogo() {
      if (!supabase || !branding?.logo_storage_path) {
        setLogoPreviewUrl(null)
        return
      }
      const { data, error } = await supabase.storage
        .from('branding-assets')
        .createSignedUrl(branding.logo_storage_path, 900)
      if (!cancelled && !error && data?.signedUrl) {
        setLogoPreviewUrl(data.signedUrl)
      } else if (!cancelled) {
        setLogoPreviewUrl(null)
      }
    }
    void loadLogo()
    return () => {
      cancelled = true
    }
  }, [branding?.logo_storage_path])

  useEffect(() => {
    if (!polledJob || polledJob.status !== 'completed') return
    if (pollCompleteHandled.current === polledJob.id) return
    pollCompleteHandled.current = polledJob.id
    const idJob = polledJob.id
    void (async () => {
      try {
        const r = await invokeExportDownloadUrl({ exportId: idJob, expiresIn: 7200 })
        setSignedDownloadUrl(r.data.signedUrl)
        setPollExportId(null)
        const sz =
          typeof polledJob.file_size_bytes === 'number' && Number.isFinite(polledJob.file_size_bytes)
            ? polledJob.file_size_bytes
            : null
        setCompletedFileSize(sz)
        toast.success('Export ready')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not get download URL')
      }
    })()
  }, [polledJob])

  useEffect(() => {
    if (polledJob?.status !== 'failed') return
    toast.error(typeof polledJob.error_message === 'string' ? polledJob.error_message : 'Export failed')
    setPollExportId(null)
  }, [polledJob?.status, polledJob?.error_message])

  const progressPhase: ExportProgressPhase = useMemo(() => {
    if (startExport.isPending) return 'submitting'
    if (polledJob?.status === 'failed') return 'failed'
    if (polledJob?.status === 'queued') return 'queued'
    if (polledJob?.status === 'processing') return 'processing'
    if (signedDownloadUrl) return 'completed'
    return 'idle'
  }, [startExport.isPending, polledJob?.status, signedDownloadUrl])

  const progressPercent = useMemo(() => {
    if (startExport.isPending) return 22
    if (polledJob?.status === 'queued') return 18
    if (polledJob?.status === 'processing') {
      const p = typeof polledJob.progress === 'number' ? polledJob.progress : 40
      return Math.min(95, Math.max(30, p))
    }
    if (signedDownloadUrl) return 100
    return 0
  }, [startExport.isPending, polledJob?.status, polledJob?.progress, signedDownloadUrl])

  const statusLabel = useMemo(() => {
    if (startExport.isPending) return 'Submitting…'
    if (polledJob?.status === 'queued') return 'Queued'
    if (polledJob?.status === 'processing') return 'In progress'
    if (polledJob?.status === 'failed') return 'Failed'
    if (signedDownloadUrl) return 'Completed'
    return 'Idle'
  }, [startExport.isPending, polledJob?.status, signedDownloadUrl])

  const whiteLabelAllowed = exportContext?.whiteLabelAllowed === true

  const toggleSection = (key: ExportSectionKey) => {
    const cur = form.getValues('sections') ?? []
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    setValue('sections', next, { shouldValidate: true })
  }

  const onSavePreferences = async () => {
    if (!companyId) return
    const values = form.getValues()
    await upsertBranding.mutateAsync({
      companyId,
      patch: {
        primary_color: values.primaryColor,
        secondary_color: values.secondaryColor,
        export_preferences: {
          sections: values.sections,
          orientation: values.orientation,
          pageSize: values.pageSize,
          format: values.format,
          primaryColor: values.primaryColor,
          secondaryColor: values.secondaryColor,
          includeLogo: values.includeLogo,
          whiteLabel: values.whiteLabel,
          notifyByEmail: values.notifyByEmail,
          deliveryEmail: values.deliveryEmail,
        },
      },
    })
  }

  const onLogoSelected = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file || !companyId || !supabase) return
    const path = `${companyId}/logo-${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error } = await supabase.storage.from('branding-assets').upload(path, file, { upsert: true })
    if (error) {
      toast.error(error.message ?? 'Logo upload failed')
      return
    }
    await upsertBranding.mutateAsync({
      companyId,
      patch: { logo_storage_path: path },
    })
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!reportId) return
    if (values.includeLogo && !branding?.logo_storage_path) {
      toast.error('Upload a logo first, or turn off “Include logo in export”.')
      return
    }
    if (exportContext?.whiteLabelAllowed === false && values.whiteLabel) {
      setValue('whiteLabel', false)
      toast.error('White-label is not available on your plan.')
      return
    }
    pollCompleteHandled.current = null
    const res = await startExport.mutateAsync({ reportId, values })
    const d = res?.data
    if (!d?.exportId) return
    setLastExportId(d.exportId)
    if (d.status === 'completed' && d.signedUrl) {
      setSignedDownloadUrl(d.signedUrl)
      setPollExportId(null)
      setCompletedFileSize(null)
      toast.success('Export ready')
    } else {
      setSignedDownloadUrl(null)
      setCompletedFileSize(null)
      setPollExportId(d.exportId)
    }
  })

  const onRefreshDownload = async () => {
    if (!lastExportId) return
    const res = await refreshUrl.mutateAsync({ exportId: lastExportId, expiresIn: 7200 })
    setSignedDownloadUrl(res.data.signedUrl)
  }

  const reportComplete = report?.status === 'completed'
  const completenessWarning = !reportComplete

  if (!supabase) {
    return (
      <PageTemplate title="Export settings" description="Configure branded PDF and HTML exports.">
        <Card className="p-6 text-sm text-muted-foreground">Supabase is not configured.</Card>
      </PageTemplate>
    )
  }

  if (!reportId) {
    return (
      <PageTemplate title="Export settings" description="Missing report id.">
        <Button asChild variant="secondary">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </PageTemplate>
    )
  }

  if (reportLoading || brandingLoading || exportContextLoading) {
    return (
      <PageTemplate title="Preparing export" description="Loading report, branding, and export options.">
        <div className="h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </PageTemplate>
    )
  }

  if (reportError || !report) {
    return (
      <PageTemplate title="Report unavailable" description="We could not load this report for export.">
        <p className="text-sm text-destructive">{reportError instanceof Error ? reportError.message : 'Unknown error'}</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Export & PDF settings"
      description="Choose sections, branding, page size, and delivery. Exports are generated server-side with queue support."
    >
      <div className="mb-6 flex flex-wrap gap-2 no-print">
        <Button asChild variant="secondary">
          <Link to={`/report/${report.id}`}>Back to report</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </div>

      {completenessWarning ? (
        <div
          className="mb-6 rounded-xl border border-[rgb(245,158,11)]/50 bg-[rgb(245,158,11)]/10 px-4 py-3 text-sm"
          role="status"
        >
          This analysis is still <strong>{report.status}</strong>. Export will use the latest saved text — verify content
          before sharing with clients.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-6 p-6 transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-xl font-semibold">Export options</h2>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Sections</legend>
              <p className="text-xs text-muted-foreground">Include at least one section in the deliverable.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(EXPORT_SECTION_KEYS ?? []).map((key) => {
                  const checked = (watched.sections ?? []).includes(key)
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors duration-200 hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSection(key)}
                        aria-label={EXPORT_SECTION_LABELS[key]}
                      />
                      <span className="text-sm font-medium leading-none">{EXPORT_SECTION_LABELS[key]}</span>
                    </label>
                  )
                })}
              </div>
              {formState.errors.sections ? (
                <p className="text-xs text-destructive">{formState.errors.sections.message}</p>
              ) : null}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orientation">Orientation</Label>
                <select
                  id="orientation"
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm',
                    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  value={watched.orientation}
                  onChange={(e) =>
                    setValue('orientation', e.target.value === 'landscape' ? 'landscape' : 'portrait', {
                      shouldValidate: true,
                    })
                  }
                  aria-label="Page orientation"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageSize">Page size</Label>
                <select
                  id="pageSize"
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm',
                    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  value={watched.pageSize}
                  onChange={(e) =>
                    setValue('pageSize', e.target.value === 'Letter' ? 'Letter' : 'A4', { shouldValidate: true })
                  }
                  aria-label="Page size"
                >
                  <option value="A4">A4</option>
                  <option value="Letter">US Letter</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">File format</Label>
              <select
                id="format"
                className={cn(
                  'max-w-md flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                value={watched.format}
                onChange={(e) =>
                  setValue('format', e.target.value === 'html' ? 'html' : 'pdf', { shouldValidate: true })
                }
                aria-label="Export file format"
              >
                <option value="pdf">PDF</option>
                <option value="html">HTML (print-friendly)</option>
              </select>
              <p className="text-xs text-muted-foreground">PDF is the default client deliverable; HTML is a fallback for accessibility tooling.</p>
            </div>

            <div className="space-y-4 rounded-lg border border-border/80 bg-muted/20 p-4">
              <p className="text-sm font-medium">Branding</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Label htmlFor="include-logo" className="text-sm font-medium">
                    Include logo in export
                  </Label>
                  <p className="text-xs text-muted-foreground">Uses your saved company logo in the document header.</p>
                </div>
                <Switch
                  id="include-logo"
                  checked={watched.includeLogo}
                  onCheckedChange={(c) => setValue('includeLogo', Boolean(c), { shouldValidate: true })}
                  aria-label="Include company logo in export"
                />
              </div>
              {whiteLabelAllowed ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="white-label" className="text-sm font-medium">
                      White-label (hide PulseBoard footer)
                    </Label>
                    <p className="text-xs text-muted-foreground">Available on Pro and Agency plans.</p>
                  </div>
                  <Switch
                    id="white-label"
                    checked={watched.whiteLabel}
                    onCheckedChange={(c) => setValue('whiteLabel', Boolean(c), { shouldValidate: true })}
                    aria-label="White-label branding"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Upgrade to Pro or Agency to enable white-label PDFs.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={normalizeHexForPicker(watched.primaryColor, '#0B6AF7')}
                    onChange={(e) => setValue('primaryColor', e.target.value, { shouldValidate: true })}
                    aria-label="Primary brand color"
                  />
                  <Input
                    value={watched.primaryColor}
                    onChange={(e) => setValue('primaryColor', e.target.value, { shouldValidate: true })}
                    aria-label="Primary brand color hex"
                  />
                </div>
                {formState.errors.primaryColor ? (
                  <p className="text-xs text-destructive">{formState.errors.primaryColor.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={normalizeHexForPicker(watched.secondaryColor, '#064FD6')}
                    onChange={(e) => setValue('secondaryColor', e.target.value, { shouldValidate: true })}
                    aria-label="Secondary brand color"
                  />
                  <Input
                    value={watched.secondaryColor}
                    onChange={(e) => setValue('secondaryColor', e.target.value, { shouldValidate: true })}
                    aria-label="Secondary brand color hex"
                  />
                </div>
                {formState.errors.secondaryColor ? (
                  <p className="text-xs text-destructive">{formState.errors.secondaryColor.message}</p>
                ) : null}
              </div>
            </div>

            <ExportBrandingUploader
              onFileChange={(files) => void onLogoSelected(files)}
              disabled={!companyId || upsertBranding.isPending}
            />

            <div className="space-y-4 rounded-lg border border-border/80 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notify-email" className="text-sm font-medium">
                    Email me when export completes
                  </Label>
                  <p className="text-xs text-muted-foreground">Sends the export-ready template with a download link.</p>
                </div>
                <Switch
                  id="notify-email"
                  checked={watched.notifyByEmail}
                  onCheckedChange={(c) => setValue('notifyByEmail', Boolean(c), { shouldValidate: true })}
                  aria-label="Email when export completes"
                />
              </div>
              {watched.notifyByEmail ? (
                <div className="space-y-2">
                  <Label htmlFor="deliveryEmail">Delivery email</Label>
                  <Input
                    id="deliveryEmail"
                    type="email"
                    value={watched.deliveryEmail}
                    onChange={(e) => setValue('deliveryEmail', e.target.value, { shouldValidate: true })}
                    placeholder="you@company.com"
                    aria-label="Email address for export delivery"
                  />
                  {formState.errors.deliveryEmail ? (
                    <p className="text-xs text-destructive">{formState.errors.deliveryEmail.message}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void onSavePreferences()}
                disabled={upsertBranding.isPending || !companyId}
              >
                Save preferences
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="gap-2 transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none"
                disabled={startExport.isPending}
              >
                {startExport.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    Exporting…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden />
                    Generate export
                  </>
                )}
              </Button>
            </div>
          </form>

          <ExportProgressIndicator
            phase={progressPhase}
            progressPercent={progressPercent}
            statusLabel={statusLabel}
            errorMessage={polledJob?.status === 'failed' ? polledJob.error_message : null}
          />

          {signedDownloadUrl ? (
            <ExportDownloadPanel
              signedUrl={signedDownloadUrl}
              formatLabel={watched.format === 'html' ? 'HTML' : 'PDF'}
              fileNameHint={`Report export · ${watched.format === 'html' ? 'HTML document' : 'PDF document'}`}
              fileSizeBytes={completedFileSize ?? (typeof polledJob?.file_size_bytes === 'number' ? polledJob.file_size_bytes : null)}
              onRefreshLink={() => void onRefreshDownload()}
              isRefreshing={refreshUrl.isPending}
            />
          ) : null}

          {lastExportId && signedDownloadUrl ? (
            <ExportEmailPanel reportId={reportId} exportId={lastExportId} disabled={startExport.isPending} />
          ) : null}
        </Card>

        <div className="space-y-6">
          <ExportSummaryPanel values={watched} />

          <Card className="overflow-hidden p-0 transition-shadow duration-200 hover:shadow-md">
            <div
              className="border-b px-6 py-4"
              style={{
                background: `linear-gradient(135deg, ${watched.primaryColor}22, ${watched.secondaryColor}18)`,
              }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Palette className="h-4 w-4" style={{ color: watched.primaryColor }} aria-hidden />
                Brand preview
              </div>
              <p className="text-xs text-muted-foreground">Approximates cover styling for the exported document.</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-4">
                {watched.includeLogo && logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Company logo preview"
                    className="h-14 max-w-[160px] object-contain"
                  />
                ) : (
                  <div className="flex h-14 w-28 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    {watched.includeLogo ? 'Upload logo' : 'Logo off'}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold" style={{ color: watched.primaryColor }}>
                    {company?.name ?? 'Your company'}
                  </p>
                  <p className="text-sm text-muted-foreground">Company health report</p>
                  {!watched.whiteLabel ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">PulseBoard attribution in footer</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">White-label footer</p>
                  )}
                </div>
              </div>
              <div className="prose prose-sm max-w-none rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground dark:prose-invert">
                <p className="whitespace-pre-wrap text-foreground">
                  {(report.executive_summary ?? '').slice(0, 280)}
                  {(report.executive_summary ?? '').length > 280 ? '…' : ''}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 text-lg font-semibold">Recent exports</h3>
            {(safeJobs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No exports yet for this report.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {(safeJobs ?? []).map((job) => {
                  const params = job.export_params && typeof job.export_params === 'object' ? job.export_params : {}
                  const fmt = typeof (params as { format?: string }).format === 'string' ? (params as { format: string }).format : 'pdf'
                  const fsize =
                    typeof job.file_size_bytes === 'number' && Number.isFinite(job.file_size_bytes)
                      ? ` · ${(job.file_size_bytes / 1024).toFixed(0)} KB`
                      : ''
                  return (
                    <li
                      key={job.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors duration-200 hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{new Date(job.created_at).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt.toUpperCase()} · {job.progress}%{fsize}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageTemplate>
  )
}
