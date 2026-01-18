import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Generate or retrieve anonymous session ID
export function getSessionId(): string {
  const storageKey = 'remember-party-session-id'
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
  const storageKey = 'remember-party-display-name'
  return localStorage.getItem(storageKey) || ''
}

export function setDisplayName(name: string): void {
  const storageKey = 'remember-party-display-name'
  localStorage.setItem(storageKey, name)
}

// Get or set avatar
const AVATARS = ['🎉', '🎸', '🎮', '🎨', '🎪', '🎭', '🎯', '🎲', '🎵', '🎺', '🎻', '🪇', '🎤', '🎧', '🎬']

export function getAvatar(): string {
  const storageKey = 'remember-party-avatar'
  let avatar = localStorage.getItem(storageKey)

  if (!avatar) {
    avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)]
    localStorage.setItem(storageKey, avatar)
  }

  return avatar
}

export function setAvatar(emoji: string): void {
  const storageKey = 'remember-party-avatar'
  localStorage.setItem(storageKey, emoji)
}

// Store current party for rejoin
export function getCurrentParty(): { partyId: string; partyCode: string } | null {
  const storageKey = 'remember-party-current-party'
  const data = localStorage.getItem(storageKey)
  return data ? JSON.parse(data) : null
}

export function setCurrentParty(partyId: string, partyCode: string): void {
  const storageKey = 'remember-party-current-party'
  localStorage.setItem(storageKey, JSON.stringify({ partyId, partyCode }))
}

export function clearCurrentParty(): void {
  const storageKey = 'remember-party-current-party'
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
  type: 'youtube' | 'tweet' | 'reddit' | 'note'
  status: 'pending' | 'showing' | 'shown'
  position: number
  added_by_name: string
  added_by_session_id: string
  created_at: string
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
  // Reminder/completion fields
  due_date: string | null
  is_completed: boolean
  completed_at: string | null
  completed_by_user_id: string | null
}
