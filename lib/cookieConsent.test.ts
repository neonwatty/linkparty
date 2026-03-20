import { describe, it, expect, beforeEach, vi } from 'vitest'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

const dispatchEventSpy = vi.fn()
Object.defineProperty(globalThis, 'dispatchEvent', { value: dispatchEventSpy })

import { getConsentStatus, setConsentStatus, clearConsentStatus, CONSENT_KEY, CONSENT_EVENT } from './cookieConsent'

describe('cookieConsent', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('returns null when no consent stored', () => {
    expect(getConsentStatus()).toBeNull()
  })

  it('returns accepted when stored', () => {
    localStorageMock.setItem(CONSENT_KEY, 'accepted')
    expect(getConsentStatus()).toBe('accepted')
  })

  it('returns declined when stored', () => {
    localStorageMock.setItem(CONSENT_KEY, 'declined')
    expect(getConsentStatus()).toBe('declined')
  })

  it('setConsentStatus writes to localStorage and dispatches event', () => {
    setConsentStatus('accepted')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(CONSENT_KEY, 'accepted')
    expect(dispatchEventSpy).toHaveBeenCalledOnce()
    const event = dispatchEventSpy.mock.calls[0][0]
    expect(event.type).toBe(CONSENT_EVENT)
    expect(event.detail).toEqual({ status: 'accepted' })
  })

  it('clearConsentStatus removes from localStorage', () => {
    localStorageMock.setItem(CONSENT_KEY, 'accepted')
    clearConsentStatus()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(CONSENT_KEY)
  })
})
