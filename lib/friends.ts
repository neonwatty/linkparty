'use client'

import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/profile'

// Types
export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted'
  created_at: string
  updated_at: string
}

export interface FriendWithProfile {
  friendship_id: string
  user: UserProfile
  since: string
}

export interface FriendRequest {
  friendship_id: string
  from: UserProfile
  sent_at: string
}

export interface OutgoingRequest {
  friendship_id: string
  to: UserProfile
  sent_at: string
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

// ---------- Read operations (via Supabase client with RLS) ----------

export async function listFriends(): Promise<FriendWithProfile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'accepted')

  if (error || !friendships || friendships.length === 0) return []

  const friendIds = friendships.map((f: Friendship) => f.friend_id)
  const { data: profiles, error: profileError } = await supabase.from('user_profiles').select('*').in('id', friendIds)

  if (profileError || !profiles) return []

  const profileMap = new Map<string, UserProfile>()
  for (const p of profiles) {
    profileMap.set(p.id, p as UserProfile)
  }

  return friendships
    .map((f: Friendship) => {
      const profile = profileMap.get(f.friend_id)
      if (!profile) return null
      return {
        friendship_id: f.id,
        user: profile,
        since: f.created_at,
      }
    })
    .filter(Boolean) as FriendWithProfile[]
}

export async function listIncomingRequests(): Promise<FriendRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('friend_id', user.id)
    .eq('status', 'pending')

  if (error || !friendships || friendships.length === 0) return []

  const senderIds = friendships.map((f: Friendship) => f.user_id)
  const { data: profiles, error: profileError } = await supabase.from('user_profiles').select('*').in('id', senderIds)

  if (profileError || !profiles) return []

  const profileMap = new Map<string, UserProfile>()
  for (const p of profiles) {
    profileMap.set(p.id, p as UserProfile)
  }

  return friendships
    .map((f: Friendship) => {
      const profile = profileMap.get(f.user_id)
      if (!profile) return null
      return {
        friendship_id: f.id,
        from: profile,
        sent_at: f.created_at,
      }
    })
    .filter(Boolean) as FriendRequest[]
}

export async function listOutgoingRequests(): Promise<OutgoingRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error || !friendships || friendships.length === 0) return []

  const recipientIds = friendships.map((f: Friendship) => f.friend_id)
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', recipientIds)

  if (profileError || !profiles) return []

  const profileMap = new Map<string, UserProfile>()
  for (const p of profiles) {
    profileMap.set(p.id, p as UserProfile)
  }

  return friendships
    .map((f: Friendship) => {
      const profile = profileMap.get(f.friend_id)
      if (!profile) return null
      return {
        friendship_id: f.id,
        to: profile,
        sent_at: f.created_at,
      }
    })
    .filter(Boolean) as OutgoingRequest[]
}

