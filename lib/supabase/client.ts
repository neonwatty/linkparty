'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for development without Supabase
    console.warn('Supabase credentials not configured, using mock mode')
    return null
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
