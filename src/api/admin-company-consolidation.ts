/**
 * Admin-only company consolidation — `admin-api` Edge Function.
 */
import { invokeAdminApi } from '@/lib/supabase-functions'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export interface MultiCompanyUserRow {
  userId: string
  companyCount: number
  companyIds: string[]
}

function normalizeMultiList(raw: unknown): MultiCompanyUserRow[] {
  const r = isRecord(raw) ? raw : {}
  const data = r.data
  const inner = isRecord(data) ? data : r
  const users = inner.users
  if (!Array.isArray(users)) return []
  return users
    .map((item) => {
      if (!isRecord(item)) return null
      const userId = typeof item.userId === 'string' ? item.userId : ''
      const companyCount =
        typeof item.companyCount === 'number' && Number.isFinite(item.companyCount)
          ? item.companyCount
          : 0
      const idsRaw = item.companyIds
      const companyIds = Array.isArray(idsRaw) ? idsRaw.filter((x): x is string => typeof x === 'string') : []
      if (!userId) return null
      return { userId, companyCount, companyIds }
    })
    .filter((x): x is MultiCompanyUserRow => x !== null)
}

export async function adminListMultiCompanyUsers(): Promise<MultiCompanyUserRow[]> {
  const res = await invokeAdminApi({ action: 'companies_multi_list' })
  return normalizeMultiList(res)
}

export async function adminMigrateDryRun(): Promise<{
  dryRun: boolean
  preview: { userId: string; companyCount: number; companyIds: string[]; proposedAction: string }[]
}> {
  const res = await invokeAdminApi({ action: 'companies_migrate_dry_run' })
  const r = isRecord(res) ? res : {}
  const data = isRecord(r.data) ? r.data : {}
  const previewRaw = data.preview
  const preview = Array.isArray(previewRaw)
    ? previewRaw
        .map((p) => {
          if (!isRecord(p)) return null
          return {
            userId: typeof p.userId === 'string' ? p.userId : '',
            companyCount:
              typeof p.companyCount === 'number' && Number.isFinite(p.companyCount) ? p.companyCount : 0,
            companyIds: Array.isArray(p.companyIds)
              ? p.companyIds.filter((x): x is string => typeof x === 'string')
              : [],
            proposedAction: typeof p.proposedAction === 'string' ? p.proposedAction : '',
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null && x.userId.length > 0)
    : []
  return { dryRun: true, preview }
}

export async function adminMergeCompanies(input: {
  sourceCompanyId: string
  targetCompanyId: string
  dryRun?: boolean
}): Promise<Record<string, unknown>> {
  return invokeAdminApi({
    action: 'companies_merge',
    sourceCompanyId: input.sourceCompanyId,
    targetCompanyId: input.targetCompanyId,
    dryRun: input.dryRun === true,
  })
}

/** Sets `profiles.last_context_company_id` for the target user (admin only). */
export async function adminSetPrimaryCompany(input: {
  targetUserId: string
  companyId: string
}): Promise<Record<string, unknown>> {
  return invokeAdminApi({
    action: 'user_set_primary_company',
    targetUserId: input.targetUserId,
    companyId: input.companyId,
  })
}
