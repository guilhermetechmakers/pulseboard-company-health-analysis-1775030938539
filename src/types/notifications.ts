import type { Database } from '@/types/database'

export type PulseNotificationType =
  | 'analysis_complete'
  | 'export_ready'
  | 'job_failed'
  | 'billing_alert'
  | 'admin_alert'
  | 'report_saved'
  | 'snapshot_created'

export type NotificationRow = Database['public']['Tables']['notifications']['Row']

/** Normalized inbox row for UI (camelCase dates). */
export interface InboxNotificationRow {
  inboxId: string
  readAt: string | null
  archived: boolean
  notification: {
    id: string
    type: string
    message: string
    data: Record<string, unknown>
    createdAt: string
  }
}

export type NotificationChannelEventKey =
  | 'analysis_complete'
  | 'export_ready'
  | 'job_failed'
  | 'billing_alert'
  | 'admin_alert'
  | 'snapshot_created'
  | 'report_saved'

/** Alias for settings toggles (same keys as stored JSON). */
export type NotificationChannelEvent = NotificationChannelEventKey

export interface NotificationChannelPrefs {
  email?: boolean
  inApp?: boolean
}

export interface ChannelToggle {
  inApp: boolean
  email: boolean
}

export type UserNotificationChannels = Partial<Record<NotificationChannelEventKey, NotificationChannelPrefs>>

export type NotificationPreferencesMap = Partial<Record<NotificationChannelEvent, ChannelToggle>>

export type EmailTemplateRow = Database['public']['Tables']['email_templates']['Row']
export type EmailDispatchRow = Database['public']['Tables']['email_dispatches']['Row']
export type EmailEventRow = Database['public']['Tables']['email_events']['Row']
export type NotificationPreferencesRow = Database['public']['Tables']['notification_preferences']['Row']

export interface NotificationsListResponse {
  data: InboxNotificationRow[]
  count: number
}
