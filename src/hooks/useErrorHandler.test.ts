import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from './useErrorHandler'

// Mock the errorMessages module
vi.mock('../lib/errorMessages', () => ({
  getUserFriendlyMessage: vi.fn((err: unknown) => {
    if (err instanceof Error) {
      if (err.message.includes('Failed to fetch')) {
        return 'Connection failed. Check your internet and try again.'
      }
      if (err.message.includes('not authenticated')) {
        return 'Please sign in to continue.'
      }
      return err.message
    }
    return 'Something went wrong. Please try again.'
  }),
}))

describe('useErrorHandler', () => {
  it('initial error state is null', () => {
    const { result } = renderHook(() => useErrorHandler())
    expect(result.current.error).toBeNull()
  })

  it('showError sets error state with message', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.showError('Something went wrong')
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.message).toBe('Something went wrong')
  })

  it('showError stores retry function', () => {
    const { result } = renderHook(() => useErrorHandler())
    const retryFn = vi.fn()

    act(() => {
      result.current.showError('Something went wrong', retryFn)
    })

    expect(result.current.error?.retryFn).toBe(retryFn)

    // Call the retry function to verify it's stored correctly
    result.current.error?.retryFn?.()
    expect(retryFn).toHaveBeenCalled()
  })

  it('clearError resets error to null', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.showError('Something went wrong')
    })

    expect(result.current.error).not.toBeNull()

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('handleError converts Error objects to user-friendly messages for network errors', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.handleError(new Error('Failed to fetch'))
    })

    expect(result.current.error?.message).toBe('Connection failed. Check your internet and try again.')
  })

  it('handleError converts Error objects to user-friendly messages for auth errors', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.handleError(new Error('User not authenticated'))
    })

    expect(result.current.error?.message).toBe('Please sign in to continue.')
  })

  it('handleError stores retry function with error', () => {
    const { result } = renderHook(() => useErrorHandler())
    const retryFn = vi.fn()

    act(() => {
      result.current.handleError(new Error('Some error'), retryFn)
    })

    expect(result.current.error?.retryFn).toBe(retryFn)
  })

  it('handleError handles non-Error objects', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.handleError('string error')
    })

    expect(result.current.error?.message).toBe('Something went wrong. Please try again.')
  })
})
