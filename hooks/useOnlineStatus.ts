'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to track online/offline status
 * Uses navigator.onLine + fetch probe for accuracy
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const checkConnection = async () => {
      if (!navigator.onLine) {
        setIsOnline(false)
        return
      }
      try {
        const res = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-store',
        })
        setIsOnline(res.ok)
      } catch {
        setIsOnline(false)
      }
    }

    const handleOnline = () => {
      checkConnection()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    checkConnection()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
