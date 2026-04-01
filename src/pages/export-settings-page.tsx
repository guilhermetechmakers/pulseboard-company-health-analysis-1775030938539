import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Download, FileDown, ImagePlus, Loader2, Palette } from 'lucide-react'
import { PageTemplate } from '@/components/layout/page-template'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { useReport } from '@/hooks/use-analysis'
import { useMyCompany } from '@/hooks/use-my-company'
import { useCompanyBranding, useUpsertCompanyBranding } from '@/hooks/use-company-branding'
import { useExportJobsForReport, useRefreshExportDownloadUrl, useStartReportExport } from '@/hooks/use-export-jobs'
import { supabase } from '@/lib/supabase'
import {
  EXPORT_SECTION_KEYS,
  exportFormSchema,
  type ExportFormValues,
  type ExportSectionKey,
} from '@/lib/export-schema'
import { cn } from '@/lib/utils'
import type { ExportJobRow } from '@/types/export'

const SECTION_LABELS: Record<ExportSectionKey, string> = {
  executiveSummary: 'Executive summary',
  swot: 'SWOT',
  financial: 'Financial analysis',
  market: 'Market analysis',
  social: 'Social & brand',
  risks: 'Top risks',
  opportunities: 'Opportunities',
  actions: 'Action plan',
}

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
  const format = raw.format === 'html' || raw.format === 'pdf' ? raw.format : undefined
  const primaryColor = typeof raw.primaryColor === 'string' ? raw.primaryColor : undefined
  const secondaryColor = typeof raw.secondaryColor === 'string' ? raw.secondaryColor : undefined
  return { sections, orientation, format, primaryColor, secondaryColor }
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
  const upsertBranding = useUpsertCompanyBranding()
  const startExport = useStartReportExport()
  const refreshUrl = useRefreshExportDownloadUrl()
  const { data: jobHistory = [] } = useExportJobsForReport(reportId)

  const safeJobs: ExportJobRow[] = Array.isArray(jobHistory) ? jobHistory : []

  const [signedDownloadUrl, setSignedDownloadUrl] = useState<string | null>(null)
  const [lastExportId, setLastExportId] = useState<string | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)

  const defaultValues = useMemo<ExportFormValues>(
    () => ({
      sections: [...EXPORT_SECTION_KEYS],
      orientation: 'portrait',
      format: 'pdf',
      primaryColor: '#0B6AF7',
      secondaryColor: '#064FD6',
    }),
    [],
  )

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues,
  })

  const { handleSubmit, watch, setValue, reset, formState } = form
  const watched = watch()

  useEffect(() => {
    if (!branding) return
    const prefs = prefsFromBranding(branding.export_preferences ?? {})
    reset({
      sections: prefs.sections?.length ? prefs.sections : [...EXPORT_SECTION_KEYS],
      orientation: prefs.orientation ?? 'portrait',
      format: prefs.format ?? 'pdf',
      primaryColor: prefs.primaryColor ?? branding.primary_color ?? '#0B6AF7',
      secondaryColor: prefs.secondaryColor ?? branding.secondary_color ?? '#064FD6',
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
          format: values.format,
          primaryColor: values.primaryColor,
          secondaryColor: values.secondaryColor,
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
    const res = await startExport.mutateAsync({ reportId, values })
    const url = res.data.signedUrl ?? null
    setSignedDownloadUrl(url)
    setLastExportId(res.data.exportId)
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

  if (reportLoading || brandingLoading) {
    return (
      <PageTemplate title="Preparing export" description="Loading report and branding.">
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
      description="Choose sections, branding, and format. Exports are generated server-side and stored securely."
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
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSection(key)}
                        aria-label={SECTION_LABELS[key]}
                      />
                      <span className="text-sm font-medium leading-none">{SECTION_LABELS[key]}</span>
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
                <Label htmlFor="format">Format</Label>
                <select
                  id="format"
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm',
                    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  value={watched.format}
                  onChange={(e) =>
                    setValue('format', e.target.value === 'html' ? 'html' : 'pdf', { shouldValidate: true })
                  }
                  aria-label="Export file format"
                >
                  <option value="pdf">PDF</option>
                  <option value="html">HTML (fallback)</option>
                </select>
              </div>
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" aria-hidden />
                Logo (optional)
              </Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => void onLogoSelected(e.target.files)}
                aria-label="Upload company logo"
              />
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP, or SVG. Stored privately per company.</p>
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
                className="gap-2 transition-transform duration-200 hover:scale-[1.02]"
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

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Export progress</span>
              <span>{startExport.isPending ? 'Processing…' : signedDownloadUrl ? 'Complete' : 'Idle'}</span>
            </div>
            <Progress
              value={startExport.isPending ? 45 : signedDownloadUrl ? 100 : 0}
              className="h-2 motion-reduce:transition-none"
            />
          </div>

          {signedDownloadUrl ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 animate-fade-in motion-reduce:animate-none">
              <Button asChild variant="primary" className="gap-2">
                <a href={signedDownloadUrl} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" aria-hidden />
                  Download {watched.format === 'html' ? 'HTML' : 'PDF'}
                </a>
              </Button>
              <Button type="button" variant="secondary" onClick={() => void onRefreshDownload()} disabled={refreshUrl.isPending}>
                Refresh link
              </Button>
            </div>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden p-0 transition-shadow duration-200 hover:shadow-md">
            <div
              className="border-b px-6 py-4"
              style={{
                background: `linear-gradient(135deg, ${watched.primaryColor}22, ${watched.secondaryColor}18)`,
              }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Palette className="h-4 w-4" style={{ color: watched.primaryColor }} aria-hidden />
                Live preview
              </div>
              <p className="text-xs text-muted-foreground">Approximates cover styling for the exported document.</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-4">
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Company logo preview"
                    className="h-14 max-w-[160px] object-contain"
                  />
                ) : (
                  <div className="flex h-14 w-28 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    No logo
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold" style={{ color: watched.primaryColor }}>
                    {company?.name ?? 'Your company'}
                  </p>
                  <p className="text-sm text-muted-foreground">Company health report</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
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
                  return (
                    <li
                      key={job.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{new Date(job.created_at).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt.toUpperCase()} · {job.progress}%
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
