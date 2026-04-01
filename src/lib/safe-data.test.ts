import { describe, expect, it } from 'vitest'
import { asArray, asRecord, pickNumber, pickString } from '@/lib/safe-data'

describe('safe-data', () => {
  it('asArray coerces non-arrays', () => {
    expect(asArray<number>(null)).toEqual([])
    expect(asArray<number>(undefined)).toEqual([])
    expect(asArray<number>([1, 2])).toEqual([1, 2])
  })

  it('asRecord coerces primitives', () => {
    expect(Object.keys(asRecord(null))).toHaveLength(0)
    expect(asRecord({ a: 1 }).a).toBe(1)
  })

  it('pickNumber parses strings', () => {
    expect(pickNumber('12.5')).toBe(12.5)
    expect(pickNumber('')).toBeNull()
  })

  it('pickString rejects empty', () => {
    expect(pickString('x')).toBe('x')
    expect(pickString('')).toBeNull()
  })
})
