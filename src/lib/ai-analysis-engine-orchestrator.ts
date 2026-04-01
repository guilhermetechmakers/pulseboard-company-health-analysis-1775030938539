/**
 * Client-side documentation of the AI analysis engine state machine (server runs in Edge Functions
 * via `company-health-analysis-runner` + `pulse-analyses-api`).
 */
import type { AnalysisJobStatus } from '@/types/analysis-job'

export type AnalysisEnginePhase = 'idle' | 'validating' | 'running' | 'completed' | 'failed'

export const ANALYSIS_ENGINE_STEPS = [
  { id: 'validate', label: 'Validate inputs' },
  { id: 'aggregate', label: 'Aggregate company data' },
  { id: 'llm', label: 'AI reasoning' },
  { id: 'persist', label: 'Save report' },
] as const

export function mapProgressToStepIndex(progress: number): number {
  const p = typeof progress === 'number' && Number.isFinite(progress) ? progress : 0
  if (p < 20) return 0
  if (p < 45) return 1
  if (p < 85) return 2
  return 3
}

/** Maps queued job status + progress to a coarse UI phase (Generate Analysis runway). */
export function mapJobStatusToEnginePhase(status: AnalysisJobStatus, progress: number): AnalysisEnginePhase {
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'failed'
  if (status === 'queued') return 'validating'
  if (status === 'running') {
    return progress > 0 && progress < 18 ? 'validating' : 'running'
  }
  return 'idle'
}
