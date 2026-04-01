import type {
  AnalysisJobApiStatus,
  AnalysisJobResultsPreview,
  AnalysisJobStatusPayload,
} from '@/types/analysis'

const STATUSES: AnalysisJobApiStatus[] = ['queued', 'running', 'completed', 'failed']

function isStatus(v: unknown): v is AnalysisJobApiStatus {
  return typeof v === 'string' && (STATUSES as string[]).includes(v)
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function parseResults(raw: unknown): AnalysisJobResultsPreview | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const r = raw as Record<string, unknown>
  return {
    executiveSummary: typeof r.executiveSummary === 'string' ? r.executiveSummary : '',
    swot: r.swot ?? null,
    financial: typeof r.financial === 'string' ? r.financial : null,
    market: typeof r.market === 'string' ? r.market : null,
    social: typeof r.social === 'string' ? r.social : null,
    risks: asStringArray(r.risks),
    opportunities: asStringArray(r.opportunities),
    actionPlan: r.actionPlan ?? null,
  }
}

/** Normalizes `pulse-analyses-api` GET `data` into a strict client payload. */
export function parseAnalysisJobStatusPayload(raw: unknown): AnalysisJobStatusPayload {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      analysisId: '',
      status: 'failed',
      progress: 0,
      logs: [],
      error: 'invalid_payload',
    }
  }
  const row = raw as Record<string, unknown>
  const analysisId = typeof row.analysisId === 'string' ? row.analysisId : ''
  const status = isStatus(row.status) ? row.status : 'queued'
  const progress = typeof row.progress === 'number' && Number.isFinite(row.progress) ? row.progress : 0
  const logs = asStringArray(row.logs)
  const startedAt = typeof row.startedAt === 'string' ? row.startedAt : undefined
  const completedAt = typeof row.completedAt === 'string' ? row.completedAt : undefined
  const reportId =
    row.reportId === null || row.reportId === undefined
      ? null
      : typeof row.reportId === 'string'
        ? row.reportId
        : null
  const error = typeof row.error === 'string' ? row.error : row.error === null ? null : undefined
  const results = parseResults(row.results)

  return {
    analysisId,
    status,
    progress,
    logs,
    startedAt,
    completedAt,
    reportId,
    error: error === undefined ? null : error,
    results,
  }
}
