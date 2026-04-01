import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createAnalysisJob, fetchAnalysisJobStatus } from '@/api/analyses'
import { dashboardOverviewQueryKey } from '@/hooks/use-dashboard-overview'
import { fireAndForgetInvalidateCompanyCache } from '@/lib/pulse-cache-api'
import type { AnalysisDepth } from '@/types/analysis'

export type StartJobInput = {
  companyId: string
  analysisDepth: AnalysisDepth
  benchmarking: boolean
  sendToEmail: boolean
  email: string
  consentGiven: boolean
}

export function useGenerateAnalysisJob(companyId: string | null) {
  const queryClient = useQueryClient()
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const completionRef = useRef<'idle' | 'done' | 'fail'>('idle')

  const startJob = useMutation({
    mutationFn: async (input: StartJobInput) =>
      createAnalysisJob({
        companyId: input.companyId,
        depth: input.analysisDepth,
        includeBenchmarks: input.benchmarking,
        sendToEmail: input.sendToEmail,
        email: input.sendToEmail ? input.email : undefined,
        consentGiven: input.consentGiven,
      }),
    onSuccess: (data) => {
      setActiveJobId(data.analysisId)
      completionRef.current = 'idle'
      toast.success('Analysis queued — tracking progress below.')
    },
    onError: (e: Error) => {
      toast.error(e.message ?? 'Could not start analysis')
    },
  })

  const statusQuery = useQuery({
    queryKey: ['analysis-job-status', activeJobId],
    enabled: Boolean(activeJobId),
    refetchInterval: (q) => {
      const s = q.state.data?.status
      if (s === 'completed' || s === 'failed') return false
      return 1800
    },
    queryFn: async () => {
      if (!activeJobId) {
        throw new Error('No analysis job')
      }
      return fetchAnalysisJobStatus(activeJobId)
    },
  })

  const cid = companyId ?? ''

  useEffect(() => {
    const st = statusQuery.data?.status
    if (!st || !cid) return
    if (st === 'completed' && completionRef.current === 'idle') {
      completionRef.current = 'done'
      toast.success('Analysis completed')
      fireAndForgetInvalidateCompanyCache(cid)
      void queryClient.invalidateQueries({ queryKey: ['pulse-notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['company-reports', cid] })
      void queryClient.invalidateQueries({ queryKey: ['company-aggregates', cid] })
      void queryClient.invalidateQueries({ queryKey: ['company', 'mine'] })
      void queryClient.invalidateQueries({ queryKey: ['company-health-scores', cid] })
      void queryClient.invalidateQueries({ queryKey: ['company-activity-feed'] })
      void queryClient.invalidateQueries({ queryKey: dashboardOverviewQueryKey(cid) })
    }
    if (st === 'failed' && completionRef.current === 'idle') {
      completionRef.current = 'fail'
      const msg = statusQuery.data?.error ?? 'Analysis failed'
      toast.error(typeof msg === 'string' ? msg : 'Analysis failed')
    }
  }, [statusQuery.data?.status, statusQuery.data?.error, cid, queryClient])

  const resetJob = () => {
    setActiveJobId(null)
    completionRef.current = 'idle'
    void queryClient.removeQueries({ queryKey: ['analysis-job-status'] })
  }

  const isJobActive =
    startJob.isPending ||
    Boolean(
      activeJobId &&
        statusQuery.data &&
        (statusQuery.data.status === 'queued' || statusQuery.data.status === 'running'),
    )

  return {
    startJob,
    statusQuery,
    activeJobId,
    resetJob,
    isJobActive,
  }
}
