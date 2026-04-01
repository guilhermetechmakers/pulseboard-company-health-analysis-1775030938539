import { describe, expect, it } from 'vitest'
import { filterInboxBySearch } from '@/api/notifications'
import { applyTemplate } from '@/lib/notifications-template'
import { parseInboxNotificationRows } from '@/lib/notifications-guards'
import type { InboxNotificationRow } from '@/types/notifications'

function sampleRow(overrides?: Partial<InboxNotificationRow>): InboxNotificationRow {
  return {
    inboxId: 'in-1',
    readAt: null,
    archived: false,
    notification: {
      id: 'n1',
      type: 'analysis_complete',
      message: 'Done',
      data: {},
      createdAt: new Date().toISOString(),
    },
    ...overrides,
  }
}

describe('notifications runtime guards', () => {
  it('parseInboxNotificationRows handles array-shaped notification embeds', () => {
    const raw = [
      {
        id: 'i1',
        read_at: null,
        archived: false,
        notifications: [
          {
            id: 'n1',
            user_id: 'u1',
            type: 'job_failed',
            message: 'fail',
            data: {},
            created_at: new Date().toISOString(),
          },
        ],
      },
    ]
    const out = parseInboxNotificationRows(raw)
    expect(out).toHaveLength(1)
    expect(out[0]?.notification.type).toBe('job_failed')
  })

  it('filterInboxBySearch guards empty input', () => {
    expect(filterInboxBySearch([], '')).toEqual([])
    const items = [sampleRow()]
    expect(filterInboxBySearch(items, '')).toEqual(items)
    expect(filterInboxBySearch(items, 'done')).toEqual(items)
    expect(filterInboxBySearch(items, 'missing')).toEqual([])
  })

  it('applyTemplate replaces placeholders', () => {
    expect(applyTemplate('Hi {{name}}', { name: 'Sam' })).toBe('Hi Sam')
  })
})
