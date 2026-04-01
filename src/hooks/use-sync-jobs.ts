import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SyncJobRow } from '@/types/integrations'

export function useSyncJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ['sync-jobs', companyId],
    enabled: Boolean(supabase && companyId),
    queryFn: async (): Promise<SyncJobRow[]> => {
      if (!supabase || !companyId) return []
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data ?? []
    },
  })
}
