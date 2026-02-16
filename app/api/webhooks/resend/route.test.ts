import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { webcrypto } from 'node:crypto'

// Convert jsdom-realm ArrayBuffer/TypedArray to Node.js-realm Buffer.
// jsdom creates objects in its own JS realm; Node.js webcrypto.subtle rejects
// cross-realm ArrayBuffers (instanceof check fails). Buffer.from() creates
// objects in Node.js's realm that webcrypto accepts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNodeArrayBuffer(data: any): ArrayBuffer {
  const buf =
    data instanceof ArrayBuffer
      ? Buffer.from(new Uint8Array(data))
      : ArrayBuffer.isView(data)
        ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
        : Buffer.from(data)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

// Polyfill crypto.subtle for jsdom environment (used by both test helpers and the route under test).
// Wraps importKey and sign to convert jsdom-realm buffers to Node.js-realm buffers.
const originalImportKey = webcrypto.subtle.importKey.bind(webcrypto.subtle)
const originalSign = webcrypto.subtle.sign.bind(webcrypto.subtle)

Object.defineProperty(globalThis, 'crypto', {
  value: {
    ...globalThis.crypto,
    subtle: {
      ...webcrypto.subtle,
      importKey: (...args: Parameters<typeof webcrypto.subtle.importKey>) => {
        const [format, keyData, ...rest] = args
        if (format === 'raw') {
          return originalImportKey(format, toNodeArrayBuffer(keyData as BufferSource), ...rest)
        }
        return originalImportKey(...args)
      },
      sign: (...args: Parameters<typeof webcrypto.subtle.sign>) => {
        const [algorithm, key, data] = args
        return originalSign(algorithm, key, toNodeArrayBuffer(data))
      },
    },
    randomUUID: () => 'test-uuid-1234',
  },
  writable: true,
})

// Mock Supabase
const mockInsert = vi.fn(() => Promise.resolve({ error: null as null | { message: string } }))
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// Store original env
const originalEnv = process.env

