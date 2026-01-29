'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  trackEvent,
  trackPageView,
  measureOperation,
  type AnalyticsEvent,
  type EventProperties,
} from '@/lib/analytics'

/**
 * Hook for tracking analytics events in components
 */
export function useAnalytics() {
  const track = useCallback(
    (event: AnalyticsEvent, properties?: EventProperties) => {
      trackEvent(event, properties)
    },
    []
  )

  return { track }
}

/**
 * Hook for tracking page/screen views
 * Automatically tracks when the component mounts
 */
export function usePageView(screenName: string) {
  const tracked = useRef(false)

  useEffect(() => {
    if (!tracked.current) {
      trackPageView(screenName)
      tracked.current = true
    }
  }, [screenName])
}

/**
 * Hook for measuring operation performance
 * Returns a function that wraps operations with timing
 */
export function useMeasure() {
  return useCallback(<T>(name: string, operation: () => T | Promise<T>) => {
    return measureOperation(name, operation)
  }, [])
}

/**
 * Hook for tracking session duration
 * Tracks how long the user spends on the current screen
 */
export function useSessionDuration(screenName: string) {
  const startTime = useRef<number | null>(null)

  useEffect(() => {
    startTime.current = Date.now()

    return () => {
      if (startTime.current) {
        const duration = Date.now() - startTime.current
        trackEvent('party_left', {
          screen: screenName,
          duration_seconds: Math.round(duration / 1000),
        })
      }
    }
  }, [screenName])
}
