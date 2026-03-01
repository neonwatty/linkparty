import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock @supabase/ssr
const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

const originalEnv = { ...process.env }

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  async function runMiddleware(url: string, cookies: Array<{ name: string; value: string }> = []) {
    const { middleware } = await import('@/middleware')
    const request = new NextRequest(new URL(url, 'http://localhost:3000'))
    for (const cookie of cookies) {
      request.cookies.set(cookie.name, cookie.value)
    }
    return middleware(request)
  }

  describe('public routes', () => {
    it('allows /login without auth', async () => {
      const response = await runMiddleware('http://localhost:3000/login')
      expect(response.status).toBe(200)
    })

    it('allows /signup without auth', async () => {
      const response = await runMiddleware('http://localhost:3000/signup')
      expect(response.status).toBe(200)
    })

    it('allows /reset-password without auth', async () => {
      const response = await runMiddleware('http://localhost:3000/reset-password')
      expect(response.status).toBe(200)
    })

    it('allows /auth/callback without auth', async () => {
      const response = await runMiddleware('http://localhost:3000/auth/callback')
      expect(response.status).toBe(200)
    })
  })

  describe('static assets and internals', () => {
    it('allows /_next paths', async () => {
      const response = await runMiddleware('http://localhost:3000/_next/static/chunk.js')
      expect(response.status).toBe(200)
    })

    it('allows /api paths', async () => {
      const response = await runMiddleware('http://localhost:3000/api/queue/items')
      expect(response.status).toBe(200)
    })

    it('allows /favicon paths', async () => {
      const response = await runMiddleware('http://localhost:3000/favicon.ico')
      expect(response.status).toBe(200)
    })

    it('allows paths with file extensions', async () => {
      const response = await runMiddleware('http://localhost:3000/robots.txt')
      expect(response.status).toBe(200)
    })
  })

  describe('mock mode (no Supabase URL)', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    })

    it('redirects to /login when no auth cookie in mock mode', async () => {
      const response = await runMiddleware('http://localhost:3000/party/123')
      expect(response.status).toBe(307)
      const location = response.headers.get('location')!
      expect(new URL(location).pathname).toBe('/login')
    })

    it('passes redirect param to login in mock mode', async () => {
      const response = await runMiddleware('http://localhost:3000/party/123')
      const location = new URL(response.headers.get('location')!)
      expect(location.searchParams.get('redirect')).toBe('/party/123')
    })

    it('allows request when auth-token cookie exists in mock mode', async () => {
      const response = await runMiddleware('http://localhost:3000/party/123', [
        { name: 'sb-test-auth-token', value: 'mock-session' },
      ])
      expect(response.status).toBe(200)
    })
  })

  describe('CI mode (fake auth)', () => {
    beforeEach(() => {
      process.env.CI = 'true'
    })

    it('allows request when mock-auth-token cookie exists in CI', async () => {
      const response = await runMiddleware('http://localhost:3000/party/123', [
        { name: 'mock-auth-token', value: 'fake' },
      ])
      expect(response.status).toBe(200)
    })

    it('does not allow mock-auth-token outside CI', async () => {
      delete process.env.CI
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const response = await runMiddleware('http://localhost:3000/party/123', [
        { name: 'mock-auth-token', value: 'fake' },
      ])
      expect(response.status).toBe(307)
    })
  })

  describe('Supabase auth check', () => {
    it('redirects to /login when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const response = await runMiddleware('http://localhost:3000/party/123')
      expect(response.status).toBe(307)
      const location = new URL(response.headers.get('location')!)
      expect(location.pathname).toBe('/login')
      expect(location.searchParams.get('redirect')).toBe('/party/123')
    })

    it('allows request when user is authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const response = await runMiddleware('http://localhost:3000/party/123')
      expect(response.status).toBe(200)
    })

    it('preserves query params in redirect', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const response = await runMiddleware('http://localhost:3000/history?page=2')
      const location = new URL(response.headers.get('location')!)
      expect(location.searchParams.get('redirect')).toBe('/history?page=2')
    })
  })

  describe('config', () => {
    it('exports matcher config', async () => {
      const mod = await import('@/middleware')
      expect(mod.config).toBeDefined()
      expect(mod.config.matcher).toEqual(['/((?!_next/static|_next/image|favicon.ico).*)'])
    })
  })
})
