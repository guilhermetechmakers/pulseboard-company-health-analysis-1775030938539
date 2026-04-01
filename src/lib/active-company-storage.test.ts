import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  activeCompanyIdHeaders,
  persistActiveCompanyId,
  readStoredActiveCompanyId,
} from '@/lib/active-company-storage'

describe('active-company-storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when storage empty', () => {
    const store: Record<string, string> = {}
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    } as Storage)
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage)
    expect(readStoredActiveCompanyId()).toBeNull()
  })

  it('persists valid uuid and exposes headers', () => {
    const session: Record<string, string> = {}
    const local: Record<string, string> = {}
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => session[k] ?? null,
      setItem: (k: string, v: string) => {
        session[k] = v
      },
      removeItem: (k: string) => {
        delete session[k]
      },
    } as Storage)
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => local[k] ?? null,
      setItem: (k: string, v: string) => {
        local[k] = v
      },
      removeItem: (k: string) => {
        delete local[k]
      },
    } as Storage)

    const id = '550e8400-e29b-41d4-a716-446655440000'
    persistActiveCompanyId(id)
    expect(readStoredActiveCompanyId()).toBe(id)
    expect(activeCompanyIdHeaders()).toEqual({ 'X-Active-Company-Id': id })
  })
})
