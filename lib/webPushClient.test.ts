import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('./logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}))

import { supabase } from './supabase'
import { urlBase64ToUint8Array, getExistingSubscription, subscribeToPush, unsubscribeFromPush } from './webPushClient'

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>

function createMockSubscription(overrides: Partial<PushSubscription> = {}): PushSubscription {
  return {
    endpoint: 'https://push.example.com/sub/abc123',
    expirationTime: null,
    options: { userVisibleOnly: true, applicationServerKey: null },
    getKey: vi.fn(),
    toJSON: vi
      .fn()
      .mockReturnValue({ endpoint: 'https://push.example.com/sub/abc123', keys: { p256dh: 'key', auth: 'auth' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as PushSubscription
}

function setupServiceWorkerAndPushManager(subscription: PushSubscription | null = null) {
  const mockPushManager = {
    getSubscription: vi.fn().mockResolvedValue(subscription),
    subscribe: vi.fn().mockResolvedValue(createMockSubscription()),
  }
  const mockRegistration = { pushManager: mockPushManager }

  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve(mockRegistration) },
    writable: true,
    configurable: true,
  })
  Object.defineProperty(window, 'PushManager', {
    value: class PushManager {},
    writable: true,
    configurable: true,
  })

  return { mockPushManager, mockRegistration }
}

function cleanupBrowserAPIs() {
  // @ts-expect-error — cleaning up test-defined property
  delete navigator.serviceWorker
  // @ts-expect-error — cleaning up test-defined property
  delete window.PushManager
  // @ts-expect-error — cleaning up test-defined property
  delete globalThis.Notification
}

describe('webPushClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    cleanupBrowserAPIs()
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  })

  describe('urlBase64ToUint8Array', () => {
    it('converts base64url string to correct Uint8Array', () => {
      // "hello" in base64url is "aGVsbG8" (standard base64: "aGVsbG8=")
      const result = urlBase64ToUint8Array('aGVsbG8')
      expect(result).toBeInstanceOf(Uint8Array)
      expect(Array.from(result)).toEqual([104, 101, 108, 108, 111])
    })

    it('handles input needing padding (length % 4 != 0)', () => {
      // base64url for "AB" is "QUI" (3 chars, needs 1 pad char)
      const result = urlBase64ToUint8Array('QUI')
      expect(Array.from(result)).toEqual([65, 66])
    })

    it('handles empty string', () => {
      const result = urlBase64ToUint8Array('')
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(0)
    })
  })

  describe('getExistingSubscription', () => {
    it('returns null when serviceWorker not in navigator', async () => {
      // serviceWorker not defined — default jsdom state
      const result = await getExistingSubscription()
      expect(result).toBeNull()
    })

    it('returns null when PushManager not in window', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({}) },
        writable: true,
        configurable: true,
      })
      // PushManager not defined
      const result = await getExistingSubscription()
      expect(result).toBeNull()
    })

    it('returns null when no existing subscription', async () => {
      setupServiceWorkerAndPushManager(null)
      const result = await getExistingSubscription()
      expect(result).toBeNull()
    })

    it('returns the subscription when one exists', async () => {
      const mockSub = createMockSubscription()
      setupServiceWorkerAndPushManager(mockSub)
      const result = await getExistingSubscription()
      expect(result).toBe(mockSub)
    })

    it('returns null and logs when getSubscription throws', async () => {
      const mockPushManager = {
        getSubscription: vi.fn().mockRejectedValue(new Error('SW error')),
      }
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ pushManager: mockPushManager }) },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(window, 'PushManager', {
        value: class PushManager {},
        writable: true,
        configurable: true,
      })

      const result = await getExistingSubscription()
      expect(result).toBeNull()
    })
  })

  describe('subscribeToPush', () => {
    it('returns false when VAPID key env var is missing', async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      const result = await subscribeToPush('session-1')
      expect(result).toBe(false)
    })

    it('returns false when notification permission is denied', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'dGVzdC12YXBpZC1rZXk'
      globalThis.Notification = {
        requestPermission: vi.fn().mockResolvedValue('denied'),
      } as unknown as typeof Notification

      const result = await subscribeToPush('session-1')
      expect(result).toBe(false)
    })

    it('returns true on full success (permission + subscribe + server POST)', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'dGVzdC12YXBpZC1rZXk'
      globalThis.Notification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      } as unknown as typeof Notification
      setupServiceWorkerAndPushManager()
      mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

      const result = await subscribeToPush('session-1')
      expect(result).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/push/subscribe',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
        }),
      )
    })

    it('returns false when server POST responds with non-ok status', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'dGVzdC12YXBpZC1rZXk'
      globalThis.Notification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      } as unknown as typeof Notification
      setupServiceWorkerAndPushManager()
      mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue('Server error'),
      })

      const result = await subscribeToPush('session-1')
      expect(result).toBe(false)
    })

    it('returns false when no auth session exists', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'dGVzdC12YXBpZC1rZXk'
      globalThis.Notification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      } as unknown as typeof Notification
      setupServiceWorkerAndPushManager()
      mockGetSession.mockResolvedValue({ data: { session: null } })

      const result = await subscribeToPush('session-1')
      expect(result).toBe(false)
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })
  })

  describe('unsubscribeFromPush', () => {
    it('unsubscribes and sends DELETE, returns true', async () => {
      const mockSub = createMockSubscription()
      setupServiceWorkerAndPushManager(mockSub)
      mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-456' } } })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

      const result = await unsubscribeFromPush('session-2')
      expect(result).toBe(true)
      expect(mockSub.unsubscribe).toHaveBeenCalled()
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/push/subscribe',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer tok-456' }),
        }),
      )
    })

    it('handles no existing subscription gracefully', async () => {
      // No serviceWorker defined — getExistingSubscription returns null
      mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-789' } } })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

      const result = await unsubscribeFromPush('session-3')
      expect(result).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/push/subscribe',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('returns false when no auth session exists', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })

      const result = await unsubscribeFromPush('session-4')
      expect(result).toBe(false)
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })
  })
})
