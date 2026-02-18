import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, verifyHash } from './passwordHash'

describe('hashPassword (PBKDF2)', () => {
  it('returns a pbkdf2-formatted string', async () => {
    const hash = await hashPassword('test')
    expect(hash).toMatch(/^pbkdf2:\d+:[0-9a-f]+:[0-9a-f]+$/)
  })

  it('produces different hashes for same input (random salt)', async () => {
    const hash1 = await hashPassword('mypassword')
    const hash2 = await hashPassword('mypassword')
    expect(hash1).not.toBe(hash2)
  })

  it('contains 100000 iterations', async () => {
    const hash = await hashPassword('test')
    const parts = hash.split(':')
    expect(parts[1]).toBe('100000')
  })

  it('handles empty string', async () => {
    const hash = await hashPassword('')
    expect(hash).toMatch(/^pbkdf2:/)
  })
})

describe('verifyPassword', () => {
  it('verifies a PBKDF2 hash correctly', async () => {
    const hash = await hashPassword('secret')
    expect(await verifyPassword('secret', hash)).toBe(true)
  })

  it('rejects wrong password for PBKDF2 hash', async () => {
    const hash = await hashPassword('secret')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('verifies legacy SHA-256 hash (backwards compatibility)', async () => {
    // Pre-computed SHA-256 of "test" (no salt)
    const legacyHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    expect(await verifyPassword('test', legacyHash)).toBe(true)
  })

  it('rejects wrong password for legacy SHA-256 hash', async () => {
    const legacyHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    expect(await verifyPassword('wrong', legacyHash)).toBe(false)
  })

  it('rejects malformed PBKDF2 hash', async () => {
    expect(await verifyPassword('test', 'pbkdf2:invalid')).toBe(false)
    expect(await verifyPassword('test', 'pbkdf2:0::')).toBe(false)
  })
})

describe('verifyHash (deprecated, backwards compat)', () => {
  it('returns true for matching strings', () => {
    expect(verifyHash('abc123', 'abc123')).toBe(true)
  })

  it('returns false for different strings', () => {
    expect(verifyHash('abc123', 'xyz789')).toBe(false)
  })

  it('returns false for different lengths', () => {
    expect(verifyHash('abc', 'abcd')).toBe(false)
  })
})
