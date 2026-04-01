import { invokePulseSettingsApi } from '@/lib/supabase-functions'
import { supabase } from '@/lib/supabase'
import { ensureWorkspaceTeam } from '@/lib/workspace-team'
import type {
  AccountDeleteRequestResult,
  BillingSummaryResult,
  CsvParsePreviewResponse,
  TeamBundleResponse,
  TeamInviteRow,
  TeamMemberRow,
  WorkspaceTeamRow,
} from '@/types/settings'

export async function fetchSettingsTeamBundle(companyId: string): Promise<TeamBundleResponse> {
  if (!supabase) throw new Error('Supabase not configured')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Sign in required')

  const teamId = await ensureWorkspaceTeam(companyId, user.id)

  const { data: teamRow, error: teamErr } = await supabase.from('workspace_teams').select('*').eq('id', teamId).maybeSingle()
  if (teamErr || !teamRow) throw teamErr ?? new Error('Team not found')

  const { data: rawMembers, error: memErr } = await supabase.from('workspace_team_members').select('*').eq('team_id', teamId)
  if (memErr) throw memErr
  const membersList = Array.isArray(rawMembers) ? rawMembers : []

  const userIds = (membersList ?? []).map((m) => m.user_id).filter(Boolean)
  let profileMap: Record<string, { display_name: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
    const plist = Array.isArray(profs) ? profs : []
    profileMap = Object.fromEntries((plist ?? []).map((p) => [p.id, { display_name: p.display_name }]))
  }

  const members: TeamMemberRow[] = (membersList ?? []).map((m) => ({
    id: m.id,
    team_id: m.team_id,
    user_id: m.user_id,
    role: m.role,
    status: m.status,
    created_at: m.created_at,
    displayName: profileMap[m.user_id]?.display_name ?? null,
    email: null,
  }))

  const { data: rawInvites, error: invErr } = await supabase
    .from('workspace_team_invites')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'pending')
  if (invErr) throw invErr
  const invList = Array.isArray(rawInvites) ? rawInvites : []

  const invites: TeamInviteRow[] = (invList ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    created_at: inv.created_at,
    expires_at: inv.expires_at ?? null,
  }))

  const team: WorkspaceTeamRow = {
    id: teamRow.id,
    company_id: teamRow.company_id,
    owner_user_id: teamRow.owner_user_id,
    seats: teamRow.seats,
    created_at: teamRow.created_at,
  }

  return { team, members, invites }
}

export async function sendTeamInvite(input: {
  companyId: string
  email: string
  role: 'admin' | 'member' | 'viewer'
}): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Sign in required')

  const teamId = await ensureWorkspaceTeam(input.companyId, user.id)
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email')
  if (user.email && email === user.email.toLowerCase()) throw new Error('You cannot invite your own email.')

  const { data: team, error: tErr } = await supabase.from('workspace_teams').select('seats').eq('id', teamId).maybeSingle()
  if (tErr || !team) throw tErr ?? new Error('Team not found')

  const { count: memberCount } = await supabase
    .from('workspace_team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'active')

  const { count: inviteCount } = await supabase
    .from('workspace_team_invites')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'pending')

  const seats = typeof team.seats === 'number' ? team.seats : 5
  const used = (memberCount ?? 0) + (inviteCount ?? 0)
  if (used >= seats) throw new Error('Seat limit reached for your plan.')

  const { error } = await supabase.from('workspace_team_invites').insert({
    team_id: teamId,
    email,
    role: input.role,
    status: 'pending',
    invited_by: user.id,
  })
  if (error) throw error
}

export async function revokeTeamInvite(inviteId: string, _companyId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('workspace_team_invites').delete().eq('id', inviteId)
  if (error) throw error
}

export async function removeTeamMember(memberId: string, companyId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Sign in required')

  const { data: member, error: mErr } = await supabase
    .from('workspace_team_members')
    .select('id, user_id, role, team_id')
    .eq('id', memberId)
    .maybeSingle()
  if (mErr || !member) throw mErr ?? new Error('Member not found')
  if (member.role === 'owner') throw new Error('Cannot remove the workspace owner.')

  const { data: team, error: tErr } = await supabase
    .from('workspace_teams')
    .select('id, company_id, owner_user_id')
    .eq('id', member.team_id)
    .maybeSingle()
  if (tErr || !team || team.company_id !== companyId) throw new Error('Team mismatch')
  if (team.owner_user_id !== user.id) throw new Error('Only the owner can remove members.')

  const { error: delErr } = await supabase.from('workspace_team_members').delete().eq('id', memberId)
  if (delErr) throw delErr
}

export async function parseCsvPreview(input: {
  csvText: string
  targetModel: 'financials' | 'market' | 'social'
}): Promise<CsvParsePreviewResponse> {
  const raw = await invokePulseSettingsApi<{
    headers: string[]
    sampleRows: Record<string, string>[]
    issues: string[]
    suggestedMapping: Record<string, string>
  }>({
    op: 'csv_parse_preview',
    csvText: input.csvText,
    targetModel: input.targetModel,
  })
  const headers = Array.isArray(raw?.headers) ? raw.headers : []
  const sampleRows = Array.isArray(raw?.sampleRows) ? raw.sampleRows : []
  const issues = Array.isArray(raw?.issues) ? raw.issues : []
  const suggestedMapping =
    raw?.suggestedMapping !== null && typeof raw?.suggestedMapping === 'object' && !Array.isArray(raw.suggestedMapping)
      ? raw.suggestedMapping
      : {}
  return { headers, sampleRows, issues, suggestedMapping }
}

export async function settingsBillingSummary(companyId: string): Promise<BillingSummaryResult> {
  return invokePulseSettingsApi<BillingSummaryResult>({ op: 'billing_summary', companyId })
}

export async function settingsAccountDeleteRequest(input: {
  companyId: string
  password: string
  reason?: string
}): Promise<AccountDeleteRequestResult> {
  return invokePulseSettingsApi<AccountDeleteRequestResult>({
    op: 'account_delete_request',
    companyId: input.companyId,
    password: input.password,
    reason: input.reason,
  })
}

/** Confirms phrase client-side; password is verified again in the Edge Function. */
export async function deleteAccountWithPassword(input: {
  companyId: string
  password: string
  confirmPhrase: string
  reason?: string
}): Promise<AccountDeleteRequestResult> {
  if (!supabase) throw new Error('Supabase not configured')
  if (input.confirmPhrase.trim() !== 'DELETE') throw new Error('Type DELETE to confirm')
  return settingsAccountDeleteRequest({
    companyId: input.companyId,
    password: input.password,
    reason: input.reason,
  })
}
