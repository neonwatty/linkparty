'use client'

import { useEffect, useState, useCallback } from 'react'

export function ServiceWorkerRegistration() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowUpdate(false)
    window.location.reload()
  }, [waitingWorker])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check if there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowUpdate(true)
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker)
              setShowUpdate(true)
            }
          })
        })
      })
      .catch((error) => {
        console.log('SW registration failed:', error)
      })
  }, [])

  if (!showUpdate) return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        left: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        background: '#242838',
        border: '1px solid #3a3f52',
        borderRadius: 12,
        color: '#f5f0e8',
        fontSize: 14,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <span>A new version is available.</span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => setShowUpdate(false)}
          style={{
            background: 'transparent',
            border: '1px solid #3a3f52',
            borderRadius: 8,
            color: '#948e84',
            padding: '6px 12px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Later
        </button>
        <button
          onClick={handleUpdate}
          style={{
            background: '#ff8a5c',
            border: 'none',
            borderRadius: 8,
            color: '#1A1D2E',
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Update
        </button>
      </div>
    </div>
  )
}
