import type { AnalysisDepth } from '@/types/analysis'

export type AnalysisJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface CreateAnalysisRequestBody {
  companyId: string
  depth: AnalysisDepth
  includeBenchmarks: boolean
  sendToEmail: boolean
  email?: string | null
  consentGiven: boolean
}

export interface CreateAnalysisResponseData {
  analysisId: string
  status: AnalysisJobStatus
  startedAt: string
  progress: number
}

export interface AnalysisStatusResults {
  executiveSummary: string
  swot: unknown
  financial: unknown
  market: unknown
  social: unknown
  risks: string[]
  opportunities: string[]
  actionPlan: unknown
}

export interface AnalysisStatusResponseData {
  analysisId: string
  status: AnalysisJobStatus
  progress: number
  logs: string[]
  startedAt: string
  completedAt: string | null
  reportId: string | null
  results?: AnalysisStatusResults
  error: string | null
}

export interface NotificationTriggerBody {
  type: 'analysis_complete' | 'export_ready' | 'job_failed' | 'billing_alert' | 'admin_alert' | 'custom'
  message: string
  data?: Record<string, unknown>
}
