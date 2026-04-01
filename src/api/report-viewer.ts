/**
 * Report Viewer — server-validated reads/writes via `pulse-report-viewer-api` Edge Function.
 */
import { invokePulseReportViewerApi, type PulseReportViewerBody } from '@/lib/supabase-functions'
import type { CompanyHealthScoreRow } from '@/types/health-score'

export async function getReportViewerHealth(reportId: string): Promise<{
  row: CompanyHealthScoreRow | null
  embedded: Record<string, unknown>
}> {
  return invokePulseReportViewerApi({
    op: 'get_health',
    reportId,
  })
}

export async function setReportViewerCacheEntry(
  reportId: string,
  cacheKey: string,
  value: Record<string, unknown>,
  ttlSeconds?: number,
): Promise<{ ok: boolean }> {
  return invokePulseReportViewerApi({
    op: 'cache_set',
    reportId,
    cacheKey,
    value,
    ttlSeconds,
  })
}

export async function restoreReportSnapshot(input: { reportId: string; snapshotId: string }) {
  return invokePulseReportViewerApi<{ ok: boolean; reportId: string }>({
    op: 'restore_snapshot',
    reportId: input.reportId,
    snapshotId: input.snapshotId,
  })
}

export function invokeReportViewerOp<T = unknown>(body: PulseReportViewerBody): Promise<T> {
  return invokePulseReportViewerApi<T>(body)
}
