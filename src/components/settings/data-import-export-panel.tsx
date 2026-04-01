import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileSpreadsheet, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useCsvParsePreviewMutation } from '@/hooks/use-settings-module'
import { pulseDataIoExportCsv } from '@/lib/supabase-functions'
import { supabase } from '@/lib/supabase'

export interface DataImportExportPanelProps {
  companyId: string
}

function headerToKey(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, '_')
}

export function DataImportExportPanel({ companyId }: DataImportExportPanelProps) {
  const formId = useId()
  const preview = useCsvParsePreviewMutation()
  const [csvText, setCsvText] = useState('')
  const [targetModel, setTargetModel] = useState<'financials' | 'market' | 'social'>('financials')
  const [exportBusy, setExportBusy] = useState(false)
  const [exportPreset, setExportPreset] = useState<'full_backup' | 'selective' | 'compliance'>('full_backup')
  const [exportFields, setExportFields] = useState<string[]>(['profile', 'financials', 'market', 'social'])

  async function onPreview() {
    if (!supabase) {
      toast.error('Configure Supabase to preview CSV.')
      return
    }
    const t = csvText.trim()
    if (t.length < 3) {
      toast.error('Paste at least one header row and one data row.')
      return
    }
    try {
      const res = await preview.mutateAsync({ csvText: t, targetModel })
      const issues = Array.isArray(res?.issues) ? res.issues : []
      if (issues.length > 0) {
        toast.message('Preview ready', { description: issues.join(' · ') })
      } else {
        toast.success('Preview ready — no blocking issues detected.')
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function onExport() {
    if (!supabase) {
      toast.error('Configure Supabase to run exports.')
      return
    }
    setExportBusy(true)
    try {
      await pulseDataIoExportCsv({
        companyId,
        preset: exportPreset,
        format: 'csv',
        fields: exportPreset === 'selective' ? exportFields : [],
      })
      toast.success('Export queued — open Export console for status and download.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setExportBusy(false)
    }
  }

  const last = preview.data
  const headers = Array.isArray(last?.headers) ? last.headers : []
  const sampleRows = Array.isArray(last?.sampleRows) ? last.sampleRows : []
  const issues = Array.isArray(last?.issues) ? last.issues : []
  const mappingEntries = last?.suggestedMapping ? Object.entries(last.suggestedMapping) : []

  return (
    <Card className="overflow-hidden p-0 shadow-card transition-shadow duration-200 hover:shadow-md">
      <div className="border-b border-border bg-muted/30 p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Data import & export</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Run full jobs from dedicated consoles. Below, the internal CSV utility returns a mapping preview via the{' '}
              <code className="rounded bg-muted px-1">pulse-settings-api</code> Edge Function (no raw files leave your browser
              unauthenticated).
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="primary" className="min-h-[44px]">
            <Link to="/data/import">Import console</Link>
          </Button>
          <Button asChild variant="secondary" className="min-h-[44px]">
            <Link to="/data/export">Export console</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={`${formId}-model`}>Target model</Label>
            <select
              id={`${formId}-model`}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={targetModel}
              onChange={(e) => setTargetModel(e.target.value as typeof targetModel)}
            >
              <option value="financials">Financials</option>
              <option value="market">Market</option>
              <option value="social">Social</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-[44px] w-full md:w-auto"
              disabled={preview.isPending || !supabase}
              onClick={() => void onPreview()}
            >
              {preview.isPending ? 'Parsing…' : 'Run preview'}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor={`${formId}-csv`}>CSV / TSV sample</Label>
          <textarea
            id={`${formId}-csv`}
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
            placeholder={'revenue,expenses\n100000,80000'}
            aria-describedby={`${formId}-csv-help`}
          />
          <p id={`${formId}-csv-help`} className="mt-1 text-xs text-muted-foreground">
            Preview only — use the import console to commit rows to your company workspace.
          </p>
        </div>

        <div aria-live="polite" className="rounded-lg border border-border bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Table2 className="h-4 w-4 text-primary" aria-hidden />
            Preview result
          </div>
          {(issues ?? []).length > 0 ? (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
              {(issues ?? []).map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          ) : null}
          {(mappingEntries ?? []).length > 0 ? (
            <div className="mb-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Suggested mapping:</span>{' '}
              {(mappingEntries ?? []).slice(0, 8).map(([k, v]) => (
                <span key={k} className="mr-2 inline-block rounded bg-muted px-1">
                  {k}→{v}
                </span>
              ))}
              {(mappingEntries ?? []).length > 8 ? <span>…</span> : null}
            </div>
          ) : null}
          {(headers ?? []).length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {(headers ?? []).map((h) => (
                      <th key={h} className="px-2 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(sampleRows ?? []).slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-b border-border/80">
                      {(headers ?? []).map((h) => (
                        <td key={`${ri}-${h}`} className="px-2 py-1.5 text-muted-foreground">
                          {row[headerToKey(h)] ?? row[h] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run a preview to see headers and sample rows.</p>
          )}
        </div>

        <div className="rounded-xl border border-dashed border-border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Download className="h-4 w-4 text-primary" aria-hidden />
            Quick export (CSV)
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Queues a job through <code className="rounded bg-muted px-1">pulse-data-io</code>; download links appear in the
            export console.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-preset`}>Preset</Label>
              <select
                id={`${formId}-preset`}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={exportPreset}
                onChange={(e) => setExportPreset(e.target.value as typeof exportPreset)}
              >
                <option value="full_backup">Full backup</option>
                <option value="selective">Selective</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
            {exportPreset === 'selective' ? (
              <div className="space-y-2">
                <span className="text-sm font-medium">Domains</span>
                {(['profile', 'financials', 'market', 'social'] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={exportFields.includes(key)}
                      onChange={(e) => {
                        setExportFields((prev) => {
                          const p = Array.isArray(prev) ? prev : []
                          if (e.target.checked) return [...p, key]
                          return p.filter((x) => x !== key)
                        })
                      }}
                    />
                    {key}
                  </label>
                ))}
              </div>
            ) : (
              <div />
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 min-h-[44px]"
            disabled={exportBusy || !supabase}
            onClick={() => void onExport()}
          >
            {exportBusy ? 'Queueing…' : 'Queue export'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
