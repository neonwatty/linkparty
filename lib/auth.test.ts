import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so mock fns are available when the hoisted vi.mock factory runs
const {
  mockSignInWithOAuth,
  mockSignOut,
  mockGetSession,
  mockOnAuthStateChange,
  mockSignUp,
  mockSignInWithPassword,
  mockResetPasswordForEmail,
  mockUpdateUser,
} = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
  mockSignOut: vi.fn(),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  },
}))

vi.mock('./logger', () => ({
  logger: {
    createLogger: () => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}))

// Import after mocks are defined
import {
  signInWithGoogle,
  signOut,
  getCurrentSession,
  onAuthStateChange,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  updatePassword,
} from './auth'

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(globalThis, 'window', {
    value: { location: { origin: 'http://localhost:3000' } },
    writable: true,
    configurable: true,
  })
})

// ---------------------------------------------------------------------------
// signInWithGoogle
// ---------------------------------------------------------------------------
describe('signInWithGoogle', () => {
  it('calls signInWithOAuth with google provider and redirectTo', async () => {
    const mockData = { provider: 'google', url: 'https://accounts.google.com/...' }
    mockSignInWithOAuth.mockResolvedValue({ data: mockData, error: null })

    const result = await signInWithGoogle()

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
      },
    })
    expect(result).toEqual(mockData)
  })

  it('throws when signInWithOAuth returns an error', async () => {
    const authError = { message: 'OAuth error', code: 'oauth_error' }
    mockSignInWithOAuth.mockResolvedValue({ data: null, error: authError })

    await expect(signInWithGoogle()).rejects.toEqual(authError)
  })

  it('passes redirectTo as undefined when window is undefined', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = undefined

    const mockData = { provider: 'google', url: null }
    mockSignInWithOAuth.mockResolvedValue({ data: mockData, error: null })

    const result = await signInWithGoogle()

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: undefined,
      },
    })
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------
describe('signOut', () => {
  it('calls supabase signOut successfully', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    await expect(signOut()).resolves.toBeUndefined()
    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it('throws when signOut returns an error', async () => {
    const authError = { message: 'Sign out failed' }
    mockSignOut.mockResolvedValue({ error: authError })

    await expect(signOut()).rejects.toEqual(authError)
  })
})

// ---------------------------------------------------------------------------
// getCurrentSession
// ---------------------------------------------------------------------------
describe('getCurrentSession', () => {
  it('returns session when available', async () => {
    const mockSession = { access_token: 'abc', user: { id: '123' } }
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })

    const session = await getCurrentSession()

    expect(session).toEqual(mockSession)
  })

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const session = await getCurrentSession()

    expect(session).toBeNull()
  })

  it('returns null on error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'Session error' } })

    const session = await getCurrentSession()

    expect(session).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// onAuthStateChange
// ---------------------------------------------------------------------------
describe('onAuthStateChange', () => {
  it('registers callback and returns subscription', () => {
    const mockSubscription = { id: 'sub-1', unsubscribe: vi.fn() }
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })

    const callback = vi.fn()
    const subscription = onAuthStateChange(callback)

    expect(mockOnAuthStateChange).toHaveBeenCalledOnce()
    expect(subscription).toEqual(mockSubscription)
  })

  it('invokes callback with session when auth state changes', () => {
    const mockSubscription = { id: 'sub-1', unsubscribe: vi.fn() }
    mockOnAuthStateChange.mockImplementation((handler) => {
      // Simulate auth state change
      handler('SIGNED_IN', { access_token: 'token', user: { id: '456' } })
      return { data: { subscription: mockSubscription } }
    })

    const callback = vi.fn()
    onAuthStateChange(callback)

    expect(callback).toHaveBeenCalledWith({ access_token: 'token', user: { id: '456' } })
  })

  it('invokes callback with null session on sign out', () => {
    const mockSubscription = { id: 'sub-1', unsubscribe: vi.fn() }
    mockOnAuthStateChange.mockImplementation((handler) => {
      handler('SIGNED_OUT', null)
      return { data: { subscription: mockSubscription } }
    })

    const callback = vi.fn()
    onAuthStateChange(callback)

    expect(callback).toHaveBeenCalledWith(null)
  })
})

