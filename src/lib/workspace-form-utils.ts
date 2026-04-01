export function parseOptNum(s: string | undefined): number | null {
  const t = (s ?? '').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function parseLines(s: string | undefined): string[] {
  const t = (s ?? '').trim()
  if (!t) return []
  return t
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}
