import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']
type ActivityRow = Database['public']['Tables']['user_activity_logs']['Row']

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['auth', 'profile', userId],
    enabled: Boolean(supabase && userId),
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!supabase || !userId) return null
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUserSubscription(userId: string | undefined) {
  return useQuery({
    queryKey: ['auth', 'subscription', userId],
    enabled: Boolean(supabase && userId),
    queryFn: async (): Promise<SubscriptionRow | null> => {
      if (!supabase || !userId) return null
      const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUserActivityLog(userId: string | undefined) {
  return useQuery({
    queryKey: ['auth', 'activity', userId],
    enabled: Boolean(supabase && userId),
    queryFn: async (): Promise<ActivityRow[]> => {
      if (!supabase || !userId) return []
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      const rows = data ?? []
      return Array.isArray(rows) ? rows : []
    },
  })
}