// ---------------------------------------------------------------------------
// signUpWithEmail
// ---------------------------------------------------------------------------
describe('signUpWithEmail', () => {
  it('returns success with needsConfirmation on successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null })

    const result = await signUpWithEmail('test@example.com', 'password123', 'Alice')

    expect(result).toEqual({ success: true, needsConfirmation: true })
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { display_name: 'Alice' },
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    })
  })

  it('includes redirect param in callback URL when redirectPath is provided', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null })

    await signUpWithEmail('test@example.com', 'password123', 'Alice', '/party/abc')

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { display_name: 'Alice' },
        emailRedirectTo: 'http://localhost:3000/auth/callback?redirect=%2Fparty%2Fabc',
      },
    })
  })

  it('passes undefined displayName when not provided', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null })

    await signUpWithEmail('test@example.com', 'password123')

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { display_name: undefined },
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    })
  })

  it('returns mapped error for user_already_exists', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered', code: 'user_already_exists' },
    })

    const result = await signUpWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'An account with this email already exists' })
  })

  it('returns mapped error for weak_password', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Password should be at least 8 characters', code: 'weak_password' },
    })

    const result = await signUpWithEmail('test@example.com', 'short')

    expect(result).toEqual({ success: false, error: 'Password must be at least 8 characters' })
  })

  it('returns generic error for unknown errors', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Something unexpected happened' },
    })

    const result = await signUpWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'Something went wrong. Please try again.' })
  })
})

// ---------------------------------------------------------------------------
// signInWithEmail
// ---------------------------------------------------------------------------
describe('signInWithEmail', () => {
  it('returns success on valid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })

    const result = await signInWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: true })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('returns mapped error for invalid_credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    })

    const result = await signInWithEmail('test@example.com', 'wrongpass')

    expect(result).toEqual({ success: false, error: 'Invalid email or password' })
  })

  it('returns mapped error for email_not_confirmed', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
    })

    const result = await signInWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'Please check your email to confirm your account' })
  })

  it('maps error by message when code is missing (invalid login credentials)', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    const result = await signInWithEmail('test@example.com', 'wrongpass')

    expect(result).toEqual({ success: false, error: 'Invalid email or password' })
  })

  it('maps error by message containing "password"', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Password is too short' },
    })

    const result = await signInWithEmail('test@example.com', 'short')

    expect(result).toEqual({ success: false, error: 'Password must be at least 8 characters' })
  })

  it('returns generic error for unrecognized errors', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Rate limit exceeded' },
    })

    const result = await signInWithEmail('test@example.com', 'password123')

    expect(result).toEqual({ success: false, error: 'Something went wrong. Please try again.' })
  })
})

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------
describe('resetPassword', () => {
  it('returns success when reset email is sent', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    const result = await resetPassword('test@example.com')

    expect(result).toEqual({ success: true })
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'http://localhost:3000/auth/callback',
    })
  })

  it('returns mapped error on failure', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    })

    const result = await resetPassword('unknown@example.com')

    expect(result).toEqual({ success: false, error: 'Something went wrong. Please try again.' })
  })

  it('passes redirectTo as undefined when window is undefined', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = undefined
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    const result = await resetPassword('test@example.com')

    expect(result).toEqual({ success: true })
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: undefined,
    })
  })
})

// ---------------------------------------------------------------------------
// updatePassword
// ---------------------------------------------------------------------------
describe('updatePassword', () => {
  it('returns success when password is updated', async () => {
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })

    const result = await updatePassword('newpassword123')

    expect(result).toEqual({ success: true })
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
  })

  it('returns mapped error on failure', async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: 'Password is too weak', code: 'weak_password' },
    })

    const result = await updatePassword('short')

    expect(result).toEqual({ success: false, error: 'Password must be at least 8 characters' })
  })

  it('returns generic error for unknown failures', async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: 'Internal server error' },
    })

    const result = await updatePassword('newpassword123')

    expect(result).toEqual({ success: false, error: 'Something went wrong. Please try again.' })
  })
})

// ---------------------------------------------------------------------------
// mapSupabaseError (tested indirectly through all auth functions)
// ---------------------------------------------------------------------------
describe('mapSupabaseError (indirect tests via signInWithEmail)', () => {
  it('maps invalid_credentials code', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'some message', code: 'invalid_credentials' },
    })
    const result = await signInWithEmail('a@b.com', 'x')
    expect(result.error).toBe('Invalid email or password')
  })

  it('maps email_not_confirmed code', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'some message', code: 'email_not_confirmed' },
    })
    const result = await signInWithEmail('a@b.com', 'x')
    expect(result.error).toBe('Please check your email to confirm your account')
  })

  it('maps user_already_exists code via signUpWithEmail', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'some message', code: 'user_already_exists' },
    })
    const result = await signUpWithEmail('a@b.com', 'x')
    expect(result.error).toBe('An account with this email already exists')
  })

  it('maps message containing "email not confirmed" without code', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Email not confirmed yet' },
    })
    const result = await signInWithEmail('a@b.com', 'x')
    expect(result.error).toBe('Please check your email to confirm your account')
  })

  it('maps message containing "user already registered" without code', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    })
    const result = await signUpWithEmail('a@b.com', 'x')
    expect(result.error).toBe('An account with this email already exists')
  })

  it('falls through to generic message for unrecognized error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Network timeout' },
    })
    const result = await signInWithEmail('a@b.com', 'x')
    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})
