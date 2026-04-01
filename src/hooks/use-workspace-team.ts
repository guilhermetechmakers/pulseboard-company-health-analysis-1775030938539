import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ensureWorkspaceTeam } from '@/lib/workspace-team'
import type { Database } from '@/types/database'

type TeamRow = Database['public']['Tables']['workspace_teams']['Row']
type MemberRow = Database['public']['Tables']['workspace_team_members']['Row']
type InviteRow = Database['public']['Tables']['workspace_team_invites']['Row']

export const workspaceTeamQueryKey = (companyId: string | undefined) => ['workspace-team', companyId] as const

export { ensureWorkspaceTeam } from '@/lib/workspace-team'

export function useWorkspaceTeam(companyId: string | undefined, userId: string | undefined) {
  const query = useQuery({
    queryKey: workspaceTeamQueryKey(companyId),
    enabled: Boolean(supabase && companyId && userId),
    queryFn: async (): Promise<{
      team: TeamRow | null
      members: (MemberRow & { display_name: string | null })[]
      invites: InviteRow[]
      isOwner: boolean
    }> => {
      if (!supabase || !companyId || !userId) {
        return { team: null, members: [], invites: [], isOwner: false }
      }

      let team: TeamRow | null = null
      let teamId: string

      const { data: existingTeam, error: teamErr } = await supabase
        .from('workspace_teams')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle()
      if (teamErr) throw teamErr

      if (existingTeam?.id) {
        teamId = existingTeam.id
        team = existingTeam
      } else {
        teamId = await ensureWorkspaceTeam(companyId, userId)
        const { data: fresh, error: freshErr } = await supabase
          .from('workspace_teams')
          .select('*')
          .eq('id', teamId)
          .maybeSingle()
        if (freshErr) throw freshErr
        team = fresh ?? null
      }

      const { data: rawMembers, error: memQErr } = await supabase
        .from('workspace_team_members')
        .select('*')
        .eq('team_id', teamId)
      if (memQErr) throw memQErr
      const membersList = Array.isArray(rawMembers) ? rawMembers : []

      const userIds = (membersList ?? []).map((m) => m.user_id).filter(Boolean)
      let profileMap: Record<string, string | null> = {}
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
        const plist = Array.isArray(profs) ? profs : []
        profileMap = Object.fromEntries((plist ?? []).map((p) => [p.id, p.display_name]))
      }

      const members = (membersList ?? []).map((m) => ({
        ...m,
        display_name: profileMap[m.user_id] ?? null,
      }))

      const { data: rawInvites, error: invErr } = await supabase
        .from('workspace_team_invites')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'pending')
      if (invErr) throw invErr
      const invites = Array.isArray(rawInvites) ? rawInvites : []

      const isOwner = team?.owner_user_id === userId

      return {
        team,
        members,
        invites,
        isOwner,
      }
    },
  })

  return query
}

export function useInviteTeamMember(teamId: string | undefined, companyId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; role: string; invitedBy: string; seats: number }) => {
      if (!supabase || !teamId) throw new Error('Team not ready')
      const email = input.email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email')

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

      const used = (memberCount ?? 0) + (inviteCount ?? 0)
      if (used >= input.seats) throw new Error('Seat limit reached for your plan.')

      const { error } = await supabase.from('workspace_team_invites').insert({
        team_id: teamId,
        email,
        role: input.role,
        status: 'pending',
        invited_by: input.invitedBy,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      toast.success('Invitation recorded')
      await qc.invalidateQueries({ queryKey: workspaceTeamQueryKey(companyId) })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRevokeTeamInvite(companyId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.from('workspace_team_invites').delete().eq('id', inviteId)
      if (error) throw error
    },
    onSuccess: async () => {
      toast.success('Invite removed')
      await qc.invalidateQueries({ queryKey: workspaceTeamQueryKey(companyId) })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRemoveTeamMember(companyId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { memberId: string; memberUserId: string; ownerUserId: string }) => {
      if (!supabase) throw new Error('Supabase not configured')
      if (input.memberUserId === input.ownerUserId) throw new Error('You cannot remove the workspace owner.')
      const { error } = await supabase.from('workspace_team_members').delete().eq('id', input.memberId)
      if (error) throw error
    },
    onSuccess: async () => {
      toast.success('Member removed')
      await qc.invalidateQueries({ queryKey: workspaceTeamQueryKey(companyId) })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
