/**
 * Client-side password hashing for party passwords.
 * Uses SHA-256 via Web Crypto API — sufficient for low-stakes party passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time comparison to avoid timing attacks on hash verification. */
export function verifyHash(inputHash: string, storedHash: string): boolean {
  if (inputHash.length !== storedHash.length) return false
  let result = 0
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  }
  return result === 0
}
