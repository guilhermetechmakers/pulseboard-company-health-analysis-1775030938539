import { supabase } from '@/lib/supabase'

/** Ensures a `workspace_teams` row exists for the company and seeds the owner as a member. */
export async function ensureWorkspaceTeam(companyId: string, userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: existing, error: selErr } = await supabase
    .from('workspace_teams')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing?.id) return existing.id

  const { data: created, error: insErr } = await supabase
    .from('workspace_teams')
    .insert({ owner_user_id: userId, company_id: companyId, seats: 5 })
    .select('id')
    .single()
  if (insErr || !created?.id) throw insErr ?? new Error('Team create failed')

  const { error: memErr } = await supabase.from('workspace_team_members').insert({
    team_id: created.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
  })
  if (memErr) throw memErr
  return created.id
}
