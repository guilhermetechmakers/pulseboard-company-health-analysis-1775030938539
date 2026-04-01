import { invokePulseNotificationsTrigger } from '@/lib/supabase-functions'

/** Optional client-side notification trigger (server already emits analysis_complete / job_failed). */
export async function triggerCustomInAppNotification(input: {
  type: string
  message: string
  data?: Record<string, unknown>
}): Promise<void> {
  try {
    await invokePulseNotificationsTrigger({
      type: 'custom',
      message: input.message,
      data: { ...input.data, customType: input.type },
    })
  } catch {
    /* non-blocking */
  }
}
