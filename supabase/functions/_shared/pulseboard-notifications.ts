/**
 * Creates an in-app notification plus inbox row for a PulseBoard user.
 * Intended for Edge Functions running with the end-user JWT (RLS: insert own rows).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type NotificationInsertParams = {
  userId: string
  type: string
  message: string
  data?: Record<string, unknown>
}

export async function createInAppNotification(
  supabase: SupabaseClient,
  params: NotificationInsertParams,
): Promise<{ notificationId: string; inboxItemId: string } | null> {
  const data = params.data ?? {}
  const { data: note, error: nErr } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      message: params.message,
      data,
    })
    .select('id')
    .maybeSingle()

  if (nErr || !note || typeof note.id !== 'string') {
    return null
  }

  const notificationId = note.id

  const { data: inbox, error: iErr } = await supabase
    .from('notification_inbox_items')
    .insert({
      user_id: params.userId,
      notification_id: notificationId,
    })
    .select('id')
    .maybeSingle()

  if (iErr || !inbox || typeof inbox.id !== 'string') {
    return { notificationId, inboxItemId: '' }
  }

  return { notificationId, inboxItemId: inbox.id }
}
