import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileUp, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useEnsureIntegrationMutation } from '@/hooks/use-integrations'
import { useCompanyImportJobs } from '@/hooks/use-data-io-jobs'
import { extractCsvHeaders, previewCsvRows } from '@/lib/csv-parse-headers'
import { validateCsvFile, readFileAsText } from '@/lib/csv-file-validator'
import {
  FINANCIALS_TEMPLATE_CSV,
  MARKET_TEMPLATE_CSV,
  SOCIAL_TEMPLATE_CSV,
  downloadTextFile,
} from '@/lib/csv-templates'
import { pulseDataIoImportCsv, pulseDataIoImportRetry } from '@/lib/supabase-functions'
import { supabase } from '@/lib/supabase'
import type { DataIoTargetModel } from '@/types/data-io'
import { cn } from '@/lib/utils'

const FIN_OPTS = [
  { value: '', label: 'Auto (from header name)' },
  { value: 'revenue', label: 'revenue' },
  { value: 'expenses', label: 'expenses' },
  { value: 'profit', label: 'profit' },
  { value: 'cash', label: 'cash' },
  { value: 'debt', label: 'debt' },
]

const MARKET_OPTS = [
  { value: '', label: 'Auto (from header name)' },
  { value: 'competitor_name', label: 'competitor_name' },
  { value: 'name', label: 'name' },
  { value: 'notes', label: 'notes' },
  { value: 'threat_level', label: 'threat_level' },
]

const SOCIAL_OPTS = [
  { value: '', label: 'Auto (from header name)' },
  { value: 'channel', label: 'channel' },
  { value: 'followers', label: 'followers' },
  { value: 'engagement_rate', label: 'engagement_rate' },
]

export interface DataImportConsoleProps {
  companyId: string
  className?: string
}

