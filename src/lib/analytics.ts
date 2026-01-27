/**
 * Analytics and performance monitoring abstraction.
 *
 * This module provides a provider-agnostic interface for:
 * - Event tracking
 * - Performance monitoring
 * - Error reporting
 *
 * To integrate with a specific provider (Sentry, Posthog, Mixpanel, etc.),
 * update the implementation functions below.
 */

import { logger } from './logger'

const log = logger.createLogger('Analytics')

// Check if analytics is enabled (can be toggled via env var)
const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'

// Event types for type safety
export type AnalyticsEvent =
  | 'party_created'
  | 'party_joined'
  | 'party_left'
  | 'item_added'
  | 'item_deleted'
  | 'item_moved'
  | 'item_shown'
  | 'note_edited'
  | 'image_uploaded'
  | 'install_prompt_shown'
  | 'install_prompt_accepted'
  | 'install_prompt_dismissed'
  | 'offline_detected'
  | 'online_restored'
  | 'sync_conflict'
  | 'error_shown'

export interface EventProperties {
  [key: string]: string | number | boolean | undefined
}

/**
 * Track a custom event
 */
export function trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
  if (!ANALYTICS_ENABLED) return

  log.debug(`Event: ${event}`, properties)

  // TODO: Send to analytics provider
  // Example integrations:
  // - Posthog: posthog.capture(event, properties)
  // - Mixpanel: mixpanel.track(event, properties)
  // - Amplitude: amplitude.track(event, properties)
}

/**
 * Track page/screen views
 */
export function trackPageView(screenName: string): void {
  if (!ANALYTICS_ENABLED) return

  log.debug(`Page view: ${screenName}`)

  // TODO: Send to analytics provider
}

/**
 * Set user properties for identification
 */
export function setUserProperties(properties: EventProperties): void {
  if (!ANALYTICS_ENABLED) return

  log.debug('Setting user properties', properties)

  // TODO: Send to analytics provider
}

/**
 * Track performance metrics
 */
export interface PerformanceMetric {
  name: string
  value: number
  unit?: 'ms' | 'bytes' | 'count'
  tags?: Record<string, string>
}

export function trackPerformance(metric: PerformanceMetric): void {
  if (!ANALYTICS_ENABLED) return

  log.debug(`Performance: ${metric.name} = ${metric.value}${metric.unit || ''}`, metric.tags)

  // TODO: Send to analytics provider
  // Example: Sentry.metrics.distribution(metric.name, metric.value)
}

/**
 * Measure and track operation duration
 */
export function measureOperation<T>(
  name: string,
  operation: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now()

  const trackDuration = () => {
    const duration = performance.now() - start
    trackPerformance({
      name: `operation.${name}`,
      value: Math.round(duration),
      unit: 'ms',
    })
  }

  try {
    const result = operation()

    if (result instanceof Promise) {
      return result.finally(trackDuration) as Promise<T>
    }

    trackDuration()
    return result
  } catch (error) {
    trackDuration()
    throw error
  }
}

/**
 * Report an error to monitoring
 */
export function reportError(
  error: Error,
  context?: Record<string, unknown>
): void {
  if (!ANALYTICS_ENABLED) return

  log.error('Reported error', error, context)

  // TODO: Send to error tracking provider
  // Example: Sentry.captureException(error, { extra: context })
}

/**
 * Set error context for future errors
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setErrorContext(_key: string, _value: unknown): void {
  if (!ANALYTICS_ENABLED) return

  // TODO: Send to error tracking provider
  // Example: Sentry.setContext(key, value)
}

/**
 * Initialize analytics (call once at app startup)
 */
export function initAnalytics(): void {
  if (!ANALYTICS_ENABLED) {
    log.info('Analytics disabled')
    return
  }

  log.info('Analytics initialized')

  // Track initial page load performance
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      trackPerformance({
        name: 'page.load_time',
        value: Math.round(navigation.loadEventEnd - navigation.startTime),
        unit: 'ms',
      })

      trackPerformance({
        name: 'page.dom_content_loaded',
        value: Math.round(navigation.domContentLoadedEventEnd - navigation.startTime),
        unit: 'ms',
      })
    }
  }

  // TODO: Initialize provider SDKs here
  // Example:
  // Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })
  // posthog.init(import.meta.env.VITE_POSTHOG_KEY)
}

/**
 * Pre-defined performance markers for common operations
 */
export const Operations = {
  QUEUE_LOAD: 'queue_load',
  QUEUE_SYNC: 'queue_sync',
  IMAGE_UPLOAD: 'image_upload',
  IMAGE_OPTIMIZE: 'image_optimize',
  CONTENT_FETCH: 'content_fetch',
  PARTY_CREATE: 'party_create',
  PARTY_JOIN: 'party_join',
} as const
