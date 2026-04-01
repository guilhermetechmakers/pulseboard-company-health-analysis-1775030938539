/**
 * Rule-based health scoring for PulseBoard. Safe with partial / missing inputs; clamps 0–100.
 * Mirrors src/lib/health-score-engine.ts — keep formulas aligned when changing either file.
 */
export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  const rounded = Math.round(value * 100) / 100
  return Math.min(100, Math.max(0, rounded))
}

export interface HealthScoreEngineInput {
  company: Record<string, unknown> | null
  financials: Record<string, unknown> | null
  market: Record<string, unknown> | null
  social: Record<string, unknown> | null
}

export interface HealthScoreEngineResult {
  financial: number
  market: number
  brandSocial: number
  overall: number
}

export function computeWeightedHealthScores(input: HealthScoreEngineInput): HealthScoreEngineResult {
  const f = input.financials ?? {}
  const m = input.market ?? {}
  const s = input.social ?? {}
  const c = input.company ?? {}

  let financial = 45
  const revenue = num(f.revenue)
  const expenses = num(f.expenses)
  if (revenue > 0) {
    const margin = expenses >= 0 ? (revenue - expenses) / revenue : 0
    financial = 35 + Math.max(0, Math.min(40, margin * 80))
  }
  const cash = num(f.cash)
  if (cash > 0) financial += Math.min(12, Math.log10(cash + 1) * 4)
  const debt = num(f.debt)
  if (debt > 0 && cash > 0 && debt > cash * 2) financial -= 12
  financial = clampScore(financial)

  let market = 38
  market += Math.min(18, asArray(m.competitors).length * 3)
  market += Math.min(14, asArray(m.trends).length * 4)
  market += Math.min(12, asArray(m.opportunities).length * 2)
  market += Math.min(10, asArray(m.threats).length * 2)
  if (typeof c.industry === 'string' && c.industry.trim().length > 0) market += 4
  if (typeof c.business_model === 'string' && c.business_model.trim().length > 0) market += 4
  market = clampScore(market)

  let brandSocial = 32
  const followers = num(s.followers)
  if (followers > 0) brandSocial += Math.min(28, Math.log10(followers + 1) * 9)
  const engagement = num(s.engagement_rate)
  if (engagement > 0 && engagement <= 1) brandSocial += Math.min(25, engagement * 80)
  else if (engagement > 1) brandSocial += Math.min(25, engagement * 0.25)
  const posts = num(s.posts_count)
  if (posts > 0) brandSocial += Math.min(10, Math.log10(posts + 1) * 5)
  brandSocial = clampScore(brandSocial)

  const overall = clampScore(financial * 0.4 + market * 0.35 + brandSocial * 0.25)

  return { financial, market, brandSocial, overall }
}

export function mergeLlmAndRuleScores(
  llm: { overall?: number; financial?: number; market?: number; social?: number },
  rule: HealthScoreEngineResult,
): HealthScoreEngineResult {
  const pick = (a: number | undefined, b: number) => (typeof a === 'number' && Number.isFinite(a) ? clampScore(a) : b)
  const financial = pick(llm.financial, rule.financial)
  const market = pick(llm.market, rule.market)
  const brandSocial = pick(llm.social, rule.brandSocial)
  const overall =
    typeof llm.overall === 'number' && Number.isFinite(llm.overall)
      ? clampScore(llm.overall)
      : clampScore(financial * 0.4 + market * 0.35 + brandSocial * 0.25)
  return { financial, market, brandSocial, overall }
}
