import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

// --- Supabase chain mock pattern ---
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockGetUser = vi.fn()

function createChain(terminal: Mock) {
  const chain: Record<string, Mock> = {}
  const handler = () => chain
  chain.select = vi.fn(handler)
  chain.eq = vi.fn(handler)
  chain.single = terminal
  chain.maybeSingle = terminal
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'parties') return createChain(mockSingle)
      return createChain(mockMaybeSingle)
    }),
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(),
}))

import {
  createServiceClient,
  getCallerIdentity,
  validateParty,
  validateMembership,
  parseAndValidateRequest,
} from './apiHelpers'
import { validateOrigin } from '@/lib/csrf'
import type { SupabaseClient } from '@supabase/supabase-js'

const savedEnv = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

afterEach(() => {
  process.env = { ...savedEnv }
})

// --- Helpers ---

function mockRequest(options: { authorization?: string; body?: unknown; origin?: string } = {}): NextRequest {
  const headers: Record<string, string> = {}
  if (options.authorization) headers['authorization'] = options.authorization
  if (options.origin) headers['origin'] = options.origin

  const req = {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    json:
      options.body !== undefined
        ? vi.fn().mockResolvedValue(options.body)
        : vi.fn().mockRejectedValue(new Error('No body')),
  } as unknown as NextRequest

  return req
}

function mockSupabaseClient(overrides: Record<string, unknown> = {}): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      if (table === 'parties') return createChain(mockSingle)
      return createChain(mockMaybeSingle)
    }),
    auth: { getUser: mockGetUser },
    ...overrides,
  } as unknown as SupabaseClient
}

// --- Tests ---

