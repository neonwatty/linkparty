import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUpsert = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  })),
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
}))

const mockSendWaitlistConfirmation = vi.fn()
vi.mock('@/lib/email/waitlistConfirmation', () => ({
  sendWaitlistConfirmation: (...args: unknown[]) => mockSendWaitlistConfirmation(...args),
}))

const originalEnv = process.env

describe('Waitlist API Route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      RESEND_API_KEY: 're_test',
    }
    mockUpsert.mockResolvedValue({ data: [{ id: 'uuid-1' }], error: null })
    mockSendWaitlistConfirmation.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function makeRequest(body: Record<string, unknown>, ip = '127.0.0.1') {
    return new NextRequest('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(body),
    })
  }

  it('accepts valid email and returns success', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'test@gmail.com' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('rejects invalid email', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('rejects empty email', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: '' }))
    expect(res.status).toBe(400)
  })

  it('trims and lowercases email', async () => {
    const { POST } = await import('./route')
    await POST(makeRequest({ email: '  Test@Gmail.COM  ' }))
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@gmail.com' }), expect.anything())
  })

  it('rejects disposable emails', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'test@mailinator.com' }))
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toContain('disposable')
  })

  it('sends confirmation email on success', async () => {
    const { POST } = await import('./route')
    await POST(makeRequest({ email: 'test@gmail.com', name: 'Alice' }))
    expect(mockSendWaitlistConfirmation).toHaveBeenCalledWith('test@gmail.com', 'Alice')
  })

  it('rate limits by IP after 5 requests', async () => {
    const { POST } = await import('./route')
    const sameIp = '1.2.3.4'
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ email: `user${i}@gmail.com` }, sameIp))
      expect(res.status).toBe(200)
    }
    const res = await POST(makeRequest({ email: 'user5@gmail.com' }, sameIp))
    expect(res.status).toBe(429)
  })

  it('rate limits by email after 3 requests', async () => {
    const { POST } = await import('./route')
    for (let i = 0; i < 3; i++) {
      const res = await POST(makeRequest({ email: 'same@gmail.com' }, `10.0.0.${i}`))
      expect(res.status).toBe(200)
    }
    const res = await POST(makeRequest({ email: 'same@gmail.com' }, '10.0.0.99'))
    expect(res.status).toBe(429)
  })
})
