import { useState, useCallback } from 'react'
import { getUserFriendlyMessage } from '../lib/errorMessages'

interface ErrorState {
  message: string
  retryFn?: () => void
}

interface UseErrorHandlerReturn {
  error: ErrorState | null
  showError: (message: string, retryFn?: () => void) => void
  clearError: () => void
  handleError: (err: unknown, retryFn?: () => void) => void
}

/**
 * Hook to manage error state with retry functionality
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorState | null>(null)

  const showError = useCallback((message: string, retryFn?: () => void) => {
    setError({ message, retryFn })
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((err: unknown, retryFn?: () => void) => {
    const message = getUserFriendlyMessage(err)
    setError({ message, retryFn })
  }, [])

  return { error, showError, clearError, handleError }
}
