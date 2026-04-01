import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_MS } from '@/constants/cache-policy'
import { supabase } from '@/lib/supabase'
import type { CompanyRow } from '@/types/integrations'

export function useMyCompany() {
  return useQuery({
    queryKey: ['company', 'mine'],
    enabled: Boolean(supabase),
    staleTime: QUERY_STALE_MS.companyMine,
    queryFn: async (): Promise<CompanyRow | null> => {
      if (!supabase) return null
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle()
      if (error) throw error
      return data
    },
  })
}
