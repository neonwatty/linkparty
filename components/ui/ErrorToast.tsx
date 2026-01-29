'use client'

import { useEffect } from 'react'
import { AlertIcon } from '@/components/icons'

interface ErrorToastProps {
  message: string
  onDismiss: () => void
  onRetry?: () => void
  autoDismissMs?: number
}

/**
 * Toast notification for errors with optional retry action
 */
export function ErrorToast({
  message,
  onDismiss,
  onRetry,
  autoDismissMs = 8000,
}: ErrorToastProps) {
  useEffect(() => {
    if (autoDismissMs > 0) {
      const timer = setTimeout(onDismiss, autoDismissMs)
      return () => clearTimeout(timer)
    }
  }, [autoDismissMs, onDismiss])

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 animate-fade-in-up">
      <div
        className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg max-w-sm mx-auto"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertIcon size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-sm underline hover:no-underline opacity-90 hover:opacity-100"
              >
                Tap to retry
              </button>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Dismiss error"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
