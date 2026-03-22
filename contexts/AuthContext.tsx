'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthUser, AuthSession } from '@/lib/auth'
import { getCurrentSession, onAuthStateChange, signOut as authSignOut } from '@/lib/auth'
import { setDisplayName } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const log = logger.createLogger('AuthContext')

interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** Check if E2E mock auth is active (cookie present + env flag set) */
function isE2EMockAuth(): boolean {
  if (typeof document === 'undefined') return false
  if (!process.env.NEXT_PUBLIC_E2E_MOCK_AUTH) return false
  return document.cookie.includes('mock-auth-token')
}

/** Minimal fake user for E2E mock auth */
const MOCK_USER = {
  id: 'e2e-mock-user-id',
  email: 'e2e@test.local',
  user_metadata: { display_name: 'Test User' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as AuthUser

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // E2E mock auth bypass — provide a fake user without hitting Supabase
    if (isE2EMockAuth()) {
      setUser(MOCK_USER)
      setSession(null)
      setIsLoading(false)
      return
    }

    // Get initial session
    getCurrentSession()
      .then((session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })

    // Listen for auth changes
    const subscription = onAuthStateChange((session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)

      // Regenerate session_id when a different user logs in
      if (session?.user?.id) {
        const currentOwner = localStorage.getItem('link-party-session-id-owner')
        if (session.user.id !== currentOwner) {
          localStorage.setItem('link-party-session-id', crypto.randomUUID())
          localStorage.setItem('link-party-session-id-owner', session.user.id)
        }

        // Sync display name from user metadata to localStorage
        const metaName = session.user.user_metadata?.display_name
        if (metaName) {
          setDisplayName(metaName)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('link-party-session-id-owner')
      await authSignOut()
    } catch (error) {
      log.error('Sign out failed', error)
    } finally {
      setUser(null)
      setSession(null)
      router.push('/login')
    }
  }

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
