import type { AnalysisStatusResponseData, CreateAnalysisResponseData } from '@/types/analysis-job'

const STORAGE_PREFIX = 'pulseboard:mock-analysis:'

function key(id: string): string {
  return `${STORAGE_PREFIX}${id}`
}

export function createMockAnalysisJob(): CreateAnalysisResponseData {
  const analysisId = crypto.randomUUID()
  const startedAt = new Date().toISOString()
  const initial: AnalysisStatusResponseData = {
    analysisId,
    status: 'queued',
    progress: 0,
    logs: [`${startedAt}  [mock] Job queued`],
    startedAt,
    completedAt: null,
    reportId: null,
    error: null,
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(key(analysisId), JSON.stringify(initial))
  }
  return { analysisId, status: 'queued', startedAt, progress: 0 }
}

export function advanceMockAnalysisJob(analysisId: string): AnalysisStatusResponseData | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(key(analysisId))
  if (!raw) return null
  let cur: AnalysisStatusResponseData
  try {
    cur = JSON.parse(raw) as AnalysisStatusResponseData
  } catch {
    return null
  }

  const now = new Date().toISOString()
  const stepLogs: Record<number, { status: AnalysisStatusResponseData['status']; progress: number; line: string }> = {
    0: { status: 'running', progress: 20, line: '[mock] Validating workspace' },
    1: { status: 'running', progress: 45, line: '[mock] Aggregating context' },
    2: { status: 'running', progress: 72, line: '[mock] Simulating AI reasoning' },
    3: {
      status: 'completed',
      progress: 100,
      line: '[mock] Analysis finished (deterministic preview)',
    },
  }

  const idx =
    cur.progress >= 100
      ? 4
      : cur.progress < 20
        ? 0
        : cur.progress < 45
          ? 1
          : cur.progress < 72
            ? 2
            : 3

  if (idx >= 4 || cur.status === 'completed') {
    return cur
  }

  const next = stepLogs[idx]
  const logs = [...(Array.isArray(cur.logs) ? cur.logs : []), `${now}  ${next.line}`]
  const reportId = next.status === 'completed' ? `mock-report-${analysisId.slice(0, 8)}` : null

  const updated: AnalysisStatusResponseData = {
    ...cur,
    status: next.status,
    progress: next.progress,
    logs,
    completedAt: next.status === 'completed' ? now : null,
    reportId,
    error: null,
    results:
      next.status === 'completed'
        ? {
            executiveSummary:
              'Mock executive summary: revenue trajectory and competitive positioning look workable; prioritize cash runway and channel concentration in the next 90 days.',
            swot: null,
            financial: null,
            market: null,
            social: null,
            risks: ['Customer concentration', 'Hiring plan vs cash'],
            opportunities: ['Partner distribution', 'Pricing experiments'],
            actionPlan: null,
          }
        : undefined,
  }

  sessionStorage.setItem(key(analysisId), JSON.stringify(updated))
  return updated
}

export function readMockAnalysisJob(analysisId: string): AnalysisStatusResponseData | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(key(analysisId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as AnalysisStatusResponseData
  } catch {
    return null
  }
}
