import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchSettingsTeamBundle,
  parseCsvPreview,
  removeTeamMember,
  revokeTeamInvite,
  sendTeamInvite,
} from '@/api/settings'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
export const settingsTeamQueryKey = (companyId: string) => ['settings', 'team', companyId] as const

export function useSettingsTeamBundle(companyId: string | undefined) {
  return useQuery({
    queryKey: companyId ? settingsTeamQueryKey(companyId) : ['settings', 'team', 'none'],
    enabled: Boolean(supabase && companyId),
    queryFn: () => fetchSettingsTeamBundle(companyId as string),
  })
}

export function useTeamInviteMutation(companyId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: 'admin' | 'member' | 'viewer' }) => {
      if (!companyId) throw new Error('No company')
      return sendTeamInvite({ companyId, email: input.email, role: input.role })
    },
    onSuccess: async () => {
      toast.success('Invitation sent')
      if (companyId) await qc.invalidateQueries({ queryKey: settingsTeamQueryKey(companyId) })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTeamRevokeInviteMutation(companyId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => {
      if (!companyId) throw new Error('No company')
      return revokeTeamInvite(inviteId, companyId)
    },
    onSuccess: async () => {
      toast.success('Invite revoked')
      if (companyId) await qc.invalidateQueries({ queryKey: settingsTeamQueryKey(companyId) })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTeamRemoveMemberMutation(companyId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => {
      if (!companyId) throw new Error('No company')
      return removeTeamMember(memberId, companyId)
    },
    onSuccess: async () => {
      toast.success('Member removed')
      if (companyId) await qc.invalidateQueries({ queryKey: settingsTeamQueryKey(companyId) })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCsvParsePreviewMutation() {
  return useMutation({
    mutationFn: (input: { csvText: string; targetModel: 'financials' | 'market' | 'social' }) =>
      parseCsvPreview(input),
  })
}

type ProfileUpdate = Pick<
  Database['public']['Tables']['profiles']['Update'],
  | 'display_name'
  | 'avatar_url'
  | 'job_title'
  | 'role'
  | 'timezone'
  | 'language'
  | 'preferred_communication_channel'
>

export function useProfileSettingsMutation(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      if (!supabase || !userId) throw new Error('Not signed in')
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
      if (error) throw error
    },
    onSuccess: async () => {
      toast.success('Profile saved')
      await qc.invalidateQueries({ queryKey: ['auth', 'profile', userId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useBillingReceipts(userId: string | undefined) {
  return useQuery({
    queryKey: ['settings', 'billing-receipts', userId],
    enabled: Boolean(supabase && userId),
    queryFn: async () => {
      if (!supabase || !userId) return []
      const { data, error } = await supabase
        .from('billing_receipts')
        .select('id,label,amount_cents,currency,issued_at,external_url')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false })
        .limit(24)
      if (error) throw error
      const rows = data ?? []
      return Array.isArray(rows) ? rows : []
    },
  })
}
