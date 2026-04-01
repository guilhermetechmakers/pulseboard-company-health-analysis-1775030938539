import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useUserProfile } from '@/hooks/use-auth-profile'
import { useMyCompany } from '@/hooks/use-my-company'
import { clearActiveCompanyPersistence, persistActiveCompanyId } from '@/lib/active-company-storage'
import { supabase } from '@/lib/supabase'
import type { CompanyRow } from '@/types/integrations'

function readEnvSingleCompany(): boolean {
  const raw = import.meta.env.VITE_SINGLE_COMPANY_MODE
  if (typeof raw === 'string' && raw.toLowerCase() === 'false') return false
  return true
}

export type ActiveCompanyContextValue = {
  /** Resolved owned company row (single-company mode: at most one per user). */
  activeCompany: CompanyRow | null
  activeCompanyId: string | null
  /** Alias for layout / banners. */
  company: CompanyRow | null
  /** Alias for route guards. */
  companyId: string | null
  companyName: string | null
  isLoading: boolean
  /** `profiles.single_company_mode` (default true) AND `VITE_SINGLE_COMPANY_MODE` env. */
  isSingleCompanyModeEnabled: boolean
  /**
   * Persists id to session/local storage for `X-PulseBoard-Active-Company-Id` on Edge Function calls.
   * Cannot grant access to another user’s company — server validates ownership.
   */
  setActiveCompanyId: (id: string | null) => void
  refreshActiveCompany: () => Promise<void>
}

const ActiveCompanyContext = createContext<ActiveCompanyContextValue | null>(null)

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth()
  const { data: profile } = useUserProfile(user?.id)
  const { data: myCompany, isLoading, refetch } = useMyCompany()
  const lastSyncedKeyRef = useRef<string | null>(null)

  const isSingleCompanyModeEnabled = profile?.single_company_mode !== false && readEnvSingleCompany()

  const setActiveCompanyId = useCallback((id: string | null) => {
    persistActiveCompanyId(id)
  }, [])

  useEffect(() => {
    if (!session) {
      clearActiveCompanyPersistence()
      lastSyncedKeyRef.current = null
      return
    }
    if (isLoading) return
    if (myCompany?.id) persistActiveCompanyId(myCompany.id)
    else persistActiveCompanyId(null)
  }, [session, isLoading, myCompany?.id])

  /**
   * Align `profiles.last_context_company_id` with the resolved company so `pulse-companies-api`
   * picks the same row for legacy multi-company accounts when the client header is absent.
   */
  useEffect(() => {
    if (!supabase || !user?.id || !myCompany?.id) return
    const key = `${user.id}:${myCompany.id}`
    if (lastSyncedKeyRef.current === key) return
    if (profile?.last_context_company_id === myCompany.id) {
      lastSyncedKeyRef.current = key
      return
    }
    lastSyncedKeyRef.current = key
    void supabase
      .from('profiles')
      .update({ last_context_company_id: myCompany.id, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) lastSyncedKeyRef.current = null
      })
  }, [user?.id, myCompany?.id, profile?.last_context_company_id])

  const value = useMemo<ActiveCompanyContextValue>(
    () => ({
      activeCompany: myCompany ?? null,
      activeCompanyId: myCompany?.id ?? null,
      company: myCompany ?? null,
      companyId: myCompany?.id ?? null,
      companyName: myCompany?.name ?? null,
      isLoading,
      isSingleCompanyModeEnabled,
      setActiveCompanyId,
      refreshActiveCompany: async () => {
        await refetch()
      },
    }),
    [myCompany, isLoading, isSingleCompanyModeEnabled, setActiveCompanyId, refetch],
  )

  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>
}

export function useActiveCompany(): ActiveCompanyContextValue {
  const ctx = useContext(ActiveCompanyContext)
  if (!ctx) {
    throw new Error('useActiveCompany must be used within ActiveCompanyProvider')
  }
  return ctx
}

export function useSingleCompanyModeEnabled(): boolean {
  return useActiveCompany().isSingleCompanyModeEnabled
}
