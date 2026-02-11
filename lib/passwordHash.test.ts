import { describe, it, expect } from 'vitest'
import { hashPassword, verifyHash } from './passwordHash'

describe('hashPassword', () => {
  it('returns a 64-character hex string', async () => {
    const hash = await hashPassword('test')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns consistent hash for same input', async () => {
    const hash1 = await hashPassword('mypassword')
    const hash2 = await hashPassword('mypassword')
    expect(hash1).toBe(hash2)
  })

  it('returns different hash for different input', async () => {
    const hash1 = await hashPassword('password1')
    const hash2 = await hashPassword('password2')
    expect(hash1).not.toBe(hash2)
  })

  it('handles empty string', async () => {
    const hash = await hashPassword('')
    expect(hash).toHaveLength(64)
  })
})

describe('verifyHash', () => {
  it('returns true for matching hashes', async () => {
    const hash = await hashPassword('secret')
    expect(verifyHash(hash, hash)).toBe(true)
  })

  it('returns false for different hashes', async () => {
    const hash1 = await hashPassword('secret1')
    const hash2 = await hashPassword('secret2')
    expect(verifyHash(hash1, hash2)).toBe(false)
  })

  it('returns false for different lengths', () => {
    expect(verifyHash('abc', 'abcd')).toBe(false)
  })
})
