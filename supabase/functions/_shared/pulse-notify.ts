/**
 * Back-compat wrapper — creates notification + inbox row using canonical helper.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createInAppNotification } from './pulseboard-notifications.ts'

export type PulseNotificationType =
  | 'analysis_complete'
  | 'export_ready'
  | 'job_failed'
  | 'billing_alert'
  | 'admin_alert'
  | 'report_saved'
  | 'snapshot_created'

export async function createUserNotification(
  client: SupabaseClient,
  params: {
    userId: string
    type: PulseNotificationType | string
    message: string
    data?: Record<string, unknown>
  },
): Promise<{ notificationId: string } | null> {
  const result = await createInAppNotification(client, {
    userId: params.userId,
    type: params.type,
    message: params.message,
    data: params.data,
  })
  return result ? { notificationId: result.notificationId } : null
}
