import type { InboxNotificationRow } from '@/types/notifications'

export function parseInboxNotificationRows(raw: unknown): InboxNotificationRow[] {
  if (!Array.isArray(raw)) return []
  const out: InboxNotificationRow[] = []
  for (const row of raw) {
    if (row === null || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const inboxId = typeof r.id === 'string' ? r.id : ''
    if (!inboxId) continue
    const readAt = r.read_at === null || typeof r.read_at === 'string' ? (r.read_at as string | null) : null
    const archived = r.archived === true
    const nRaw = r.notifications
    const first =
      nRaw !== null && typeof nRaw === 'object'
        ? Array.isArray(nRaw)
          ? (nRaw[0] as Record<string, unknown> | undefined)
          : (nRaw as Record<string, unknown>)
        : null
    if (!first || typeof first !== 'object') continue
    const n = first as Record<string, unknown>
    const nid = typeof n.id === 'string' ? n.id : ''
    if (!nid) continue
    const data =
      n.data !== null && typeof n.data === 'object' && !Array.isArray(n.data) ? (n.data as Record<string, unknown>) : {}
    out.push({
      inboxId,
      readAt,
      archived,
      notification: {
        id: nid,
        type: typeof n.type === 'string' ? n.type : '',
        message: typeof n.message === 'string' ? n.message : '',
        data,
        createdAt: typeof n.created_at === 'string' ? n.created_at : '',
      },
    })
  }
  return out
}
