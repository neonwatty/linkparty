import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase module
const mockSetDisplayName = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    from: vi.fn(),
  },
  setDisplayName: (...args: unknown[]) => mockSetDisplayName(...args),
}))

import { supabase } from '@/lib/supabase'
import { getMyProfile, getProfileById, updateProfile, checkUsernameAvailable, searchProfiles } from './profile'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>
const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>

describe('profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMyProfile', () => {
    it('returns null when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await getMyProfile()).toBeNull()
    })

    it('returns null on query error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      })
      expect(await getMyProfile()).toBeNull()
    })

    it('returns profile when authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-1', display_name: 'Test' }, error: null }),
          }),
        }),
      })
      const profile = await getMyProfile()
      expect(profile).toEqual({ id: 'user-1', display_name: 'Test' })
    })
  })

  describe('getProfileById', () => {
    it('returns profile for valid ID', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-1', display_name: 'Alice' }, error: null }),
          }),
        }),
      })
      const profile = await getProfileById('user-1')
      expect(profile).toEqual({ id: 'user-1', display_name: 'Alice' })
    })

    it('returns null on error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      })
      const profile = await getProfileById('nonexistent')
      expect(profile).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('returns error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const result = await updateProfile({ display_name: 'New' })
      expect(result.error).toBe('Not authenticated')
    })

    it('syncs display_name to localStorage and user_metadata on success', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'user-1', display_name: 'NewName' }, error: null }),
            }),
          }),
        }),
      })
      const result = await updateProfile({ display_name: 'NewName' })
      expect(result.error).toBeNull()
      expect(mockSetDisplayName).toHaveBeenCalledWith('NewName')
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { display_name: 'NewName' } })
    })

    it('does not sync display_name when not in updates', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'user-1', avatar_value: '🦊' }, error: null }),
            }),
          }),
        }),
      })
      const result = await updateProfile({ avatar_value: '🦊' })
      expect(result.error).toBeNull()
      expect(mockSetDisplayName).not.toHaveBeenCalled()
      expect(supabase.auth.updateUser).not.toHaveBeenCalled()
    })

    it('returns username taken error on unique violation', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'unique' } }),
            }),
          }),
        }),
      })
      const result = await updateProfile({ username: 'taken' })
      expect(result.error).toBe('Username already taken')
    })

    it('returns validation error for invalid display_name', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const result = await updateProfile({ display_name: '' })
      expect(result.error).toBeTruthy()
      expect(result.data).toBeNull()
    })

    it('returns username format error on check constraint violation', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: '23514', message: 'check' } }),
            }),
          }),
        }),
      })
      const result = await updateProfile({ username: 'BAD!' })
      expect(result.error).toContain('3-20 characters')
    })

    it('returns generic error for other DB errors', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: '42000', message: 'unknown' } }),
            }),
          }),
        }),
      })
      const result = await updateProfile({ avatar_value: '🦊' })
      expect(result.error).toBe('Failed to update profile')
    })
  })

  describe('checkUsernameAvailable', () => {
    it('returns true when username not found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      })
      expect(await checkUsernameAvailable('newuser')).toBe(true)
    })

    it('returns false when username exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'someone' } }),
          }),
        }),
      })
      expect(await checkUsernameAvailable('taken')).toBe(false)
    })
  })

  describe('searchProfiles', () => {
    it('returns empty for short queries', async () => {
      expect(await searchProfiles('a')).toEqual([])
    })

    it('returns results on valid query', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'user-1', display_name: 'Alice', username: 'alice' }],
              error: null,
            }),
          }),
        }),
      })
      const results = await searchProfiles('ali')
      expect(results).toEqual([{ id: 'user-1', display_name: 'Alice', username: 'alice' }])
    })

    it('returns empty when escaped query too short', async () => {
      // Query has enough chars but after escaping special chars, < 2 remain
      expect(await searchProfiles('!@')).toEqual([])
    })

    it('returns empty array with null data', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      const results = await searchProfiles('test')
      expect(results).toEqual([])
    })

    it('returns empty array on error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'db error' },
            }),
          }),
        }),
      })
      const results = await searchProfiles('test')
      expect(results).toEqual([])
    })
  })
})
