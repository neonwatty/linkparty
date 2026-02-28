import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock exchangeCodeForSession
const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ data: {}, error: null })

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

import { GET } from './route'

describe('auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to / by default when no redirect param', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?code=abc123')
    const response = await GET(request)
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/')
  })

  it('redirects to valid relative path', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?code=abc123&redirect=/party/123')
    const response = await GET(request)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/party/123')
  })

  it('blocks absolute URL redirect (open redirect)', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?code=abc123&redirect=https://evil.com')
    const response = await GET(request)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/')
  })

  it('blocks protocol-relative URL redirect (//evil.com)', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?code=abc123&redirect=//evil.com')
    const response = await GET(request)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/')
  })

  it('blocks javascript: scheme redirect', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?code=abc123&redirect=javascript:alert(1)')
    const response = await GET(request)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/')
  })

  it('exchanges code for session when code param is present', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?code=abc123')
    await GET(request)
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123')
  })

  it('does not exchange code when code param is missing', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?redirect=/home')
    await GET(request)
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })
})
