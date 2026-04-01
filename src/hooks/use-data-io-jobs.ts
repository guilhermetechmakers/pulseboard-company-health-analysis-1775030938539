import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ImportRow = Database['public']['Tables']['company_imports']['Row']
type ExportRow = Database['public']['Tables']['company_exports']['Row']

export function useCompanyImportJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-imports', companyId],
    enabled: Boolean(companyId && supabase),
    queryFn: async (): Promise<ImportRow[]> => {
      if (!supabase || !companyId) return []
      const { data, error } = await supabase
        .from('company_imports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(25)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCompanyExportJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-exports', companyId],
    enabled: Boolean(companyId && supabase),
    queryFn: async (): Promise<ExportRow[]> => {
      if (!supabase || !companyId) return []
      const { data, error } = await supabase
        .from('company_exports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(25)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useImportAudit(importId: string | null) {
  return useQuery({
    queryKey: ['import-audit', importId],
    enabled: Boolean(importId && supabase),
    queryFn: async () => {
      if (!supabase || !importId) return []
      const { data, error } = await supabase
        .from('import_audit')
        .select('*')
        .eq('import_id', importId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
  })
}
