'use client'

import { useEffect, useCallback } from 'react'
import { CloseIcon } from '@/components/icons'

interface ImageLightboxProps {
  imageUrl: string
  caption?: string
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ imageUrl, caption, isOpen, onClose }: ImageLightboxProps) {
  // Handle escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="Close"
      >
        <CloseIcon size={24} />
      </button>

      {/* Image container */}
      <div
        className="max-w-[95vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={caption || 'Full size image'}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />

        {/* Caption */}
        {caption && (
          <div className="mt-4 px-4 py-2 bg-surface-900/80 rounded-lg max-w-xl text-center">
            <p className="text-text-primary">{caption}</p>
          </div>
        )}
      </div>

      {/* Tap anywhere hint on mobile */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-text-muted text-xs">
        Tap anywhere to close
      </div>
    </div>
  )
}
