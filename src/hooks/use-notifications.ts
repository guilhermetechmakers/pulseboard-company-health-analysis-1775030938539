import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  archiveInboxItem,
  createInAppNotificationRow,
  fetchInboxNotifications,
  fetchNotificationPreferences,
  fetchRecentEmailDispatches,
  markAllInboxRead,
  markInboxItemRead,
  softDeleteInboxItem,
  upsertNotificationPreferences,
} from '@/api/notifications'
import type { UserNotificationChannels } from '@/types/notifications'

export const notificationsQueryKey = ['pulse-notifications'] as const
export const notificationPrefsQueryKey = ['notification-preferences'] as const
export const emailDispatchesQueryKey = ['email-dispatches'] as const

export function useInboxNotifications(options?: {
  includeArchived?: boolean
  search?: string
  limit?: number
  refetchIntervalMs?: number
}) {
  const limit = options?.limit ?? 50
  return useQuery({
    queryKey: [...notificationsQueryKey, options?.includeArchived, options?.search ?? '', limit],
    enabled: Boolean(supabase),
    queryFn: () =>
      fetchInboxNotifications({ limit, includeArchived: options?.includeArchived, search: options?.search }),
    refetchInterval: options?.refetchIntervalMs ?? 60_000,
  })
}

/** Back-compat shape for dashboard + bell (`data.items`). */
export function useNotificationInbox(options?: { limit?: number; refetchIntervalMs?: number }) {
  const limit = options?.limit ?? 50
  const q = useInboxNotifications({
    limit,
    refetchIntervalMs: options?.refetchIntervalMs,
    includeArchived: false,
  })
  return {
    ...q,
    data: q.data ? { items: q.data.data, count: q.data.count } : undefined,
  }
}

export function useUnreadNotificationCount() {
  const q = useNotificationInbox({ limit: 120, refetchIntervalMs: 60_000 })
  const items = q.data?.items ?? []
  const unread = items.filter((i) => i.readAt == null).length
  return { unread, refetch: q.refetch }
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inboxId: string) => markInboxItemRead(inboxId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: notificationsQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => markAllInboxRead(),
    onSuccess: async () => {
      toast.success('All notifications marked read')
      await qc.invalidateQueries({ queryKey: notificationsQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useArchiveNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inboxId: string) => archiveInboxItem(inboxId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: notificationsQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inboxId: string) => softDeleteInboxItem(inboxId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: notificationsQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationPrefsQueryKey,
    enabled: Boolean(supabase),
    queryFn: fetchNotificationPreferences,
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (channels: UserNotificationChannels) => upsertNotificationPreferences(channels),
    onSuccess: async () => {
      toast.success('Notification preferences saved')
      await qc.invalidateQueries({ queryKey: notificationPrefsQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRecentEmailDispatches(limit = 15) {
  return useQuery({
    queryKey: [...emailDispatchesQueryKey, limit],
    enabled: Boolean(supabase),
    queryFn: () => fetchRecentEmailDispatches(limit),
  })
}

export function useTestInAppNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      createInAppNotificationRow({
        type: 'admin_alert',
        message: 'Test in-app notification — delivery channels are working.',
        data: { source: 'settings_test' },
      }),
    onSuccess: async () => {
      toast.success('Test notification created')
      await qc.invalidateQueries({ queryKey: notificationsQueryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
