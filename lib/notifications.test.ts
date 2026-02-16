import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from './notifications'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>
const mockGetUser = supabase.auth.getUser as ReturnType<typeof vi.fn>

const mockUser = { id: 'user-1' }

const mockNotification = (id: string, read: boolean) => ({
  id,
  user_id: 'user-1',
  type: 'friend_request',
  title: `Notification ${id}`,
  body: null,
  data: null,
  read,
  created_at: '2026-02-01T00:00:00Z',
})

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
  })

  describe('getUnreadCount', () => {
    it('returns 0 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await getUnreadCount()).toBe(0)
    })

    it('returns count when authenticated', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        }),
      })

      expect(await getUnreadCount()).toBe(5)
    })

    it('returns 0 on error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'db error' } }),
          }),
        }),
      })

      expect(await getUnreadCount()).toBe(0)
    })

    it('returns 0 when count is null', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: null, error: null }),
          }),
        }),
      })

      expect(await getUnreadCount()).toBe(0)
    })
  })

  describe('getNotifications', () => {
    it('returns empty array when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      expect(await getNotifications()).toEqual([])
    })

    it('returns notifications list', async () => {
      const notifications = [mockNotification('n-1', false), mockNotification('n-2', true)]

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: notifications, error: null }),
            }),
          }),
        }),
      })

      const result = await getNotifications()
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('n-1')
      expect(result[1].id).toBe('n-2')
    })

    it('respects limit parameter', async () => {
      const notifications = [mockNotification('n-1', false)]

      const mockLimit = vi.fn().mockResolvedValue({ data: notifications, error: null })
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: mockLimit,
            }),
          }),
        }),
      })

      await getNotifications(10)
      expect(mockLimit).toHaveBeenCalledWith(10)
    })

    it('returns empty array on error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
            }),
          }),
        }),
      })

      expect(await getNotifications()).toEqual([])
    })
  })

  describe('markAsRead', () => {
    it('returns null error on success', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await markAsRead('n-1')
      expect(result.error).toBeNull()
    })

    it('returns error message on failure', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Not found' } }),
        }),
      })

      const result = await markAsRead('n-999')
      expect(result.error).toBe('Not found')
    })

    it('calls update with correct parameters', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      await markAsRead('n-1')
      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockUpdate).toHaveBeenCalledWith({ read: true })
      expect(mockEq).toHaveBeenCalledWith('id', 'n-1')
    })
  })

  describe('markAllAsRead', () => {
    it('returns null error on success', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })

      const result = await markAllAsRead()
      expect(result.error).toBeNull()
    })

    it('returns error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const result = await markAllAsRead()
      expect(result.error).toBe('Not authenticated')
    })

    it('returns error message on database failure', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
          }),
        }),
      })

      const result = await markAllAsRead()
      expect(result.error).toBe('Update failed')
    })

    it('filters by user_id and read=false', async () => {
      const mockReadEq = vi.fn().mockResolvedValue({ error: null })
      const mockUserEq = vi.fn().mockReturnValue({ eq: mockReadEq })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUserEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      await markAllAsRead()
      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockUpdate).toHaveBeenCalledWith({ read: true })
      expect(mockUserEq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockReadEq).toHaveBeenCalledWith('read', false)
    })
  })
})
