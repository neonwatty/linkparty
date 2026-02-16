import { describe, it, expect } from 'vitest'
import { validateEmail, validatePassword, validateDisplayName } from './validation'

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    const result = validateEmail('user@example.com')
    expect(result).toEqual({ isValid: true })
  })

  it('accepts email with subdomain', () => {
    const result = validateEmail('user@mail.example.co.uk')
    expect(result).toEqual({ isValid: true })
  })

  it('accepts email with plus addressing', () => {
    const result = validateEmail('user+tag@example.com')
    expect(result).toEqual({ isValid: true })
  })

  it('rejects empty string', () => {
    const result = validateEmail('')
    expect(result).toEqual({ isValid: false, error: 'Email is required' })
  })

  it('rejects whitespace-only string', () => {
    const result = validateEmail('   ')
    expect(result).toEqual({ isValid: false, error: 'Email is required' })
  })

  it('rejects email without @', () => {
    const result = validateEmail('userexample.com')
    expect(result).toEqual({ isValid: false, error: 'Please enter a valid email' })
  })

  it('rejects email without domain', () => {
    const result = validateEmail('user@')
    expect(result).toEqual({ isValid: false, error: 'Please enter a valid email' })
  })

  it('rejects email without local part', () => {
    const result = validateEmail('@example.com')
    expect(result).toEqual({ isValid: false, error: 'Please enter a valid email' })
  })

  it('rejects email without TLD', () => {
    const result = validateEmail('user@example')
    expect(result).toEqual({ isValid: false, error: 'Please enter a valid email' })
  })

  it('trims whitespace before validation', () => {
    const result = validateEmail('  user@example.com  ')
    expect(result).toEqual({ isValid: true })
  })

  it('rejects email with spaces in the middle', () => {
    const result = validateEmail('user @example.com')
    expect(result).toEqual({ isValid: false, error: 'Please enter a valid email' })
  })
})

describe('validatePassword', () => {
  it('accepts a valid password of 8 characters', () => {
    const result = validatePassword('12345678')
    expect(result).toEqual({ isValid: true })
  })

  it('accepts a long password', () => {
    const result = validatePassword('a'.repeat(100))
    expect(result).toEqual({ isValid: true })
  })

  it('rejects empty string', () => {
    const result = validatePassword('')
    expect(result).toEqual({ isValid: false, error: 'Password is required' })
  })

  it('rejects password shorter than 8 characters', () => {
    const result = validatePassword('1234567')
    expect(result).toEqual({ isValid: false, error: 'Password must be at least 8 characters' })
  })

  it('rejects single character password', () => {
    const result = validatePassword('a')
    expect(result).toEqual({ isValid: false, error: 'Password must be at least 8 characters' })
  })

  it('does not trim password (spaces count as characters)', () => {
    const result = validatePassword('        ')
    expect(result).toEqual({ isValid: true })
  })
})

describe('validateDisplayName', () => {
  it('accepts a valid display name', () => {
    const result = validateDisplayName('Alice')
    expect(result).toEqual({ isValid: true })
  })

  it('accepts a name of exactly 2 characters', () => {
    const result = validateDisplayName('Al')
    expect(result).toEqual({ isValid: true })
  })

  it('accepts a name of exactly 50 characters', () => {
    const result = validateDisplayName('a'.repeat(50))
    expect(result).toEqual({ isValid: true })
  })

  it('rejects empty string', () => {
    const result = validateDisplayName('')
    expect(result).toEqual({ isValid: false, error: 'Display name is required' })
  })

  it('rejects whitespace-only string', () => {
    const result = validateDisplayName('   ')
    expect(result).toEqual({ isValid: false, error: 'Display name is required' })
  })

  it('rejects name shorter than 2 characters after trimming', () => {
    const result = validateDisplayName('A')
    expect(result).toEqual({ isValid: false, error: 'Display name must be 2-50 characters' })
  })

  it('rejects name longer than 50 characters after trimming', () => {
    const result = validateDisplayName('a'.repeat(51))
    expect(result).toEqual({ isValid: false, error: 'Display name must be 2-50 characters' })
  })

  it('trims whitespace before length check', () => {
    const result = validateDisplayName('  Al  ')
    expect(result).toEqual({ isValid: true })
  })

  it('rejects name that is only 1 char after trimming', () => {
    const result = validateDisplayName('  A  ')
    expect(result).toEqual({ isValid: false, error: 'Display name must be 2-50 characters' })
  })
})
