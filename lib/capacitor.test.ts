import { describe, it, expect, afterEach } from 'vitest'
import { isNativePlatform, isIOS } from './capacitor'

describe('capacitor platform detection', () => {
  const originalNavigator = globalThis.navigator

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  function mockUserAgent(ua: string) {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: ua },
      writable: true,
      configurable: true,
    })
  }

  describe('isNativePlatform', () => {
    it('returns true when LinkPartyCapacitor is in user agent', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) LinkPartyCapacitor')
      expect(isNativePlatform()).toBe(true)
    })

    it('returns false for a regular browser user agent', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
      expect(isNativePlatform()).toBe(false)
    })

    it('returns false when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      expect(isNativePlatform()).toBe(false)
    })
  })

  describe('isIOS', () => {
    it('returns true for iPhone user agent', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')
      expect(isIOS()).toBe(true)
    })

    it('returns true for iPad user agent', () => {
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0)')
      expect(isIOS()).toBe(true)
    })

    it('returns true when native platform marker is present', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) LinkPartyCapacitor')
      expect(isIOS()).toBe(true)
    })

    it('returns false for Android user agent', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 14)')
      expect(isIOS()).toBe(false)
    })

    it('returns false when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      expect(isIOS()).toBe(false)
    })
  })
})
