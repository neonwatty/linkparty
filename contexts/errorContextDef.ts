'use client'

import { createContext } from 'react'

export interface ErrorContextValue {
  showError: (message: string, retryFn?: () => void) => void
  clearError: () => void
  handleError: (err: unknown, retryFn?: () => void) => void
}

export const ErrorContext = createContext<ErrorContextValue | null>(null)
