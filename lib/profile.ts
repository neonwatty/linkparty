'use client'

import { supabase } from '@/lib/supabase'
import { validateDisplayName } from '@/lib/validation'

export interface UserProfile {
  id: string
  username: string | null
  display_name: string
  avatar_type: 'emoji' | 'image'
  avatar_value: string
  created_at: string
  updated_at: string
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
  if (error) return null
  return data as UserProfile
}

export async function getProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single()
  if (error) return null
  return data as UserProfile
}

export async function updateProfile(updates: {
  display_name?: string
  username?: string | null
  avatar_type?: 'emoji' | 'image'
  avatar_value?: string
}): Promise<{ data: UserProfile | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  if (updates.display_name !== undefined) {
    const validation = validateDisplayName(updates.display_name)
    if (!validation.isValid) return { data: null, error: validation.error ?? 'Invalid display name' }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Username already taken' }
    if (error.code === '23514')
      return { data: null, error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' }
    return { data: null, error: error.message }
  }
  return { data: data as UserProfile, error: null }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase.from('user_profiles').select('id').eq('username', username.toLowerCase()).single()
  return !data
}

export async function searchProfiles(query: string): Promise<UserProfile[]> {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length < 2) return []

  const escaped = trimmed.replace(/[^a-zA-Z0-9\s\-_]/g, '')
  if (escaped.length < 2) return []

  // Search by username or display_name
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
    .limit(20)

  if (error) return []
  return (data || []) as UserProfile[]
}
