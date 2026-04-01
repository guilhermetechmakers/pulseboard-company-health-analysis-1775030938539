import type { NavigateFunction } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export async function navigateAfterAuth(
  navigate: NavigateFunction,
  options: { fromPath?: string | null; fallbackCompany?: boolean },
) {
  const stored =
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pb_oauth_redirect') : null
  const legacyReturn =
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pulseboard_auth_return') : null
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('pb_oauth_redirect')
    sessionStorage.removeItem('pulseboard_auth_return')
  }

  const target = stored ?? legacyReturn ?? options.fromPath ?? null
  if (target && target !== '/login' && target !== '/signup') {
    navigate(target, { replace: true })
    return
  }

  if (!supabase) {
    navigate('/dashboard', { replace: true })
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    navigate('/dashboard', { replace: true })
    return
  }

  const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle()
  if (company?.id && options.fallbackCompany !== false) {
    navigate('/company', { replace: true })
    return
  }

  navigate('/dashboard', { replace: true })
}
