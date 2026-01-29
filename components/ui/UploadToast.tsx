'use client'

import { useEffect, useRef, useMemo } from 'react'
import { CheckIcon, AlertIcon, LoaderIcon, CloseIcon } from '@/components/icons'

interface UploadToastProps {
  isVisible: boolean
  isOptimizing?: boolean
  isUploading: boolean
  progress: number
  error: string | null
  onRetry: () => void
  onDismiss: () => void
}

export function UploadToast({
  isVisible,
  isOptimizing,
  isUploading,
  progress,
  error,
  onRetry,
  onDismiss,
}: UploadToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Determine if we should show success state
  const showSuccess = useMemo(() => {
    return !isUploading && !error && progress === 100
  }, [isUploading, error, progress])

  // Auto-dismiss after showing success
  useEffect(() => {
    if (showSuccess) {
      timerRef.current = setTimeout(() => {
        onDismiss()
      }, 3000)
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
      }
    }
  }, [showSuccess, onDismiss])

  if (!isVisible && !showSuccess) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="bg-surface-800 border border-surface-700 rounded-full px-4 py-3 shadow-lg flex items-center gap-3 min-w-[200px]">
        {/* Optimizing state */}
        {isOptimizing && (
          <>
            <div className="text-accent-500">
              <LoaderIcon />
            </div>
            <div className="text-sm font-medium">Optimizing image...</div>
          </>
        )}

        {/* Uploading state */}
        {isUploading && !isOptimizing && (
          <>
            <div className="text-accent-500">
              <LoaderIcon />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Uploading image...</div>
              <div className="w-full h-1 bg-surface-600 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-accent-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </>
        )}

        {/* Success state */}
        {showSuccess && !error && (
          <>
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              <CheckIcon />
            </div>
            <div className="text-sm font-medium text-green-400">Image added!</div>
          </>
        )}

        {/* Error state */}
        {error && !isUploading && (
          <>
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <AlertIcon size={16} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-400">Upload failed</div>
              <div className="text-xs text-text-muted truncate max-w-[150px]">{error}</div>
            </div>
            <button
              onClick={onRetry}
              className="text-xs text-accent-400 hover:text-accent-300 font-medium"
            >
              Retry
            </button>
            <button
              onClick={onDismiss}
              className="text-text-muted hover:text-text-secondary"
            >
              <CloseIcon size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
