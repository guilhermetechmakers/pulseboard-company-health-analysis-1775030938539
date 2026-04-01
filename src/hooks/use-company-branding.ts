import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { CompanyBrandingRow } from '@/types/export'
import type { Database } from '@/types/database'

type BrandingInsert = Database['public']['Tables']['company_branding']['Insert']
type BrandingUpdate = Database['public']['Tables']['company_branding']['Update']

export function useCompanyBranding(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['company-branding', companyId],
    enabled: Boolean(companyId) && Boolean(supabase),
    queryFn: async (): Promise<CompanyBrandingRow | null> => {
      if (!supabase || !companyId) return null
      const { data, error } = await supabase.from('company_branding').select('*').eq('company_id', companyId).maybeSingle()
      if (error) throw new Error(error.message)
      return data !== null ? (data as CompanyBrandingRow) : null
    },
  })
}

export function useUpsertCompanyBranding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { companyId: string; patch: BrandingUpdate }) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const row: BrandingInsert = {
        company_id: input.companyId,
        ...input.patch,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('company_branding').upsert(row, { onConflict: 'company_id' })
      if (error) throw new Error(error.message)
    },
    onSuccess: async (_d, vars) => {
      toast.success('Branding saved')
      await queryClient.invalidateQueries({ queryKey: ['company-branding', vars.companyId] })
    },
    onError: (e: Error) => toast.error(e.message ?? 'Could not save branding'),
  })
}
