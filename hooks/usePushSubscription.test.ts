import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const mockGetExistingSubscription = vi.fn()
const mockSubscribeToPush = vi.fn()
const mockUnsubscribeFromPush = vi.fn()

vi.mock('@/lib/webPushClient', () => ({
  getExistingSubscription: (...args: unknown[]) => mockGetExistingSubscription(...args),
  subscribeToPush: (...args: unknown[]) => mockSubscribeToPush(...args),
  unsubscribeFromPush: (...args: unknown[]) => mockUnsubscribeFromPush(...args),
}))

vi.mock('@/lib/supabase', () => ({
  getSessionId: () => 'test-session-id',
}))

describe('usePushSubscription', () => {
  const originalPushManager = window.PushManager

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'PushManager', {
      value: function PushManager() {},
      writable: true,
      configurable: true,
    })
    mockGetExistingSubscription.mockResolvedValue(null)
    ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
  })

  afterEach(() => {
    Object.defineProperty(window, 'PushManager', {
      value: originalPushManager,
      writable: true,
      configurable: true,
    })
  })

  describe('Initial State', () => {
    it('isSupported true when serviceWorker and PushManager exist', async () => {
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())
      expect(result.current.isSupported).toBe(true)
    })

    it('isSupported false when PushManager missing', async () => {
      // Remove PushManager before rendering
      // @ts-expect-error -- intentionally deleting for test
      delete window.PushManager

      // Need fresh module to re-evaluate getInitialSupported
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())
      expect(result.current.isSupported).toBe(false)
    })

    it('isDismissed false when localStorage has no key', async () => {
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())
      expect(result.current.isDismissed).toBe(false)
    })

    it('isDismissed true when localStorage has "true"', async () => {
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('true')
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())
      expect(result.current.isDismissed).toBe(true)
    })
  })

  describe('Mount Effect', () => {
    it('sets isSubscribed=true when existing subscription found', async () => {
      mockGetExistingSubscription.mockResolvedValue({ endpoint: 'https://push.example.com' })
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())

      await waitFor(() => {
        expect(result.current.isSubscribed).toBe(true)
      })
      expect(mockGetExistingSubscription).toHaveBeenCalled()
    })

    it('sets isSubscribed=false when no subscription', async () => {
      mockGetExistingSubscription.mockResolvedValue(null)
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())

      await waitFor(() => {
        expect(mockGetExistingSubscription).toHaveBeenCalled()
      })
      expect(result.current.isSubscribed).toBe(false)
    })
  })

  describe('subscribe()', () => {
    it('sets isSubscribed=true on success', async () => {
      mockSubscribeToPush.mockResolvedValue(true)
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.subscribe()
      })

      expect(success).toBe(true)
      expect(result.current.isSubscribed).toBe(true)
      expect(mockSubscribeToPush).toHaveBeenCalledWith('test-session-id')
    })

    it('keeps isSubscribed unchanged on failure', async () => {
      mockSubscribeToPush.mockResolvedValue(false)
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.subscribe()
      })

      expect(success).toBe(false)
      expect(result.current.isSubscribed).toBe(false)
    })
  })

  describe('unsubscribe()', () => {
    it('sets isSubscribed=false on success', async () => {
      mockGetExistingSubscription.mockResolvedValue({ endpoint: 'https://push.example.com' })
      mockUnsubscribeFromPush.mockResolvedValue(true)
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())

      await waitFor(() => {
        expect(result.current.isSubscribed).toBe(true)
      })

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.unsubscribe()
      })

      expect(success).toBe(true)
      expect(result.current.isSubscribed).toBe(false)
      expect(mockUnsubscribeFromPush).toHaveBeenCalledWith('test-session-id')
    })
  })

  describe('dismiss()', () => {
    it('sets localStorage and isDismissed=true', async () => {
      vi.resetModules()
      const { usePushSubscription } = await import('./usePushSubscription')
      const { result } = renderHook(() => usePushSubscription())

      expect(result.current.isDismissed).toBe(false)

      act(() => {
        result.current.dismiss()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('link-party-push-dismissed', 'true')
      expect(result.current.isDismissed).toBe(true)
    })
  })
})
