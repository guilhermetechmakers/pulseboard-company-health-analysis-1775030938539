import { describe, expect, it } from 'vitest'
import { extractCsvHeaders, previewCsvRows } from '@/lib/csv-parse-headers'

describe('csv-parse-headers', () => {
  it('extracts headers with quoted commas', () => {
    const h = extractCsvHeaders('"a,b",c\n1,2')
    expect(h).toEqual(['a,b', 'c'])
  })

  it('previews rows safely', () => {
    const g = previewCsvRows('x,y\n1,2\n3,4', 2)
    expect(g.length).toBe(3)
    expect(g[0]).toEqual(['x', 'y'])
  })
})
