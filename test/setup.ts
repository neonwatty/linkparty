import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Clear Supabase URL to enable mock mode in client hooks (useParty.ts).
// The .env.local file sets a real URL, but tests should use mock mode.
import.meta.env.VITE_SUPABASE_URL = ''

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock crypto — include subtle from Node's native crypto for Web Crypto API tests
import { webcrypto } from 'node:crypto'
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234',
    subtle: webcrypto.subtle,
  },
})
