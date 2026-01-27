import { useEffect } from 'react'
import type { ConflictInfo } from '../../lib/conflictResolver'
import { AlertIcon } from '../icons'

interface ConflictToastProps {
  conflicts: ConflictInfo[] | null
  onDismiss: () => void
}

export function ConflictToast({ conflicts, onDismiss }: ConflictToastProps) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (conflicts && conflicts.length > 0) {
      const timer = setTimeout(onDismiss, 5000)
      return () => clearTimeout(timer)
    }
  }, [conflicts, onDismiss])

  if (!conflicts || conflicts.length === 0) return null

  const getMessage = () => {
    if (conflicts.length === 1) {
      return conflicts[0].description
    }
    return `${conflicts.length} items were updated by other users`
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div
        className="bg-amber-500/90 backdrop-blur-sm text-black px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm"
        role="alert"
        aria-live="polite"
      >
        <div className="flex-shrink-0">
          <AlertIcon size={20} />
        </div>
        <div className="flex-1 text-sm font-medium">
          {getMessage()}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Dismiss notification"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
