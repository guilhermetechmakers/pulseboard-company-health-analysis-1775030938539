import { supabase } from '@/lib/supabase'
import { parseInboxNotificationRows } from '@/lib/notifications-guards'
import type {
  EmailDispatchRow,
  EmailTemplateRow,
  InboxNotificationRow,
  NotificationPreferencesRow,
  UserNotificationChannels,
} from '@/types/notifications'

const INBOX_SELECT = `
  id,
  read_at,
  archived,
  deleted_at,
  created_at,
  notifications ( id, user_id, type, message, data, created_at )
`

export function filterInboxBySearch(items: InboxNotificationRow[], query: string): InboxNotificationRow[] {
  const list = Array.isArray(items) ? items : []
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter((row) => {
    const msg = row.notification.message.toLowerCase()
    const typ = row.notification.type.toLowerCase()
    return msg.includes(q) || typ.includes(q)
  })
}

export async function fetchInboxNotifications(input: {
  limit?: number
  offset?: number
  includeArchived?: boolean
  search?: string
}): Promise<{ data: InboxNotificationRow[]; count: number }> {
  if (!supabase) return { data: [], count: 0 }
  const limit = input.limit ?? 50
  const offset = input.offset ?? 0
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: [], count: 0 }

  let q = supabase
    .from('notification_inbox_items')
    .select(INBOX_SELECT, { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!input.includeArchived) {
    q = q.eq('archived', false)
  }

  const { data, error, count } = await q
  if (error) throw new Error(error.message)
  const rows = data ?? []
  let parsed = parseInboxNotificationRows(rows)
  const term = input.search?.trim().toLowerCase()
  if (term) {
    parsed = filterInboxBySearch(parsed, term)
  }
  return { data: parsed, count: count ?? parsed.length }
}

export async function markInboxItemRead(inboxId: string): Promise<void> {
  if (!supabase) return
  const ts = new Date().toISOString()
  const { error } = await supabase.from('notification_inbox_items').update({ read_at: ts }).eq('id', inboxId)
  if (error) throw new Error(error.message)
}

export async function markAllInboxRead(): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const ts = new Date().toISOString()
  const { error } = await supabase
    .from('notification_inbox_items')
    .update({ read_at: ts })
    .eq('user_id', user.id)
    .is('read_at', null)
    .is('deleted_at', null)
  if (error) throw new Error(error.message)
}

export async function archiveInboxItem(inboxId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('notification_inbox_items').update({ archived: true }).eq('id', inboxId)
  if (error) throw new Error(error.message)
}

export async function softDeleteInboxItem(inboxId: string): Promise<void> {
  if (!supabase) return
  const ts = new Date().toISOString()
  const { error } = await supabase.from('notification_inbox_items').update({ deleted_at: ts }).eq('id', inboxId)
  if (error) throw new Error(error.message)
}

export async function createInAppNotificationRow(input: {
  type: string
  message: string
  data?: Record<string, unknown>
}): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const data = input.data ?? {}
  const { data: note, error: nErr } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type: input.type,
      message: input.message,
      data,
    })
    .select('id')
    .maybeSingle()
  if (nErr || !note?.id) throw new Error(nErr?.message ?? 'Failed to create notification')
  const { error: iErr } = await supabase.from('notification_inbox_items').insert({
    user_id: user.id,
    notification_id: note.id,
  })
  if (iErr) throw new Error(iErr.message)
}

export async function fetchNotificationPreferences(): Promise<UserNotificationChannels> {
  if (!supabase) return {}
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}
  const { data, error } = await supabase.from('notification_preferences').select('channels').eq('user_id', user.id).maybeSingle()
  if (error) throw new Error(error.message)
  const row = data as NotificationPreferencesRow | null
  const ch = row?.channels
  if (ch !== null && typeof ch === 'object' && !Array.isArray(ch)) {
    return ch as UserNotificationChannels
  }
  return {}
}

export async function upsertNotificationPreferences(channels: UserNotificationChannels): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,
      channels: channels as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
}

export async function fetchEmailTemplates(): Promise<EmailTemplateRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('email_templates').select('*').order('type', { ascending: true })
  if (error) throw new Error(error.message)
  const rows = data ?? []
  return Array.isArray(rows) ? (rows as EmailTemplateRow[]) : []
}

export async function fetchRecentEmailDispatches(limit = 20): Promise<EmailDispatchRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('email_dispatches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  const rows = data ?? []
  return Array.isArray(rows) ? (rows as EmailDispatchRow[]) : []
}
