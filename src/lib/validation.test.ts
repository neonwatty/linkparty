import { describe, it, expect } from 'vitest'
import { validateEmail, validatePassword, validateDisplayName } from './validation'

describe('validateEmail', () => {
  it('returns error for empty email', () => {
    const result = validateEmail('')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Email is required')
  })

  it('returns error for whitespace-only email', () => {
    const result = validateEmail('   ')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Email is required')
  })

  it('returns error for invalid email format', () => {
    const result = validateEmail('notanemail')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Please enter a valid email')
  })

  it('returns error for email without domain', () => {
    const result = validateEmail('test@')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Please enter a valid email')
  })

  it('returns error for email without @', () => {
    const result = validateEmail('test.example.com')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Please enter a valid email')
  })

  it('returns valid for proper email', () => {
    const result = validateEmail('test@example.com')
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('trims email before validation', () => {
    const result = validateEmail('  test@example.com  ')
    expect(result.isValid).toBe(true)
  })
})

describe('validatePassword', () => {
  it('returns error for empty password', () => {
    const result = validatePassword('')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Password is required')
  })

  it('returns error for password too short', () => {
    const result = validatePassword('1234567')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Password must be at least 8 characters')
  })

  it('returns valid for password with exactly 8 characters', () => {
    const result = validatePassword('12345678')
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns valid for long password', () => {
    const result = validatePassword('a-very-long-secure-password-123!')
    expect(result.isValid).toBe(true)
  })
})

describe('validateDisplayName', () => {
  it('returns error for empty name', () => {
    const result = validateDisplayName('')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Display name is required')
  })

  it('returns error for whitespace-only name', () => {
    const result = validateDisplayName('   ')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Display name is required')
  })

  it('returns error for name too short', () => {
    const result = validateDisplayName('A')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Display name must be 2-50 characters')
  })

  it('returns error for name too long', () => {
    const result = validateDisplayName('a'.repeat(51))
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Display name must be 2-50 characters')
  })

  it('returns valid for name with 2 characters', () => {
    const result = validateDisplayName('AB')
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns valid for name with 50 characters', () => {
    const result = validateDisplayName('a'.repeat(50))
    expect(result.isValid).toBe(true)
  })

  it('trims name before checking length', () => {
    const result = validateDisplayName('  AB  ')
    expect(result.isValid).toBe(true)
  })
})