export async function getFriendshipStatus(otherUserId: string): Promise<FriendshipStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'none'

  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${user.id},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${user.id})`)

  if (error || !data || data.length === 0) return 'none'

  // Check for accepted friendship (either direction)
  const accepted = data.find((f: Friendship) => f.status === 'accepted')
  if (accepted) return 'accepted'

  // Check for pending request
  const pending = data.find((f: Friendship) => f.status === 'pending')
  if (pending) {
    return pending.user_id === user.id ? 'pending_sent' : 'pending_received'
  }

  return 'none'
}

export async function searchUsers(query: string): Promise<UserProfile[]> {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length < 2) return []

  const escaped = trimmed.replace(/[,.*()%_]/g, '')
  if (escaped.length < 2) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get blocked user IDs to filter from results
  let blockedIds: string[] = []
  if (user) {
    const { data: blocks } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id)

    if (blocks) {
      blockedIds = blocks.map((b: { blocked_id: string }) => b.blocked_id)
    }

    // Also get users who blocked me (they shouldn't appear in my search)
    const { data: blockedBy } = await supabase.from('user_blocks').select('blocker_id').eq('blocked_id', user.id)

    if (blockedBy) {
      blockedIds.push(...blockedBy.map((b: { blocker_id: string }) => b.blocker_id))
    }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
    .limit(20)

  if (error || !data) return []

  // Filter out current user and blocked users
  const excludeIds = new Set([user?.id, ...blockedIds].filter(Boolean))
  const profiles = (data as UserProfile[]).filter((p) => !excludeIds.has(p.id))
  return profiles
}

// ---------- Mutation operations (via API routes with auth token) ----------

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

export async function sendFriendRequest(friendId: string): Promise<{ error: string | null }> {
  const headers = await getAuthHeaders()
  if (!headers) return { error: 'Not authenticated' }

  const res = await globalThis.fetch('/api/friends/request', {
    method: 'POST',
    headers,
    body: JSON.stringify({ friendId }),
  })
  const result = await res.json()
  if (!res.ok) return { error: result.error || 'Request failed' }
  return { error: null }
}

export async function acceptFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  const headers = await getAuthHeaders()
  if (!headers) return { error: 'Not authenticated' }

  const res = await globalThis.fetch('/api/friends/accept', {
    method: 'POST',
    headers,
    body: JSON.stringify({ friendshipId }),
  })
  const result = await res.json()
  if (!res.ok) return { error: result.error || 'Request failed' }
  return { error: null }
}

export async function declineFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  const headers = await getAuthHeaders()
  if (!headers) return { error: 'Not authenticated' }

  const res = await globalThis.fetch(`/api/friends/${friendshipId}?action=decline`, {
    method: 'DELETE',
    headers,
  })
  const result = await res.json()
  if (!res.ok) return { error: result.error || 'Request failed' }
  return { error: null }
}

export async function cancelFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  const headers = await getAuthHeaders()
  if (!headers) return { error: 'Not authenticated' }

  const res = await globalThis.fetch(`/api/friends/${friendshipId}?action=cancel`, {
    method: 'DELETE',
    headers,
  })
  const result = await res.json()
  if (!res.ok) return { error: result.error || 'Request failed' }
  return { error: null }
}

export async function removeFriend(friendshipId: string): Promise<{ error: string | null }> {
  const headers = await getAuthHeaders()
  if (!headers) return { error: 'Not authenticated' }

  const res = await globalThis.fetch(`/api/friends/${friendshipId}?action=unfriend`, {
    method: 'DELETE',
    headers,
  })
  const result = await res.json()
  if (!res.ok) return { error: result.error || 'Request failed' }
  return { error: null }
}

// ---------- Block operations ----------

export async function blockUser(userId: string): Promise<{ error: string | null }> {
  const headers = await getAuthHeaders()
  if (!headers) return { error: 'Not authenticated' }

  const res = await globalThis.fetch('/api/users/block', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  })
  const result = await res.json()
  if (!res.ok) return { error: result.error || 'Failed to block user' }
  return { error: null }
}

export async function unblockUser(userId: string): Promise<{ error: string | null }> {
  const headers = await getAuthHeaders()
  if (!headers) return { error: 'Not authenticated' }

  const res = await globalThis.fetch(`/api/users/block?userId=${userId}`, {
    method: 'DELETE',
    headers,
  })
  const result = await res.json()
  if (!res.ok) return { error: result.error || 'Failed to unblock user' }
  return { error: null }
}

export async function listBlockedUsers(): Promise<UserProfile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: blocks, error } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id)

  if (error || !blocks || blocks.length === 0) return []

  const blockedIds = blocks.map((b: { blocked_id: string }) => b.blocked_id)
  const { data: profiles, error: profileError } = await supabase.from('user_profiles').select('*').in('id', blockedIds)

  if (profileError || !profiles) return []
  return profiles as UserProfile[]
}

export async function isBlocked(otherUserId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('user_blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`,
    )
    .limit(1)

  return (data?.length ?? 0) > 0
}
