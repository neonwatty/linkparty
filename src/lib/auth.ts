import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

export type AuthUser = User
export type AuthSession = Session

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}`,
    },
  })

  if (error) {
    console.error('Google sign in error:', error)
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Get session error:', error)
    return null
  }

  return session
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session)
    }
  )

  return subscription
}
