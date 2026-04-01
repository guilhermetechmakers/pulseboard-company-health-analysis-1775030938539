import type {
  AnalysisStatusResponseData,
  AnalysisStatusResults,
  CreateAnalysisResponseData,
  AnalysisJobStatus,
} from '@/types/analysis-job'

const JOB_STATUSES: AnalysisJobStatus[] = ['queued', 'running', 'completed', 'failed']

function isJobStatus(v: unknown): v is AnalysisJobStatus {
  return typeof v === 'string' && (JOB_STATUSES as string[]).includes(v)
}

export function parseCreateAnalysisResponse(raw: unknown): CreateAnalysisResponseData | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as { data?: unknown }
  const d = o.data
  if (d === null || typeof d !== 'object' || Array.isArray(d)) return null
  const row = d as Record<string, unknown>
  const analysisId = typeof row.analysisId === 'string' ? row.analysisId : null
  const startedAt = typeof row.startedAt === 'string' ? row.startedAt : null
  const progress = typeof row.progress === 'number' && Number.isFinite(row.progress) ? row.progress : 0
  const status = isJobStatus(row.status) ? row.status : null
  if (!analysisId || !startedAt || !status) return null
  return { analysisId, status, startedAt, progress }
}

function parseResults(raw: unknown): AnalysisStatusResults | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const r = raw as Record<string, unknown>
  const risks = Array.isArray(r.risks) ? r.risks.filter((x): x is string => typeof x === 'string') : []
  const opportunities = Array.isArray(r.opportunities)
    ? r.opportunities.filter((x): x is string => typeof x === 'string')
    : []
  return {
    executiveSummary: typeof r.executiveSummary === 'string' ? r.executiveSummary : '',
    swot: r.swot ?? null,
    financial: r.financial ?? null,
    market: r.market ?? null,
    social: r.social ?? null,
    risks,
    opportunities,
    actionPlan: r.actionPlan ?? null,
  }
}

export function parseAnalysisStatusResponse(raw: unknown): AnalysisStatusResponseData | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as { data?: unknown }
  const d = o.data
  if (d === null || typeof d !== 'object' || Array.isArray(d)) return null
  const row = d as Record<string, unknown>
  const analysisId = typeof row.analysisId === 'string' ? row.analysisId : null
  if (!analysisId) return null
  const status = isJobStatus(row.status) ? row.status : 'queued'
  const progress = typeof row.progress === 'number' && Number.isFinite(row.progress) ? row.progress : 0
  const logs = Array.isArray(row.logs) ? row.logs.filter((x): x is string => typeof x === 'string') : []
  const startedAt = typeof row.startedAt === 'string' ? row.startedAt : new Date().toISOString()
  const completedAt = typeof row.completedAt === 'string' ? row.completedAt : null
  const reportId = typeof row.reportId === 'string' ? row.reportId : null
  const error = typeof row.error === 'string' ? row.error : null
  const results = parseResults(row.results)

  return {
    analysisId,
    status,
    progress,
    logs,
    startedAt,
    completedAt,
    reportId,
    results,
    error,
  }
}
