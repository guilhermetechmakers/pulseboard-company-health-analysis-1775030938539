/** Client React Query stale windows (aligns with Edge TTL where applicable). */
export const QUERY_STALE_MS = {
  companyMine: 60_000,
  aggregates: 45_000,
  healthScores: 30_000,
  companyReports: 45_000,
  report: 60_000,
  reportSnapshots: 30_000,
} as const
