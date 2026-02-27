import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { AppNotification } from '@/lib/notifications'

// --- Mock dependencies -------------------------------------------------------

const mockGetNotifications = vi.fn()
const mockMarkAsRead = vi.fn()
const mockMarkAllAsRead = vi.fn()

vi.mock('@/lib/notifications', () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
}))

// Mock useAuth — returns { user } controlled by test
let mockUser: { id: string } | null = null

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// Mock Supabase realtime — capture the callback so tests can invoke it
type RealtimeCallback = (payload: { eventType: string; new?: unknown; old?: unknown }) => void

let realtimeCallback: RealtimeCallback | null = null
const mockUnsubscribe = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: (_event: string, _opts: unknown, cb: RealtimeCallback) => {
        realtimeCallback = cb
        return {
          subscribe: () => ({
            unsubscribe: mockUnsubscribe,
          }),
        }
      },
    }),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

// --- Helpers -----------------------------------------------------------------

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'notif-1',
    user_id: 'user-123',
    type: 'party_invite',
    title: 'You are invited',
    body: null,
    data: null,
    read: false,
    created_at: '2026-02-27T00:00:00Z',
    ...overrides,
  }
}

// --- Tests -------------------------------------------------------------------

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    realtimeCallback = null
    mockUser = null

    mockGetNotifications.mockResolvedValue([])
    mockMarkAsRead.mockResolvedValue({ error: null })
    mockMarkAllAsRead.mockResolvedValue({ error: null })
  })

  // ---------- Initial state --------------------------------------------------

  describe('initial state', () => {
    it('starts with empty notifications and loading=false when no user', async () => {
      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      expect(result.current.notifications).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.unreadCount).toBe(0)
      expect(result.current.isOpen).toBe(false)
    })
  })

  // ---------- Fetch on mount when user exists --------------------------------

  describe('fetch on mount', () => {
    it('fetches notifications when user is present', async () => {
      mockUser = { id: 'user-123' }
      const notifs = [makeNotification({ id: 'n1', read: false }), makeNotification({ id: 'n2', read: true })]
      mockGetNotifications.mockResolvedValue(notifs)

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetNotifications).toHaveBeenCalled()
      expect(result.current.notifications).toEqual(notifs)
    })

    it('sets loading=false after fetch completes', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([])

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('does not fetch when no user', async () => {
      mockUser = null

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      renderHook(() => useNotifications())

      // Give it a tick
      await act(async () => {})

      expect(mockGetNotifications).not.toHaveBeenCalled()
    })

    it('handles fetch failure gracefully', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockRejectedValue(new Error('Network error'))

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should have empty notifications, no throw
      expect(result.current.notifications).toEqual([])
    })
  })

  // ---------- unreadCount ----------------------------------------------------

  describe('unreadCount', () => {
    it('counts only unread notifications', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([
        makeNotification({ id: 'n1', read: false }),
        makeNotification({ id: 'n2', read: false }),
        makeNotification({ id: 'n3', read: true }),
      ])

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2)
      })
    })
  })

  // ---------- markAsRead -----------------------------------------------------

  describe('markAsRead', () => {
    it('optimistically marks a notification as read', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([
        makeNotification({ id: 'n1', read: false }),
        makeNotification({ id: 'n2', read: false }),
      ])

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2)
      })

      await act(async () => {
        await result.current.markAsRead('n1')
      })

      expect(result.current.unreadCount).toBe(1)
      expect(result.current.notifications.find((n) => n.id === 'n1')?.read).toBe(true)
      expect(mockMarkAsRead).toHaveBeenCalledWith('n1')
    })

    it('reverts optimistic update on API failure', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([makeNotification({ id: 'n1', read: false })])
      mockMarkAsRead.mockResolvedValue({ error: 'Server error' })

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1)
      })

      await act(async () => {
        await result.current.markAsRead('n1')
      })

      // Reverted — still unread
      expect(result.current.notifications.find((n) => n.id === 'n1')?.read).toBe(false)
      expect(result.current.unreadCount).toBe(1)
    })

    it('skips update for already-read notification', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([makeNotification({ id: 'n1', read: true })])

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1)
      })

      await act(async () => {
        await result.current.markAsRead('n1')
      })

      expect(result.current.notifications.find((n) => n.id === 'n1')?.read).toBe(true)
      expect(mockMarkAsRead).toHaveBeenCalledWith('n1')
    })
  })

  // ---------- markAllAsRead --------------------------------------------------

  describe('markAllAsRead', () => {
    it('optimistically marks all notifications as read', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([
        makeNotification({ id: 'n1', read: false }),
        makeNotification({ id: 'n2', read: false }),
      ])

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2)
      })

      await act(async () => {
        await result.current.markAllAsRead()
      })

      expect(result.current.unreadCount).toBe(0)
      expect(result.current.notifications.every((n) => n.read)).toBe(true)
      expect(mockMarkAllAsRead).toHaveBeenCalled()
    })

    it('reverts all on API failure', async () => {
      mockUser = { id: 'user-123' }
      const original = [makeNotification({ id: 'n1', read: false }), makeNotification({ id: 'n2', read: false })]
      mockGetNotifications.mockResolvedValue(original)

      // Use a deferred promise so we can control when markAllAsRead resolves.
      // This lets React commit the optimistic update (all read=true) before
      // we resolve with an error, ensuring previousNotifications is captured.
      let resolveMarkAll: (value: { error: string }) => void
      mockMarkAllAsRead.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMarkAll = resolve
          }),
      )

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2)
      })

      // Start markAllAsRead — this will optimistically set all as read
      // but the API call won't resolve yet
      let markAllPromise: Promise<void>
      act(() => {
        markAllPromise = result.current.markAllAsRead()
      })

      // Verify optimistic update happened
      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0)
      })

      // Now resolve the API with an error — should trigger revert
      await act(async () => {
        resolveMarkAll!({ error: 'Server error' })
        await markAllPromise!
      })

      // Reverted after API error
      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2)
      })
      expect(result.current.notifications.every((n) => !n.read)).toBe(true)
    })
  })

  // ---------- isOpen/setIsOpen -----------------------------------------------

  describe('isOpen toggle', () => {
    it('toggles isOpen state', async () => {
      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.setIsOpen(true)
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.setIsOpen(false)
      })

      expect(result.current.isOpen).toBe(false)
    })
  })

  // ---------- Realtime events ------------------------------------------------

  describe('realtime subscriptions', () => {
    it('adds notification on INSERT', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([])

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newNotif = makeNotification({ id: 'realtime-1', title: 'New invite' })

      act(() => {
        realtimeCallback?.({ eventType: 'INSERT', new: newNotif })
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0].id).toBe('realtime-1')
      expect(result.current.unreadCount).toBe(1)
    })

    it('updates notification on UPDATE', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([makeNotification({ id: 'n1', read: false, title: 'Original' })])

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1)
      })

      act(() => {
        realtimeCallback?.({
          eventType: 'UPDATE',
          new: makeNotification({ id: 'n1', read: true, title: 'Updated' }),
        })
      })

      expect(result.current.notifications[0].title).toBe('Updated')
      expect(result.current.notifications[0].read).toBe(true)
      expect(result.current.unreadCount).toBe(0)
    })

    it('removes notification on DELETE', async () => {
      mockUser = { id: 'user-123' }
      mockGetNotifications.mockResolvedValue([makeNotification({ id: 'n1' }), makeNotification({ id: 'n2' })])

      vi.resetModules()
      const { useNotifications } = await import('./useNotifications')

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2)
      })

      act(() => {
        realtimeCallback?.({ eventType: 'DELETE', old: { id: 'n1' } })
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0].id).toBe('n2')
    })
  })
})
