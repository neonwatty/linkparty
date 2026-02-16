import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}))

// Mock globalThis.fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

import { supabase } from '@/lib/supabase'
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  getFriendshipStatus,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
} from './friends'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>
const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>
const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>

const mockUser = { id: 'user-1' }
const mockSession = { access_token: 'test-token-123' }

const mockProfile = (id: string, name: string) => ({
  id,
  username: name.toLowerCase(),
  display_name: name,
  avatar_type: 'emoji',
  avatar_value: '🎉',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

describe('friends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockGetSession.mockResolvedValue({ data: { session: mockSession } })
  })

  describe('listFriends', () => {
    it('returns empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await listFriends()).toEqual([])
    })

    it('returns empty array when no friends', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })
      expect(await listFriends()).toEqual([])
    })

    it('returns profiles when friends exist', async () => {
      // First call: friendships query
      const friendships = [
        { id: 'fs-1', user_id: 'user-1', friend_id: 'user-2', status: 'accepted', created_at: '2026-01-15T00:00:00Z' },
        { id: 'fs-2', user_id: 'user-1', friend_id: 'user-3', status: 'accepted', created_at: '2026-01-20T00:00:00Z' },
      ]
      const profiles = [mockProfile('user-2', 'Alice'), mockProfile('user-3', 'Bob')]

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // friendships query
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: friendships, error: null }),
              }),
            }),
          }
        }
        // profiles query
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: profiles, error: null }),
          }),
        }
      })

      const result = await listFriends()
      expect(result).toHaveLength(2)
      expect(result[0].friendship_id).toBe('fs-1')
      expect(result[0].user.display_name).toBe('Alice')
      expect(result[0].since).toBe('2026-01-15T00:00:00Z')
      expect(result[1].friendship_id).toBe('fs-2')
      expect(result[1].user.display_name).toBe('Bob')
    })
  })

  describe('listIncomingRequests', () => {
    it('returns pending requests from other users', async () => {
      const friendships = [
        { id: 'fs-10', user_id: 'user-5', friend_id: 'user-1', status: 'pending', created_at: '2026-02-01T00:00:00Z' },
      ]
      const profiles = [mockProfile('user-5', 'Charlie')]

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: friendships, error: null }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: profiles, error: null }),
          }),
        }
      })

      const result = await listIncomingRequests()
      expect(result).toHaveLength(1)
      expect(result[0].friendship_id).toBe('fs-10')
      expect(result[0].from.display_name).toBe('Charlie')
      expect(result[0].sent_at).toBe('2026-02-01T00:00:00Z')
    })

    it('returns empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await listIncomingRequests()).toEqual([])
    })
  })

  describe('listOutgoingRequests', () => {
    it('returns outgoing pending requests', async () => {
      const friendships = [
        { id: 'fs-20', user_id: 'user-1', friend_id: 'user-6', status: 'pending', created_at: '2026-02-05T00:00:00Z' },
      ]
      const profiles = [mockProfile('user-6', 'Diana')]

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: friendships, error: null }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: profiles, error: null }),
          }),
        }
      })

      const result = await listOutgoingRequests()
      expect(result).toHaveLength(1)
      expect(result[0].friendship_id).toBe('fs-20')
      expect(result[0].to.display_name).toBe('Diana')
      expect(result[0].sent_at).toBe('2026-02-05T00:00:00Z')
    })

    it('returns empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await listOutgoingRequests()).toEqual([])
    })
  })

  describe('getFriendshipStatus', () => {
    it('returns none when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await getFriendshipStatus('user-2')).toBe('none')
    })

    it('returns none when no relationship exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })
      expect(await getFriendshipStatus('user-2')).toBe('none')
    })

    it('returns accepted when friends', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({
            data: [{ id: 'fs-1', user_id: 'user-1', friend_id: 'user-2', status: 'accepted' }],
            error: null,
          }),
        }),
      })
      expect(await getFriendshipStatus('user-2')).toBe('accepted')
    })

    it('returns pending_sent when outgoing pending request', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({
            data: [{ id: 'fs-1', user_id: 'user-1', friend_id: 'user-2', status: 'pending' }],
            error: null,
          }),
        }),
      })
      expect(await getFriendshipStatus('user-2')).toBe('pending_sent')
    })

    it('returns pending_received when incoming pending request', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({
            data: [{ id: 'fs-1', user_id: 'user-2', friend_id: 'user-1', status: 'pending' }],
            error: null,
          }),
        }),
      })
      expect(await getFriendshipStatus('user-2')).toBe('pending_received')
    })
  })

  describe('searchUsers', () => {
    it('returns empty for short queries', async () => {
      expect(await searchUsers('a')).toEqual([])
    })

    it('returns empty for queries that become too short after sanitization', async () => {
      expect(await searchUsers('%%')).toEqual([])
    })

    it('sanitizes input and returns results excluding current user', async () => {
      const profiles = [mockProfile('user-2', 'Alice'), mockProfile('user-1', 'Alicia')]

      // Mock handles user_blocks queries (return empty) and user_profiles query
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        // user_profiles
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: profiles, error: null }),
            }),
          }),
        }
      })

      const result = await searchUsers('ali')
      // Should exclude user-1 (the current user)
      expect(result).toHaveLength(1)
      expect(result[0].display_name).toBe('Alice')
    })

    it('returns empty array on error', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
            }),
          }),
        }
      })
      expect(await searchUsers('test')).toEqual([])
    })
  })

  describe('sendFriendRequest', () => {
    it('calls fetch with correct URL and body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'fs-new' } }),
      })

      const result = await sendFriendRequest('user-2')
      expect(result.error).toBeNull()
      expect(mockFetch).toHaveBeenCalledWith('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        body: JSON.stringify({ friendId: 'user-2' }),
      })
    })

    it('returns error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      const result = await sendFriendRequest('user-2')
      expect(result.error).toBe('Not authenticated')
    })

    it('returns error message from API on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Already friends' }),
      })
      const result = await sendFriendRequest('user-2')
      expect(result.error).toBe('Already friends')
    })
  })

  describe('acceptFriendRequest', () => {
    it('calls fetch with correct URL and body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'fs-1' } }),
      })

      const result = await acceptFriendRequest('fs-1')
      expect(result.error).toBeNull()
      expect(mockFetch).toHaveBeenCalledWith('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        body: JSON.stringify({ friendshipId: 'fs-1' }),
      })
    })

    it('returns error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      const result = await acceptFriendRequest('fs-1')
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('declineFriendRequest', () => {
    it('calls fetch with correct URL and method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const result = await declineFriendRequest('fs-1')
      expect(result.error).toBeNull()
      expect(mockFetch).toHaveBeenCalledWith('/api/friends/fs-1?action=decline', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
      })
    })

    it('returns error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      const result = await declineFriendRequest('fs-1')
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('cancelFriendRequest', () => {
    it('calls fetch with correct URL and method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const result = await cancelFriendRequest('fs-1')
      expect(result.error).toBeNull()
      expect(mockFetch).toHaveBeenCalledWith('/api/friends/fs-1?action=cancel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
      })
    })

    it('returns error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      const result = await cancelFriendRequest('fs-1')
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('removeFriend', () => {
    it('calls fetch with correct URL and method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const result = await removeFriend('fs-1')
      expect(result.error).toBeNull()
      expect(mockFetch).toHaveBeenCalledWith('/api/friends/fs-1?action=unfriend', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
      })
    })

    it('returns error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      const result = await removeFriend('fs-1')
      expect(result.error).toBe('Not authenticated')
    })

    it('returns error message from API on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Friendship not found' }),
      })
      const result = await removeFriend('fs-1')
      expect(result.error).toBe('Friendship not found')
    })
  })
})