describe('apiHelpers', () => {
  describe('createServiceClient', () => {
    it('returns supabase client when env vars are set', () => {
      const result = createServiceClient()
      expect(result.error).toBeUndefined()
      expect(result.supabase).toBeDefined()
    })

    it('returns error response when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      const result = createServiceClient()
      expect(result.supabase).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('Server configuration error')
      expect(result.error!.status).toBe(500)
    })

    it('returns error response when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      const result = createServiceClient()
      expect(result.supabase).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('Server configuration error')
      expect(result.error!.status).toBe(500)
    })
  })

  describe('getCallerIdentity', () => {
    it('returns userId + sessionId when Bearer token is valid', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
      const req = mockRequest({ authorization: 'Bearer valid-token' })
      const supabase = mockSupabaseClient()

      const result = await getCallerIdentity(req, supabase, 'session-abc')
      expect(result).toEqual({ userId: 'user-123', sessionId: 'session-abc' })
      expect(mockGetUser).toHaveBeenCalledWith('valid-token')
    })

    it('returns only sessionId when no Authorization header', async () => {
      const req = mockRequest({})
      const supabase = mockSupabaseClient()

      const result = await getCallerIdentity(req, supabase, 'session-abc')
      expect(result).toEqual({ sessionId: 'session-abc' })
      expect(mockGetUser).not.toHaveBeenCalled()
    })

    it('returns only sessionId when Authorization header is not Bearer', async () => {
      const req = mockRequest({ authorization: 'Basic dXNlcjpwYXNz' })
      const supabase = mockSupabaseClient()

      const result = await getCallerIdentity(req, supabase, 'session-abc')
      expect(result).toEqual({ sessionId: 'session-abc' })
      expect(mockGetUser).not.toHaveBeenCalled()
    })

    it('returns only sessionId when getUser returns no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const req = mockRequest({ authorization: 'Bearer bad-token' })
      const supabase = mockSupabaseClient()

      const result = await getCallerIdentity(req, supabase, 'session-abc')
      expect(result).toEqual({ sessionId: 'session-abc' })
    })

    it('returns only sessionId when getUser throws', async () => {
      mockGetUser.mockRejectedValue(new Error('Token expired'))
      const req = mockRequest({ authorization: 'Bearer expired-token' })
      const supabase = mockSupabaseClient()

      const result = await getCallerIdentity(req, supabase, 'session-abc')
      expect(result).toEqual({ sessionId: 'session-abc' })
    })
  })

  describe('validateParty', () => {
    it('returns party when found and not expired', async () => {
      const futureDate = new Date(Date.now() + 86_400_000).toISOString()
      mockSingle.mockResolvedValue({ data: { id: 'party-1', expires_at: futureDate }, error: null })
      const supabase = mockSupabaseClient()

      const result = await validateParty(supabase, 'party-1')
      expect(result.error).toBeUndefined()
      expect(result.party).toEqual({ id: 'party-1', expires_at: futureDate })
    })

    it('returns 404 error when party not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
      const supabase = mockSupabaseClient()

      const result = await validateParty(supabase, 'no-such-party')
      expect(result.party).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('Party not found')
      expect(result.error!.status).toBe(404)
    })

    it('returns 410 error when party is expired', async () => {
      const pastDate = new Date(Date.now() - 86_400_000).toISOString()
      mockSingle.mockResolvedValue({ data: { id: 'party-old', expires_at: pastDate }, error: null })
      const supabase = mockSupabaseClient()

      const result = await validateParty(supabase, 'party-old')
      expect(result.party).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('This party has expired')
      expect(result.error!.status).toBe(410)
    })
  })

  describe('validateMembership', () => {
    it('returns member when found by userId', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null })
      const supabase = mockSupabaseClient()

      const result = await validateMembership(supabase, 'party-1', { userId: 'user-123', sessionId: 'sess-1' })
      expect(result.error).toBeUndefined()
      expect(result.member).toEqual({ id: 'member-1' })
    })

    it('returns member when found by sessionId (no userId)', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { id: 'member-2' }, error: null })
      const supabase = mockSupabaseClient()

      const result = await validateMembership(supabase, 'party-1', { sessionId: 'sess-anon' })
      expect(result.error).toBeUndefined()
      expect(result.member).toEqual({ id: 'member-2' })
    })

    it('returns 500 error when query errors', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
      const supabase = mockSupabaseClient()

      const result = await validateMembership(supabase, 'party-1', { userId: 'user-123' })
      expect(result.member).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('Failed to verify membership')
      expect(result.error!.status).toBe(500)
    })

    it('returns 403 error when member not found', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })
      const supabase = mockSupabaseClient()

      const result = await validateMembership(supabase, 'party-1', { sessionId: 'unknown-sess' })
      expect(result.member).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('You must be a member of this party')
      expect(result.error!.status).toBe(403)
    })
  })

  describe('parseAndValidateRequest', () => {
    it('returns 403 when CSRF origin check fails', async () => {
      ;(validateOrigin as Mock).mockReturnValue(false)
      const req = mockRequest({ body: { foo: 'bar' } })
      const validate = vi.fn()

      const result = await parseAndValidateRequest(req, validate)
      expect(result.body).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('Forbidden')
      expect(result.error!.status).toBe(403)
      expect(validate).not.toHaveBeenCalled()
    })

    it('returns 400 when JSON body is invalid', async () => {
      ;(validateOrigin as Mock).mockReturnValue(true)
      const req = mockRequest() // no body = json() rejects
      const validate = vi.fn()

      const result = await parseAndValidateRequest(req, validate)
      expect(result.body).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('Invalid JSON body')
      expect(result.error!.status).toBe(400)
      expect(validate).not.toHaveBeenCalled()
    })

    it('returns 400 when validation function returns error', async () => {
      ;(validateOrigin as Mock).mockReturnValue(true)
      const req = mockRequest({ body: { name: '' } })
      const validate = vi.fn().mockReturnValue('Name is required')

      const result = await parseAndValidateRequest(req, validate)
      expect(result.body).toBeUndefined()
      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toBe('Name is required')
      expect(result.error!.status).toBe(400)
    })

    it('returns parsed body when validation passes', async () => {
      ;(validateOrigin as Mock).mockReturnValue(true)
      const requestBody = { name: 'Test', partyId: 'p-1' }
      const req = mockRequest({ body: requestBody })
      const validate = vi.fn().mockReturnValue(null)

      const result = await parseAndValidateRequest(req, validate)
      expect(result.error).toBeUndefined()
      expect(result.body).toEqual(requestBody)
      expect(validate).toHaveBeenCalledWith(requestBody)
    })
  })
})