export function DataImportConsole({ companyId, className }: DataImportConsoleProps) {
  const formId = useId()
  const qc = useQueryClient()
  const ensureIntegration = useEnsureIntegrationMutation(companyId)
  const { data: jobs = [], isLoading: jobsLoading } = useCompanyImportJobs(companyId)

  const [targetModel, setTargetModel] = useState<DataIoTargetModel>('financials')
  const [fileName, setFileName] = useState('import.csv')
  const [csvText, setCsvText] = useState('')
  const [mappingByHeader, setMappingByHeader] = useState<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastProgress, setLastProgress] = useState(0)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const headers = useMemo(() => extractCsvHeaders(csvText), [csvText])
  const previewGrid = useMemo(() => previewCsvRows(csvText, 4), [csvText])

  const mapOptions = targetModel === 'financials' ? FIN_OPTS : targetModel === 'market' ? MARKET_OPTS : SOCIAL_OPTS

  useEffect(() => {
    setMappingByHeader({})
  }, [csvText, targetModel])

  const buildMappingPayload = useCallback((): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const h of headers) {
      const v = mappingByHeader[h]
      if (v && v.length > 0) out[h] = v
    }
    return out
  }, [headers, mappingByHeader])

  const invalidateData = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['company-imports', companyId] })
    await qc.invalidateQueries({ queryKey: ['company-aggregates', companyId] })
    await qc.invalidateQueries({ queryKey: ['company-health-scores', companyId] })
    await qc.invalidateQueries({ queryKey: ['company', 'mine'] })
  }, [qc, companyId])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const v = validateCsvFile(file)
    if (!v.ok) {
      toast.error(v.error ?? 'Invalid file')
      return
    }
    try {
      const text = await readFileAsText(file)
      setCsvText(text)
      setFileName(file.name || 'import.csv')
      toast.success('File loaded — review mapping and run import.')
    } catch {
      toast.error('Could not read file')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    void onFile(f)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) {
      toast.error('Configure Supabase to run imports.')
      return
    }
    if (!csvText.trim()) {
      toast.error('Add CSV content or drop a file.')
      return
    }
    setBusy(true)
    setLastProgress(15)
    try {
      await ensureIntegration.mutateAsync('csv')
      const res = await pulseDataIoImportCsv({
        companyId,
        csvText,
        targetModel,
        fileName,
        mapping: buildMappingPayload(),
      })
      setLastProgress(100)
      toast.success(`Import complete · ${res.rowsProcessed ?? 0} rows processed`)
      setCsvText('')
      setMappingByHeader({})
      await invalidateData()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
      setLastProgress(0)
    }
  }

  async function onRetryJob(importJobId: string) {
    if (!supabase) {
      toast.error('Configure Supabase to retry imports.')
      return
    }
    setRetryingId(importJobId)
    try {
      const res = await pulseDataIoImportRetry(importJobId)
      toast.success(`Retry complete · ${res.rowsProcessed ?? 0} rows`)
      await invalidateData()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRetryingId(null)
    }
  }

  const downloadTemplate = () => {
    if (targetModel === 'financials') downloadTextFile('pulseboard-financials-template.csv', FINANCIALS_TEMPLATE_CSV)
    else if (targetModel === 'market') downloadTextFile('pulseboard-market-template.csv', MARKET_TEMPLATE_CSV)
    else downloadTextFile('pulseboard-social-template.csv', SOCIAL_TEMPLATE_CSV)
  }

  const safeJobs = Array.isArray(jobs) ? jobs : []

  return (
    <div className={cn('space-y-8', className)}>
      <Card className="border-border/80 p-6 shadow-card">
        <h2 className="text-lg font-semibold tracking-tight">Import CSV</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Map source columns to PulseBoard fields, preview the first rows, then run a validated import. Jobs are stored for
          audit and refresh health scores automatically.
        </p>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              document.getElementById(`${formId}-file`)?.click()
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={cn(
            'mt-6 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-200',
            isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:border-primary/50',
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-primary" aria-hidden />
          <p className="text-sm font-medium">Drag and drop a CSV here</p>
          <p className="mt-1 text-xs text-muted-foreground">or choose a file (max 2 MB)</p>
          <input
            id={`${formId}-file`}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            className="sr-only"
            onChange={(ev) => void onFile(ev.target.files?.[0])}
          />
          <Button type="button" variant="secondary" className="mt-4 min-h-[44px]" onClick={() => document.getElementById(`${formId}-file`)?.click()}>
            Browse files
          </Button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={(e) => void onSubmit(e)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-target`}>Target model</Label>
              <select
                id={`${formId}-target`}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value as DataIoTargetModel)}
              >
                <option value="financials">Financials</option>
                <option value="market">Market</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`${formId}-label`}>File label</Label>
              <Input id={`${formId}-label`} className="mt-2" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-[44px] gap-2" onClick={downloadTemplate}>
              <FileUp className="h-4 w-4" aria-hidden />
              Download template
            </Button>
          </div>

          <div>
            <Label htmlFor={`${formId}-csv`}>CSV / TSV content</Label>
            <textarea
              id={`${formId}-csv`}
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
              placeholder="revenue,expenses&#10;100000,80000"
            />
          </div>

          {headers.length > 0 ? (
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <h3 className="text-sm font-semibold">Column mapping</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Financial imports require revenue and expenses (via mapping or column names).
              </p>
              <ul className="mt-4 space-y-3">
                {(headers ?? []).map((h) => (
                  <li key={h} className="grid gap-2 sm:grid-cols-[1fr,200px] sm:items-center">
                    <span className="truncate text-sm font-medium">{h}</span>
                    <select
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      value={mappingByHeader[h] ?? ''}
                      onChange={(e) =>
                        setMappingByHeader((prev) => ({
                          ...prev,
                          [h]: e.target.value,
                        }))
                      }
                      aria-label={`Map column ${h}`}
                    >
                      {mapOptions.map((o) => (
                        <option key={o.value || 'auto'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {previewGrid.length > 1 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                Preview (first rows)
              </p>
              <table className="w-full min-w-[320px] text-left text-sm">
                <tbody>
                  {previewGrid.map((row, ri) => (
                    <tr key={ri} className="border-b border-border/60 last:border-0">
                      {(row ?? []).map((cell, ci) => (
                        <td key={ci} className="max-w-[200px] truncate px-3 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {busy && lastProgress > 0 ? <Progress value={lastProgress} className="h-2" /> : null}

          <Button type="submit" className="min-h-[44px] transition-transform duration-200 hover:scale-[1.02] motion-reduce:transform-none" disabled={busy || !supabase}>
            {busy ? 'Importing…' : 'Start import'}
          </Button>
        </form>
      </Card>

      <Card className="border-border/80 p-6 shadow-card">
        <h3 className="text-lg font-semibold">Import queue</h3>
        <p className="mt-1 text-sm text-muted-foreground">Recent jobs for this company (null-safe reads from Supabase).</p>
        {jobsLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : safeJobs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No jobs yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm" aria-label="Import job list">
            {safeJobs.map((j) => {
              const errList = Array.isArray(j.errors) ? j.errors : []
              const canRetry = j.status === 'failed' && typeof j.source_text === 'string' && j.source_text.length > 0
              return (
                <li key={j.id} className="rounded-lg border border-border/60 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-medium">{j.file_name}</span>
                      <p className="text-xs text-muted-foreground">
                        {j.status} · {j.rows_processed} rows
                        {j.target_model ? ` · ${j.target_model}` : ''}
                      </p>
                      {j.error_message ? (
                        <p className="mt-1 text-xs text-destructive">{j.error_message}</p>
                      ) : null}
                      {errList.length > 0 ? (
                        <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                          {errList.slice(0, 3).map((e, i) => (
                            <li key={i}>{typeof e === 'string' ? e : JSON.stringify(e)}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    {canRetry ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-[44px] shrink-0 px-3 py-2 text-xs"
                        disabled={retryingId === j.id}
                        onClick={() => void onRetryJob(j.id)}
                      >
                        {retryingId === j.id ? 'Retrying…' : 'Retry'}
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
