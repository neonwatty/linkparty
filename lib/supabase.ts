'use client'

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

// Check if we're in mock mode (no real Supabase credentials)
export const IS_MOCK_MODE =
  !supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-id') || !supabaseAnonKey

if (IS_MOCK_MODE) {
  logger.warn(
    'Supabase credentials not configured. Running in mock mode. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local for full functionality.',
  )
}

// Build session headers for RLS policies that check x-session-id
const sessionHeaders: Record<string, string> = {}
if (typeof window !== 'undefined') {
  const storageKey = 'link-party-session-id'
  let sid = localStorage.getItem(storageKey)
  if (!sid) {
    sid = crypto.randomUUID()
    localStorage.setItem(storageKey, sid)
  }
  sessionHeaders['x-session-id'] = sid
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  { global: { headers: sessionHeaders } },
)

// Migrate localStorage keys from old brand to new brand
function migrateLocalStorage() {
  if (typeof window === 'undefined') return

  const migrations = [
    ['remember-party-session-id', 'link-party-session-id'],
    ['remember-party-display-name', 'link-party-display-name'],
    ['remember-party-avatar', 'link-party-avatar'],
    ['remember-party-current-party', 'link-party-current-party'],
  ]
  for (const [oldKey, newKey] of migrations) {
    const oldValue = localStorage.getItem(oldKey)
    if (oldValue && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldValue)
      localStorage.removeItem(oldKey)
    }
  }
}

// Run migration on client side
if (typeof window !== 'undefined') {
  migrateLocalStorage()
}

// Generate or retrieve anonymous session ID
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  const storageKey = 'link-party-session-id'
  let sessionId = localStorage.getItem(storageKey)

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(storageKey, sessionId)
  }

  return sessionId
}

// Generate 6-character alphanumeric party code
export function generatePartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars like 0/O, 1/I
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Get or set display name
export function getDisplayName(): string {
  if (typeof window === 'undefined') return ''

  const storageKey = 'link-party-display-name'
  return localStorage.getItem(storageKey) || ''
}

export function setDisplayName(name: string): void {
  if (typeof window === 'undefined') return

  const storageKey = 'link-party-display-name'
  localStorage.setItem(storageKey, name)
}

// Get or set avatar
const AVATARS = ['🎉', '🎸', '🎮', '🎨', '🎪', '🎭', '🎯', '🎲', '🎵', '🎺', '🎻', '🪇', '🎤', '🎧', '🎬']

export function getAvatar(): string {
  if (typeof window === 'undefined') return '🎉'

  const storageKey = 'link-party-avatar'
  let avatar = localStorage.getItem(storageKey)

  if (!avatar) {
    avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)]
    localStorage.setItem(storageKey, avatar)
  }

  return avatar
}

// Store current party for rejoin
export function getCurrentParty(): { partyId: string; partyCode: string } | null {
  if (typeof window === 'undefined') return null

  const storageKey = 'link-party-current-party'
  const data = localStorage.getItem(storageKey)
  return data ? JSON.parse(data) : null
}

export function setCurrentParty(partyId: string, partyCode: string): void {
  if (typeof window === 'undefined') return

  const storageKey = 'link-party-current-party'
  localStorage.setItem(storageKey, JSON.stringify({ partyId, partyCode }))
}

export function clearCurrentParty(): void {
  if (typeof window === 'undefined') return

  const storageKey = 'link-party-current-party'
  localStorage.removeItem(storageKey)
}

// Database types
export interface DbParty {
  id: string
  code: string
  name: string | null
  host_session_id: string
  created_at: string
  expires_at: string
}

export interface DbPartyMember {
  id: string
  party_id: string
  session_id: string
  user_id: string | null
  display_name: string
  avatar: string
  is_host: boolean
  joined_at: string
}

export interface DbQueueItem {
  id: string
  party_id: string
  type: 'youtube' | 'tweet' | 'reddit' | 'note' | 'image'
  status: 'pending' | 'showing' | 'shown'
  position: number
  added_by_name: string
  added_by_session_id: string
  created_at: string
  updated_at: string
  // YouTube fields
  title: string | null
  channel: string | null
  duration: string | null
  thumbnail: string | null
  // Tweet fields
  tweet_author: string | null
  tweet_handle: string | null
  tweet_content: string | null
  tweet_timestamp: string | null
  // Reddit fields
  subreddit: string | null
  reddit_title: string | null
  reddit_body: string | null
  upvotes: number | null
  comment_count: number | null
  // Note fields
  note_content: string | null
  // Image fields
  image_name: string | null
  image_url: string | null
  image_storage_path: string | null
  image_caption: string | null
  // Reminder/completion fields
  due_date: string | null
  is_completed: boolean
  completed_at: string | null
  completed_by_user_id: string | null
}
