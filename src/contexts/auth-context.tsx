import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearActiveCompanyPersistence } from '@/lib/active-company-storage'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  isConfigured: boolean
  isEmailVerified: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setSession(null)
      setUser(null)
      setIsLoading(false)
      return
    }
    const { data } = await supabase.auth.getSession()
    setSession(data.session ?? null)
    setUser(data.session?.user ?? null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refreshSession()
    if (!supabase) return undefined

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [refreshSession])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    clearActiveCompanyPersistence()
    setSession(null)
    setUser(null)
  }, [])

  const isEmailVerified = Boolean(user?.email_confirmed_at)

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      isConfigured: Boolean(supabase),
      isEmailVerified,
      signOut,
      refreshSession,
    }),
    [session, user, isLoading, isEmailVerified, signOut, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
