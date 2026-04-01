/**
 * PulseBoard — Settings API: workspace team, CSV parse preview, verified account deletion.
 * Auth: Bearer user JWT. Sensitive ops use service role after password re-verification.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { rejectIfActiveCompanyHeaderMismatch } from '../_shared/company-scope-headers.ts'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseDelimited(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0)
  return lines.map((line) => {
    const cells: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        inQ = !inQ
      } else if ((c === ',' || c === '\t') && !inQ) {
        cells.push(cur.trim())
        cur = ''
      } else {
        cur += c
      }
    }
    cells.push(cur.trim())
    return cells.map((c) => c.replace(/^"|"$/g, ''))
  })
}

function rowObject(headers: string[], row: string[]): Record<string, string> {
  const o: Record<string, string> = {}
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase().replace(/\s+/g, '_')
    o[key] = row[i] ?? ''
  })
  return o
}

const MAX_CSV_PREVIEW_CHARS = 400_000

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const admin = serviceKey ? createClient(supabaseUrl, serviceKey) : null

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const op = typeof body.op === 'string' ? body.op : ''

    if (op === 'csv_parse_preview') {
      const csvText = typeof body.csvText === 'string' ? body.csvText : ''
      const targetModel =
        typeof body.targetModel === 'string' ? body.targetModel : 'financials'
      if (!csvText.trim()) return json({ error: 'csvText required' }, 400)
      if (csvText.length > MAX_CSV_PREVIEW_CHARS) {
        return json({ error: 'CSV too large for preview (max ~400KB)' }, 413)
      }
      const grid = parseDelimited(csvText)
      if (grid.length < 2) {
        return json({
          data: {
            headers: [],
            sampleRows: [] as Record<string, string>[],
            issues: ['No data rows after header'],
            suggestedMapping: {} as Record<string, string>,
          },
        })
      }
      const headers = (grid[0] ?? []).map((h) => String(h))
      const dataRows = grid.slice(1, 6)
      const sampleRows = dataRows.map((r) => rowObject(headers, r))
      const issues: string[] = []
      const lower = headers.map((h) => h.toLowerCase())
      const suggestedMapping: Record<string, string> = {}
      headers.forEach((h, i) => {
        const k = lower[i]?.replace(/\s+/g, '_') ?? ''
        if (k === 'revenue' || k.includes('revenue')) suggestedMapping[h] = 'revenue'
        if (k === 'expenses' || k.includes('expense')) suggestedMapping[h] = 'expenses'
      })
      if (targetModel === 'financials') {
        const hasRevenue = lower.some((h) => h === 'revenue' || h.replace(/\s/g, '_') === 'revenue')
        const hasExpenses = lower.some((h) => h === 'expenses' || h.replace(/\s/g, '_') === 'expenses')
        if (!hasRevenue || !hasExpenses) {
          issues.push('Financial imports need revenue and expenses columns (mapped or raw headers).')
        }
      }
      return json({ data: { headers, sampleRows, issues, suggestedMapping } })
    }

    if (op === 'team_bundle') {
      const companyId = typeof body.companyId === 'string' ? body.companyId : ''
      if (!companyId) return json({ error: 'companyId required' }, 400)
      const scope = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (scope) return scope

      const { data: company, error: cErr } = await userClient
        .from('companies')
        .select('id,user_id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (cErr || !company) return json({ error: 'Company not found' }, 404)

      let { data: team } = await userClient
        .from('workspace_teams')
        .select('id,company_id,owner_user_id,seats,created_at')
        .eq('company_id', companyId)
        .maybeSingle()

      if (!team) {
        const { data: inserted, error: insErr } = await userClient
          .from('workspace_teams')
          .insert({
            company_id: companyId,
            owner_user_id: user.id,
            seats: 5,
          })
          .select('id,company_id,owner_user_id,seats,created_at')
          .single()
        if (insErr || !inserted) return json({ error: insErr?.message ?? 'team create failed' }, 500)
        team = inserted
        await userClient.from('workspace_team_members').insert({
          team_id: team.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        })
      }

      const { data: rawMembers } = await userClient
        .from('workspace_team_members')
        .select('id,team_id,user_id,role,status,created_at')
        .eq('team_id', team.id)
        .eq('status', 'active')

      const members = Array.isArray(rawMembers) ? rawMembers : []
      const userIds = members.map((m) => m.user_id).filter(Boolean)
      let profileById: Record<string, { display_name: string | null; email: string | null }> = {}
      if (userIds.length > 0) {
        const { data: profs } = await userClient.from('profiles').select('id,display_name,email').in('id', userIds)
        const plist = Array.isArray(profs) ? profs : []
        profileById = Object.fromEntries(
          plist.map((p) => [
            p.id,
            { display_name: p.display_name ?? null, email: p.email ?? null },
          ]),
        )
      }

      const { data: rawInvites } = await userClient
        .from('workspace_team_invites')
        .select('id,email,role,status,created_at,expires_at')
        .eq('team_id', team.id)
        .eq('status', 'pending')

      const invites = Array.isArray(rawInvites) ? rawInvites : []

      return json({
        data: {
          team,
          members: members.map((m) => ({
            ...m,
            displayName: profileById[m.user_id]?.display_name ?? null,
            email: profileById[m.user_id]?.email ?? null,
          })),
          invites,
        },
      })
    }

    if (op === 'team_invite') {
      const companyId = typeof body.companyId === 'string' ? body.companyId : ''
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      const role =
        typeof body.role === 'string' && ['admin', 'member', 'viewer'].includes(body.role) ? body.role : 'member'
      if (!companyId || !email) return json({ error: 'companyId and email required' }, 400)
      const scope = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (scope) return scope

      if (user.email && email === user.email.toLowerCase()) {
        return json({ error: 'You cannot invite your own account email' }, 400)
      }

      const { data: teamRow } = await userClient
        .from('workspace_teams')
        .select('id,seats')
        .eq('company_id', companyId)
        .maybeSingle()
      if (!teamRow) return json({ error: 'Team not initialized; open team section again' }, 400)

      const { count: memberCountRaw } = await userClient
        .from('workspace_team_members')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamRow.id)
        .eq('status', 'active')
      const memberCount = memberCountRaw ?? 0

      const { count: pendingCountRaw } = await userClient
        .from('workspace_team_invites')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamRow.id)
        .eq('status', 'pending')
      const pendingCount = pendingCountRaw ?? 0

      const seats = typeof teamRow.seats === 'number' ? teamRow.seats : 5
      if (memberCount + pendingCount >= seats) {
        return json({ error: 'Seat limit reached for your plan. Increase seats or revoke invites.' }, 409)
      }

      const { error: invErr } = await userClient.from('workspace_team_invites').insert({
        team_id: teamRow.id,
        email,
        role,
        status: 'pending',
        invited_by: user.id,
        expires_at: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      })
      if (invErr) {
        const msg = invErr.message.includes('unique') ? 'Invite already pending for this email' : invErr.message
        return json({ error: msg }, 409)
      }

      if (admin) {
        await admin.from('audit_logs').insert({
          actor_user_id: user.id,
          action: 'team_invite_sent',
          entity: 'workspace_team_invite',
          entity_id: teamRow.id,
          metadata: { email, role, companyId },
        })
      }

      return json({ data: { ok: true } })
    }

    if (op === 'team_revoke_invite') {
      const inviteId = typeof body.inviteId === 'string' ? body.inviteId : ''
      const companyIdHint = typeof body.companyId === 'string' ? body.companyId : ''
      if (!inviteId) return json({ error: 'inviteId required' }, 400)
      const { data: inv, error: iErr } = await userClient
        .from('workspace_team_invites')
        .select('id,team_id')
        .eq('id', inviteId)
        .maybeSingle()
      if (iErr || !inv) return json({ error: 'Invite not found' }, 404)
      const { data: team } = await userClient
        .from('workspace_teams')
        .select('company_id')
        .eq('id', inv.team_id)
        .maybeSingle()
      if (!team?.company_id) return json({ error: 'Team not found' }, 404)
      const scopeRevoke = rejectIfActiveCompanyHeaderMismatch(req, team.company_id)
      if (scopeRevoke) return scopeRevoke
      if (companyIdHint && companyIdHint !== team.company_id) {
        return json({ error: 'companyId mismatch' }, 400)
      }
      const { data: co } = await userClient
        .from('companies')
        .select('id')
        .eq('id', team.company_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!co) return json({ error: 'Forbidden' }, 403)

      await userClient
        .from('workspace_team_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId)
      return json({ data: { ok: true } })
    }

    if (op === 'team_remove_member') {
      const memberId = typeof body.memberId === 'string' ? body.memberId : ''
      const companyIdHint = typeof body.companyId === 'string' ? body.companyId : ''
      if (!memberId) return json({ error: 'memberId required' }, 400)
      const { data: mem, error: mErr } = await userClient
        .from('workspace_team_members')
        .select('id,team_id,user_id,role')
        .eq('id', memberId)
        .maybeSingle()
      if (mErr || !mem) return json({ error: 'Member not found' }, 404)
      if (mem.role === 'owner') return json({ error: 'Cannot remove workspace owner' }, 400)
      const { data: team } = await userClient
        .from('workspace_teams')
        .select('company_id')
        .eq('id', mem.team_id)
        .maybeSingle()
      if (!team?.company_id) return json({ error: 'Team not found' }, 404)
      const scopeMember = rejectIfActiveCompanyHeaderMismatch(req, team.company_id)
      if (scopeMember) return scopeMember
      if (companyIdHint && companyIdHint !== team.company_id) {
        return json({ error: 'companyId mismatch' }, 400)
      }
      const { data: co } = await userClient
        .from('companies')
        .select('id')
        .eq('id', team.company_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!co) return json({ error: 'Forbidden' }, 403)

      await userClient
        .from('workspace_team_members')
        .update({ status: 'removed' })
        .eq('id', memberId)
      return json({ data: { ok: true } })
    }

    if (op === 'billing_summary') {
      const companyId = typeof body.companyId === 'string' ? body.companyId : ''
      if (!companyId) return json({ error: 'companyId required' }, 400)
      const scopeBill = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (scopeBill) return scopeBill
      const { data: co, error: coErr } = await userClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (coErr || !co) return json({ error: 'Company not found' }, 404)

      const { data: sub } = await userClient
        .from('subscriptions')
        .select('plan_id,status,next_billing_date,current_period_end')
        .eq('user_id', user.id)
        .maybeSingle()

      const portal =
        Deno.env.get('PULSEBOARD_BILLING_PORTAL_URL') ??
        Deno.env.get('STRIPE_CUSTOMER_PORTAL_URL') ??
        null

      return json({
        data: {
          subscription: sub ?? null,
          paymentsPortalUrl: portal,
          receiptsNote:
            'Receipts in PulseBoard come from billing_receipts. Use your payment portal for card and invoice management.',
        },
      })
    }

    if (op === 'account_delete_request') {
      const password = typeof body.password === 'string' ? body.password : ''
      const companyId = typeof body.companyId === 'string' ? body.companyId : ''
      const reason = typeof body.reason === 'string' ? body.reason : ''
      if (password.length < 8) return json({ error: 'Password required (min 8 characters)' }, 400)
      if (!companyId) return json({ error: 'companyId required' }, 400)
      if (!user.email) return json({ error: 'Account email missing' }, 400)
      const scopeDel = rejectIfActiveCompanyHeaderMismatch(req, companyId)
      if (scopeDel) return scopeDel

      const { data: co, error: coErr } = await userClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (coErr || !co) return json({ error: 'Forbidden' }, 403)

      const verifyClient = createClient(supabaseUrl, anon)
      const { data: signData, error: signErr } = await verifyClient.auth.signInWithPassword({
        email: user.email,
        password,
      })
      if (signErr || !signData.user || signData.user.id !== user.id) {
        return json({ error: 'Invalid password' }, 401)
      }

      if (!admin) {
        return json({ error: 'Account deletion requires service role configuration on the server.' }, 503)
      }

      await admin.from('audit_logs').insert({
        actor_user_id: user.id,
        action: 'account_delete_request',
        entity: 'user',
        entity_id: user.id,
        metadata: { companyId, reason, source: 'pulse-settings-api' },
      })

      const { error: pErr } = await admin
        .from('profiles')
        .update({ account_status: 'pending_deletion' })
        .eq('id', user.id)
      if (pErr) {
        /* non-fatal if column mismatch in older DBs */
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
      if (delErr) {
        return json({
          data: {
            ok: true,
            message:
              'Deletion request recorded and your profile is flagged. Complete removal may require support if auth admin API is restricted.',
          },
        })
      }

      return json({
        data: {
          ok: true,
          message: 'Your account has been removed. You will be signed out.',
        },
      })
    }

    return json({ error: 'Unknown op' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Server error' }, 500)
  }
})
