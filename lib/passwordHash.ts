/**
 * Party password hashing using PBKDF2 with per-party salt.
 * Uses Web Crypto API (available in both browser and Node.js 20+).
 *
 * Hash format: "pbkdf2:<iterations>:<saltHex>:<hashHex>"
 * Legacy format (pre-migration): plain 64-char SHA-256 hex string
 */

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const HASH_BITS = 256

/** Generate cryptographically random bytes (works in browser + Node.js/JSDOM) */
function getRandomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint8Array(length))
  }
  // Node.js fallback (for JSDOM test environment)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto') as typeof import('crypto')
  return new Uint8Array(nodeCrypto.randomBytes(length))
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const matches = hex.match(/.{2}/g)
  if (!matches) return new Uint8Array(0)
  return new Uint8Array(matches.map((b) => parseInt(b, 16)))
}

/**
 * Hash a password with PBKDF2 + random salt.
 * Returns format: "pbkdf2:100000:<saltHex>:<hashHex>"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = getRandomBytes(SALT_BYTES)
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])

  const saltForPbkdf2 = new Uint8Array(salt.buffer as ArrayBuffer)
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltForPbkdf2, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS,
  )

  return `pbkdf2:${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(new Uint8Array(hashBuffer))}`
}

/**
 * Verify a password against a stored hash.
 * Supports both new PBKDF2 format and legacy plain SHA-256 for backwards compatibility.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('pbkdf2:')) {
    return verifyPbkdf2(password, storedHash)
  }
  // Legacy: plain SHA-256 (64-char hex string, no salt)
  return verifyLegacySha256(password, storedHash)
}

async function verifyPbkdf2(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const iterations = parseInt(parts[1], 10)
  const salt = fromHex(parts[2])
  const expectedHash = parts[3]

  if (!iterations || salt.length === 0 || !expectedHash) return false

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])

  const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(saltBuffer), iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS,
  )

  const computedHash = toHex(new Uint8Array(hashBuffer))
  return constantTimeEqual(computedHash, expectedHash)
}

async function verifyLegacySha256(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const computedHash = toHex(new Uint8Array(hashBuffer))
  return constantTimeEqual(computedHash, storedHash)
}

/** Constant-time comparison to avoid timing attacks on hash verification. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * @deprecated Use verifyPassword instead. Kept for backwards compatibility with tests.
 */
export function verifyHash(inputHash: string, storedHash: string): boolean {
  return constantTimeEqual(inputHash, storedHash)
}
