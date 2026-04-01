import { supabase } from '@/lib/supabase'

export async function logUserActivity(userId: string, action: string, metadata: Record<string, unknown> = {}) {
  if (!supabase) return
  const safeMeta = metadata && typeof metadata === 'object' ? metadata : {}
  await supabase.from('user_activity_logs').insert({
    user_id: userId,
    action,
    metadata: safeMeta,
  })
}
