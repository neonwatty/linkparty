'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Hook to track online/offline status
 * Uses navigator.onLine + fetch probe for accuracy
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(checkConnection, 500)
    }
    const handleOffline = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    checkConnection()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return isOnline
}
