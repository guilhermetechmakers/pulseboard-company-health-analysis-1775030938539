import { useCallback, useState } from 'react'
import { useDataExchangeStore } from '@/stores/data-exchange-store'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useCompanyExportJobs } from '@/hooks/use-data-io-jobs'
import { pulseDataIoExportCsv, pulseDataIoExportDownload } from '@/lib/supabase-functions'
import { supabase } from '@/lib/supabase'
import { DATA_EXPORT_SELECTIVE_GROUPS } from '@/types/data-io'
import type { DataExportPreset } from '@/types/data-io'
import { cn } from '@/lib/utils'

export interface DataExportConsoleProps {
  companyId: string
  className?: string
}

function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function DataExportConsole({ companyId, className }: DataExportConsoleProps) {
  const qc = useQueryClient()
  const { data: jobs = [], isLoading } = useCompanyExportJobs(companyId)
  const exportPreset = useDataExchangeStore((s) => s.exportPreset)
  const exportSelectedFields = useDataExchangeStore((s) => s.exportSelectedFields)
  const exportScheduleNote = useDataExchangeStore((s) => s.exportScheduleNote)
  const setExportPreset = useDataExchangeStore((s) => s.setExportPreset)
  const setExportSelectedFields = useDataExchangeStore((s) => s.setExportSelectedFields)
  const setExportScheduleNote = useDataExchangeStore((s) => s.setExportScheduleNote)

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)

  const invalidate = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['company-exports', companyId] })
  }, [qc, companyId])

  const toggleField = useCallback(
    (value: string, checked: boolean) => {
      const cur = exportSelectedFields ?? []
      if (checked) setExportSelectedFields([...cur, value])
      else setExportSelectedFields(cur.filter((field) => field !== value))
    },
    [exportSelectedFields, setExportSelectedFields],
  )

  const onRunExport = async () => {
    if (!supabase) {
      toast.error('Configure Supabase to run exports.')
      return
    }
    if (exportPreset === 'selective' && (exportSelectedFields ?? []).length === 0) {
      toast.error('Choose at least one data group for a selective export.')
      return
    }
    setBusy(true)
    setProgress(20)
    try {
      const res = await pulseDataIoExportCsv({
        companyId,
        preset: exportPreset,
        format: 'csv',
        fields: exportPreset === 'selective' ? exportSelectedFields : [],
        scheduleCadence: exportScheduleNote.trim() || null,
      })
      setProgress(70)
      const exportJobId = res.exportJobId
      if (!exportJobId) {
        toast.error('Export did not return a job id.')
        return
      }
      const dl = await pulseDataIoExportDownload(exportJobId)
      downloadCsv(dl.fileName, dl.content)
      setProgress(100)
      toast.success('CSV downloaded')
      await invalidate()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  const safeJobs = Array.isArray(jobs) ? jobs : []

  return (
    <div className={cn('space-y-8', className)}>
      <Card className="border-border/80 p-6 shadow-card transition-shadow duration-200 hover:shadow-md">
        <h2 className="text-lg font-semibold tracking-tight">Export CSV</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate compliance-ready or full-backup CSV snapshots. Downloads are recorded for audit; recurring schedules
          are noted for your ops workflow.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="export-preset">Preset</Label>
            <select
              id="export-preset"
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={exportPreset}
              onChange={(e) => setExportPreset(e.target.value as DataExportPreset)}
            >
              <option value="full_backup">Full backup (profile, financials, market, social)</option>
              <option value="compliance">Compliance (non-empty fields + timestamp)</option>
              <option value="selective">Selective groups</option>
            </select>
          </div>

          {exportPreset === 'selective' ? (
            <fieldset className="rounded-xl border border-border/80 p-4">
              <legend className="px-1 text-sm font-medium">Include groups</legend>
              <ul className="mt-3 space-y-3">
                {(DATA_EXPORT_SELECTIVE_GROUPS ?? []).map((g) => (
                  <li key={g.value} className="flex items-center gap-3">
                    <Checkbox
                      id={`ex-${g.value}`}
                      checked={(exportSelectedFields ?? []).includes(g.value)}
                      onCheckedChange={(checked) => toggleField(g.value, checked)}
                    />
                    <Label htmlFor={`ex-${g.value}`} className="cursor-pointer font-normal">
                      {g.label}
                    </Label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}

          <div>
            <Label htmlFor="export-schedule">Schedule note (optional)</Label>
            <Input
              id="export-schedule"
              className="mt-2"
              placeholder="e.g. manual · Q1 close, or recurring: monthly"
              value={exportScheduleNote}
              onChange={(e) => setExportScheduleNote(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Stored on the export job as <code className="rounded bg-muted px-1">schedule_cadence</code> for future
              automation; does not schedule by itself.
            </p>
          </div>

          {busy && progress > 0 ? <Progress value={progress} className="h-2" /> : null}

          <Button
            type="button"
            className="min-h-[44px] gap-2 transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none"
            disabled={busy || !supabase}
            onClick={() => void onRunExport()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            {busy ? 'Exporting…' : 'Generate & download CSV'}
          </Button>
        </div>
      </Card>

      <Card className="border-border/80 p-6 shadow-card">
        <h3 className="text-lg font-semibold">Export history</h3>
        <p className="mt-1 text-sm text-muted-foreground">Recent jobs for this company (guarded arrays).</p>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : safeJobs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No exports yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm" aria-label="Export job list">
            {safeJobs.map((j) => {
              const scope = j.scope && typeof j.scope === 'object' ? (j.scope as Record<string, unknown>) : {}
              const preset = typeof scope.preset === 'string' ? scope.preset : '—'
              return (
                <li key={j.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                  <span className="font-medium">{preset}</span>
                  <span className="text-muted-foreground">
                    {j.status}
                    {j.result_size != null ? ` · ${j.result_size} bytes` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
