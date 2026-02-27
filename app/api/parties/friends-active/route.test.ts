import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

// Terminal mocks for different table queries
const mockFriendshipsResult = vi.fn()
const mockPartyMembersResult = vi.fn()
const mockPartiesResult = vi.fn()
const mockAllMembersResult = vi.fn()
const mockProfilesResult = vi.fn()

let tableCallState: Record<string, number> = {}

function createFriendshipsChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

function createPartyMembersChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.in = vi.fn(self)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

function createPartiesChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.in = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.gt = vi.fn(self)
  chain.order = vi.fn(self)
  chain.limit = vi.fn(self)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

function createProfilesChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.in = vi.fn(self)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      const table = args[0] as string
      const count = (tableCallState[table] || 0) + 1
      tableCallState[table] = count

      if (table === 'friendships') {
        return createFriendshipsChain(mockFriendshipsResult)
      }
      if (table === 'party_members') {
        if (count === 1) {
          // First call: find friends' party memberships
          return createPartyMembersChain(mockPartyMembersResult)
        }
        // Second call: get all members for visible parties
        return createPartyMembersChain(mockAllMembersResult)
      }
      if (table === 'parties') {
        return createPartiesChain(mockPartiesResult)
      }
      if (table === 'user_profiles') {
        return createProfilesChain(mockProfilesResult)
      }
      return {}
    },
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

const originalEnv = process.env

const createRequest = (includeAuth = true) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (includeAuth) headers['Authorization'] = 'Bearer test-token'
  return new Request('http://localhost:3000/api/parties/friends-active', {
    method: 'GET',
    headers,
  })
}

describe('Friends Active Parties API', () => {
  beforeEach(() => {
    tableCallState = {}
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockFriendshipsResult.mockReturnValue({
      data: [{ friend_id: 'friend-1' }, { friend_id: 'friend-2' }],
    })
    mockPartyMembersResult.mockReturnValue({
      data: [{ party_id: 'party-A', user_id: 'friend-1' }],
    })
    mockPartiesResult.mockReturnValue({
      data: [
        {
          id: 'party-A',
          code: 'CODE1',
          name: 'Party One',
          created_at: '2026-01-01',
          expires_at: '2999-01-01',
        },
      ],
    })
    mockAllMembersResult.mockReturnValue({
      data: [
        { party_id: 'party-A', user_id: 'friend-1', display_name: 'Friend 1', is_host: true },
        { party_id: 'party-A', user_id: 'user-456', display_name: 'Guest', is_host: false },
      ],
    })
    mockProfilesResult.mockReturnValue({
      data: [{ id: 'friend-1', display_name: 'Friend Profile Name' }],
    })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest(false))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when token is invalid', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('Empty Results', () => {
    it('returns empty parties when user has no friends', async () => {
      mockFriendshipsResult.mockReturnValueOnce({ data: [] })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.parties).toEqual([])
    })

    it('returns empty parties when friends have no active parties', async () => {
      mockPartyMembersResult.mockReturnValueOnce({ data: [] })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.parties).toEqual([])
    })

    it('returns empty parties when no visible non-expired parties found', async () => {
      mockPartiesResult.mockReturnValueOnce({ data: [] })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.parties).toEqual([])
    })
  })

  describe('Successful Response', () => {
    it('returns parties with host name and member count', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.parties).toHaveLength(1)
      expect(body.parties[0]).toEqual({
        id: 'party-A',
        code: 'CODE1',
        name: 'Party One',
        hostName: 'Friend Profile Name',
        memberCount: 2,
        expiresAt: '2999-01-01',
      })
    })

    it('uses display_name from party_members when no user_profiles match', async () => {
      mockProfilesResult.mockReturnValueOnce({ data: [] })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.parties[0].hostName).toBe('Friend 1')
    })

    it('uses "Someone" when no host info available', async () => {
      mockAllMembersResult.mockReturnValueOnce({
        data: [{ party_id: 'party-A', user_id: 'user-456', display_name: 'Guest', is_host: false }],
      })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.parties[0].hostName).toBe('Someone')
    })
  })

  describe('Cache Headers', () => {
    it('sets Cache-Control header to private, max-age=30', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=30')
    })

    it('sets Cache-Control on empty results too', async () => {
      mockFriendshipsResult.mockReturnValueOnce({ data: [] })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=30')
    })
  })

  describe('Server Configuration', () => {
    it('returns empty parties when Supabase env vars are missing', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.parties).toEqual([])
    })
  })
})
