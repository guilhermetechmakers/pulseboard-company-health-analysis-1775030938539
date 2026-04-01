import { describe, expect, it } from 'vitest'

function safeMap<T, R>(items: T[] | null | undefined, fn: (x: T) => R): R[] {
  const list = Array.isArray(items) ? items : []
  return list.map(fn)
}

function mergeIds(a: unknown, b: unknown): string[] {
  const left = Array.isArray(a) ? a : []
  const right = Array.isArray(b) ? b : []
  return [...left, ...right].filter((x): x is string => typeof x === 'string')
}

describe('company array guards', () => {
  it('safeMap handles null and undefined', () => {
    expect(safeMap(null, (x) => String(x))).toEqual([])
    expect(safeMap(undefined, (x) => String(x))).toEqual([])
    expect(safeMap([1, 2], (x) => x * 2)).toEqual([2, 4])
  })

  it('mergeIds ignores non-arrays', () => {
    expect(mergeIds(null, ['a'])).toEqual(['a'])
    expect(mergeIds(['x'], 'nope')).toEqual(['x'])
  })
})
