'use client'

import { supabase } from './supabase'
import { logger } from './logger'
import type { User, Session } from '@supabase/supabase-js'

const log = logger.createLogger('Auth')

export type AuthUser = User
export type AuthSession = Session

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    },
  })

  if (error) {
    log.error('Google sign in failed', error)
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    log.error('Sign out failed', error)
    throw error
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    log.error('Failed to get session', error)
    return null
  }

  return session
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return subscription
}

export interface AuthResult {
  success: boolean
  error?: string
  needsConfirmation?: boolean
}

function mapSupabaseError(error: { message: string; code?: string }): string {
  const code = error.code || ''
  const message = error.message.toLowerCase()

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Invalid email or password'
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Please check your email to confirm your account'
  }
  if (code === 'user_already_exists' || message.includes('user already registered')) {
    return 'An account with this email already exists'
  }
  if (code === 'weak_password' || message.includes('password')) {
    return 'Password must be at least 8 characters'
  }

  return 'Something went wrong. Please try again.'
}

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    },
  })

  if (error) {
    log.error('Email sign up failed', error)
    return { success: false, error: mapSupabaseError(error) }
  }

  return { success: true, needsConfirmation: true }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    log.error('Email sign in failed', error)
    return { success: false, error: mapSupabaseError(error) }
  }

  return { success: true }
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
  })

  if (error) {
    log.error('Password reset failed', error)
    return { success: false, error: mapSupabaseError(error) }
  }

  return { success: true }
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    log.error('Update password failed', error)
    return { success: false, error: mapSupabaseError(error) }
  }

  return { success: true }
}