// Helper to compute HMAC-SHA256 signature for webhook verification
async function computeSignature(secret: string, svixId: string, timestamp: string, payload: string): Promise<string> {
  const secretBuffer = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const signedContent = `${svixId}.${timestamp}.${payload}`

  const key = await webcrypto.subtle.importKey('raw', secretBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signatureBytes = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  return `v1,${Buffer.from(new Uint8Array(signatureBytes)).toString('base64')}`
}

// A known base64-encoded secret for testing
const TEST_SECRET = 'whsec_dGVzdHNlY3JldGtleWZvcnNpZ25pbmc='

describe('Resend Webhook API Route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      RESEND_WEBHOOK_SECRET: TEST_SECRET,
    }
    mockInsert.mockReturnValue(Promise.resolve({ error: null }))
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  const sampleEvent = {
    type: 'email.sent',
    created_at: '2026-02-09T12:00:00.000Z',
    data: {
      email_id: 'email-abc-123',
      from: 'noreply@linkparty.com',
      to: ['guest@example.com'],
      subject: 'You are invited to Test Party',
      created_at: '2026-02-09T12:00:00.000Z',
    },
  }

  const createSignedRequest = async (payload: string) => {
    const svixId = 'msg_test123'
    const svixTimestamp = String(Math.floor(Date.now() / 1000))
    const signature = await computeSignature(TEST_SECRET, svixId, svixTimestamp, payload)

    return new NextRequest('http://localhost:3000/api/webhooks/resend', {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': signature,
      },
    })
  }

  describe('Signature Verification', () => {
    it('returns 401 when RESEND_WEBHOOK_SECRET is not configured', async () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        RESEND_WEBHOOK_SECRET: undefined,
      }
      const { POST } = await import('./route')
      const payload = JSON.stringify(sampleEvent)
      const request = new NextRequest('http://localhost:3000/api/webhooks/resend', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'svix-id': 'msg_test123',
          'svix-timestamp': String(Math.floor(Date.now() / 1000)),
          'svix-signature': 'v1,fakesignature',
        },
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Invalid signature')
    })

    it('returns 401 when svix headers are missing', async () => {
      const { POST } = await import('./route')
      const payload = JSON.stringify(sampleEvent)
      const request = new NextRequest('http://localhost:3000/api/webhooks/resend', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Invalid signature')
    })

    it('returns 401 when signature does not match', async () => {
      const { POST } = await import('./route')
      const payload = JSON.stringify(sampleEvent)
      const request = new NextRequest('http://localhost:3000/api/webhooks/resend', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'svix-id': 'msg_test123',
          'svix-timestamp': String(Math.floor(Date.now() / 1000)),
          'svix-signature': 'v1,aW52YWxpZHNpZ25hdHVyZQ==',
        },
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Invalid signature')
    })

    it('returns 401 when timestamp is too old (replay attack)', async () => {
      const { POST } = await import('./route')
      const payload = JSON.stringify(sampleEvent)
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600) // 10 minutes ago
      const svixId = 'msg_test123'
      const signature = await computeSignature(TEST_SECRET, svixId, oldTimestamp, payload)

      const request = new NextRequest('http://localhost:3000/api/webhooks/resend', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'svix-id': svixId,
          'svix-timestamp': oldTimestamp,
          'svix-signature': signature,
        },
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Invalid signature')
    })
  })

  describe('Event Processing', () => {
    it('processes email.sent event and returns 200', async () => {
      const { POST } = await import('./route')
      const payload = JSON.stringify(sampleEvent)
      const request = await createSignedRequest(payload)
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.received).toBe(true)
    })

    it('processes email.bounced event and logs to database', async () => {
      const { POST } = await import('./route')
      const bouncedEvent = {
        type: 'email.bounced',
        created_at: '2026-02-09T12:00:00.000Z',
        data: {
          email_id: 'email-bounce-456',
          from: 'noreply@linkparty.com',
          to: ['invalid@example.com'],
          subject: 'You are invited to Test Party',
          created_at: '2026-02-09T12:00:00.000Z',
          bounce: {
            message: 'Mailbox does not exist',
            type: 'hard',
          },
        },
      }
      const payload = JSON.stringify(bouncedEvent)
      const request = await createSignedRequest(payload)
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.received).toBe(true)

      // Verify the event was logged to the database
      expect(mockFrom).toHaveBeenCalledWith('email_events')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'email.bounced',
          email_id: 'email-bounce-456',
          recipient: 'invalid@example.com',
          subject: 'You are invited to Test Party',
        }),
      )
    })

    it('processes email.delivered event and logs to database', async () => {
      const { POST } = await import('./route')
      const deliveredEvent = {
        type: 'email.delivered',
        created_at: '2026-02-09T12:05:00.000Z',
        data: {
          email_id: 'email-del-789',
          from: 'noreply@linkparty.com',
          to: ['guest@example.com'],
          subject: 'You are invited to Test Party',
          created_at: '2026-02-09T12:05:00.000Z',
        },
      }
      const payload = JSON.stringify(deliveredEvent)
      const request = await createSignedRequest(payload)
      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'email.delivered',
          email_id: 'email-del-789',
          recipient: 'guest@example.com',
        }),
      )
    })

    it('processes email.clicked event with click data', async () => {
      const { POST } = await import('./route')
      const clickedEvent = {
        type: 'email.clicked',
        created_at: '2026-02-09T13:00:00.000Z',
        data: {
          email_id: 'email-click-999',
          from: 'noreply@linkparty.com',
          to: ['guest@example.com'],
          subject: 'You are invited to Test Party',
          created_at: '2026-02-09T13:00:00.000Z',
          click: {
            link: 'https://linkparty.app/join?code=ABC123',
            timestamp: '2026-02-09T13:00:00.000Z',
            user_agent: 'Mozilla/5.0',
          },
        },
      }
      const payload = JSON.stringify(clickedEvent)
      const request = await createSignedRequest(payload)
      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'email.clicked',
          metadata: expect.objectContaining({
            click: expect.objectContaining({ link: 'https://linkparty.app/join?code=ABC123' }),
          }),
        }),
      )
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when request body is malformed JSON', async () => {
      const { POST } = await import('./route')
      const malformedPayload = '{ not valid json }'
      const request = await createSignedRequest(malformedPayload)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('Internal server error')
    })

    it('still returns 200 when database insert fails with non-existence error', async () => {
      mockInsert.mockReturnValueOnce(Promise.resolve({ error: { message: 'relation "email_events" does not exist' } }))
      const { POST } = await import('./route')
      const payload = JSON.stringify(sampleEvent)
      const request = await createSignedRequest(payload)
      const response = await POST(request)
      // The route logs the error but still returns 200
      expect(response.status).toBe(200)
    })

    it('still returns 200 when database insert fails with other error', async () => {
      mockInsert.mockReturnValueOnce(Promise.resolve({ error: { message: 'connection timeout' } }))
      const { POST } = await import('./route')
      const payload = JSON.stringify(sampleEvent)
      const request = await createSignedRequest(payload)
      const response = await POST(request)
      // processWebhookEvent logs error but doesn't throw, so route returns 200
      expect(response.status).toBe(200)
    })
  })
})
