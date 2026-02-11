import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

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
