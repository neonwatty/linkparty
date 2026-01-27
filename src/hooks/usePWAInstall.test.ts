import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePWAInstall } from './usePWAInstall'

describe('usePWAInstall', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }

  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
    mockLocalStorage.getItem.mockReturnValue(null)

    // Mock matchMedia to return not standalone
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('initial canInstall is false when no prompt event fired', () => {
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.canInstall).toBe(false)
  })

  it('handles beforeinstallprompt event', () => {
    const { result } = renderHook(() => usePWAInstall())

    const mockPromptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    Object.assign(mockPromptEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })

    act(() => {
      window.dispatchEvent(mockPromptEvent)
    })

    expect(result.current.canInstall).toBe(true)
  })

  it('install() calls prompt and returns true when accepted', async () => {
    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePWAInstall())

    const mockPromptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    Object.assign(mockPromptEvent, {
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })

    act(() => {
      window.dispatchEvent(mockPromptEvent)
    })

    let installResult: boolean = false
    await act(async () => {
      installResult = await result.current.install()
    })

    expect(mockPrompt).toHaveBeenCalled()
    expect(installResult).toBe(true)
    expect(result.current.isInstalled).toBe(true)
  })

  it('install() returns false when dismissed', async () => {
    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePWAInstall())

    const mockPromptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    Object.assign(mockPromptEvent, {
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    })

    act(() => {
      window.dispatchEvent(mockPromptEvent)
    })

    let installResult: boolean = true
    await act(async () => {
      installResult = await result.current.install()
    })

    expect(installResult).toBe(false)
    expect(result.current.isInstalled).toBe(false)
  })

  it('install() returns false when no deferred prompt', async () => {
    const { result } = renderHook(() => usePWAInstall())

    let installResult: boolean = true
    await act(async () => {
      installResult = await result.current.install()
    })

    expect(installResult).toBe(false)
  })

  it('dismiss() sets localStorage and updates state', () => {
    const { result } = renderHook(() => usePWAInstall())

    const mockPromptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    Object.assign(mockPromptEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })

    act(() => {
      window.dispatchEvent(mockPromptEvent)
    })

    expect(result.current.canInstall).toBe(true)

    act(() => {
      result.current.dismiss()
    })

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'link-party-install-dismissed',
      expect.any(String)
    )
    expect(result.current.canInstall).toBe(false)
  })

  it('respects previously dismissed state within 7 days', () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    mockLocalStorage.getItem.mockReturnValue(recentDate)

    const { result } = renderHook(() => usePWAInstall())

    const mockPromptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    Object.assign(mockPromptEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })

    act(() => {
      window.dispatchEvent(mockPromptEvent)
    })

    // Should still be false because user dismissed within 7 days
    expect(result.current.canInstall).toBe(false)
  })

  it('cleans up event listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => usePWAInstall())

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function))

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
})
