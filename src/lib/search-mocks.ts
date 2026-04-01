import type { SearchItem } from '@/types/search'

export function mockSearchItem(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    type: 'company',
    title: 'Acme Corp',
    subtitle: 'SaaS',
    snippets: ['Acme'],
    updatedAt: new Date().toISOString(),
    ownerId: '00000000-0000-4000-8000-000000000002',
    ...overrides,
  }
}

export function mockMalformedApiPayload(): unknown {
  return {
    data: {
      data: [
        { id: 'x', type: 'company', title: 'Ok' },
        null,
        { id: 'y', type: 'invalid', title: 'Skip' },
        { id: 'z', type: 'report', title: 'Report only' },
      ],
      count: 'nope',
    },
  }
}

export function mockEmptyEdgeResponse(): unknown {
  return { data: {} }
}
