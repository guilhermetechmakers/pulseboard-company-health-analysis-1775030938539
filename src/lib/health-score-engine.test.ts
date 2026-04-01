import { describe, expect, it } from 'vitest'
import { clampScore, computeWeightedHealthScores, mergeLlmAndRuleScores } from '@/lib/health-score-engine'

describe('health-score-engine', () => {
  it('clampScore handles non-finite values', () => {
    expect(clampScore(Number.NaN)).toBe(0)
    expect(clampScore(150)).toBe(100)
    expect(clampScore(-5)).toBe(0)
    expect(clampScore(72.456)).toBe(72.46)
  })

  it('computeWeightedHealthScores returns safe scores with empty inputs', () => {
    const r = computeWeightedHealthScores({
      company: null,
      financials: null,
      market: null,
      social: null,
    })
    expect(r.overall).toBeGreaterThanOrEqual(0)
    expect(r.overall).toBeLessThanOrEqual(100)
    expect(r.financial).toBeGreaterThanOrEqual(0)
    expect(r.market).toBeGreaterThanOrEqual(0)
    expect(r.brandSocial).toBeGreaterThanOrEqual(0)
  })

  it('computeWeightedHealthScores responds to revenue and margin', () => {
    const r = computeWeightedHealthScores({
      company: { name: 'Acme', industry: 'SaaS' },
      financials: { revenue: 100000, expenses: 40000, cash: 50000, debt: 0 },
      market: { competitors: [{ n: 1 }, { n: 2 }], trends: ['a'], opportunities: [], threats: [] },
      social: { followers: 1000, engagement_rate: 0.05, posts_count: 12 },
    })
    expect(r.financial).toBeGreaterThan(40)
    expect(r.market).toBeGreaterThan(40)
    expect(r.brandSocial).toBeGreaterThan(35)
    expect(r.overall).toBeGreaterThan(40)
  })

  it('mergeLlmAndRuleScores prefers LLM values when present', () => {
    const rule = { financial: 50, market: 50, brandSocial: 50, overall: 50 }
    const merged = mergeLlmAndRuleScores({ overall: 88, financial: 90, market: 80, social: 70 }, rule)
    expect(merged.overall).toBe(88)
    expect(merged.financial).toBe(90)
    expect(merged.market).toBe(80)
    expect(merged.brandSocial).toBe(70)
  })

  it('mergeLlmAndRuleScores falls back to rule for missing LLM fields', () => {
    const rule = { financial: 44, market: 55, brandSocial: 66, overall: 50 }
    const merged = mergeLlmAndRuleScores({}, rule)
    expect(merged.financial).toBe(44)
    expect(merged.market).toBe(55)
    expect(merged.brandSocial).toBe(66)
    expect(merged.overall).toBe(clampScore(44 * 0.4 + 55 * 0.35 + 66 * 0.25))
  })
})
