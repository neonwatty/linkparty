import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from './useOnlineStatus'

describe('useOnlineStatus', () => {
  const originalNavigator = window.navigator

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
  })

  it('initial state matches navigator.onLine when online', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it('initial state matches navigator.onLine when offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)
  })

  it('updates to true on online window event', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current).toBe(true)
  })

  it('updates to false on offline window event', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current).toBe(false)
  })

  it('cleans up event listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useOnlineStatus())

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
})
