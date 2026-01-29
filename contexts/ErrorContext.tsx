'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { ErrorToast } from '@/components/ui/ErrorToast'
import { getUserFriendlyMessage } from '@/lib/errorMessages'
import { ErrorContext } from './errorContextDef'

interface ErrorState {
  message: string
  retryFn?: () => void
}

interface ErrorProviderProps {
  children: ReactNode
}

export function ErrorProvider({ children }: ErrorProviderProps) {
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

  const handleRetry = useCallback(() => {
    if (error?.retryFn) {
      clearError()
      error.retryFn()
    }
  }, [error, clearError])

  return (
    <ErrorContext.Provider value={{ showError, clearError, handleError }}>
      {children}
      {error && (
        <ErrorToast
          message={error.message}
          onDismiss={clearError}
          onRetry={error.retryFn ? handleRetry : undefined}
        />
      )}
    </ErrorContext.Provider>
  )
}
