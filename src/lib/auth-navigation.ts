import type { NavigateFunction } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/** Paths that are safe without a `companies` row (account, auth, onboarding). */
const PATHS_WITHOUT_COMPANY = new Set([
  '/',
  '/login',
  '/signup',
  '/verify-email',
  '/password-reset',
  '/password-reset/confirm',
  '/reset-password',
  '/company/create',
  '/company/scope-notice',
  '/profile',
])

function pathRequiresCompany(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return false
  if (PATHS_WITHOUT_COMPANY.has(pathname)) return false
  return true
}

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
  const companyId = company?.id ?? null

  const target = stored ?? legacyReturn ?? options.fromPath ?? null
  if (target && target !== '/login' && target !== '/signup') {
    let pathname = target
    try {
      pathname = new URL(target, 'http://local.invalid').pathname
    } catch {
      pathname = target.split('?')[0] ?? target
    }
    if (!companyId && pathRequiresCompany(pathname)) {
      navigate('/company/create', { replace: true })
      return
    }
    navigate(target, { replace: true })
    return
  }

  if (!companyId) {
    navigate('/company/create', { replace: true })
    return
  }

  navigate('/dashboard', { replace: true })
}
