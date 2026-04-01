import { createInAppNotificationRow } from '@/api/notifications'

/**
 * Client-side equivalent of POST /api/notifications/trigger — creates an in-app notification + inbox row.
 * Server-side automations should use Edge Functions with service role where appropriate.
 */
export async function triggerWorkflowNotification(input: {
  type: string
  message: string
  data?: Record<string, unknown>
}): Promise<void> {
  await createInAppNotificationRow({
    type: input.type,
    message: input.message,
    data: input.data ?? {},
  })
}
