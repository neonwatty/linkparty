'use client'

/**
 * Client-side rate limiting utility.
 *
 * This provides immediate feedback to users when they're hitting rate limits,
 * while server-side enforcement (via Supabase RLS) provides actual protection.
 *
 * Rate limits are stored in localStorage to persist across page refreshes.
 */

import { logger } from './logger'

const log = logger.createLogger('RateLimit')

interface RateLimitEntry {
  timestamps: number[]
}

// Rate limit configurations
export const RATE_LIMITS = {
  // Queue items: 10 items per minute
  queueItem: {
    maxAttempts: 10,
    windowMs: 60 * 1000,
  },
  // Party creation: 3 parties per hour
  partyCreation: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
  },
  // Image uploads: 5 images per minute
  imageUpload: {
    maxAttempts: 5,
    windowMs: 60 * 1000,
  },
} as const

type RateLimitKey = keyof typeof RATE_LIMITS

const STORAGE_PREFIX = 'link-party-rate-limit-'

/**
 * Get timestamps from localStorage for a given action
 */
function getTimestamps(key: RateLimitKey): number[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!stored) return []

    const entry: RateLimitEntry = JSON.parse(stored)
    return entry.timestamps || []
  } catch {
    return []
  }
}

/**
 * Save timestamps to localStorage
 */
function saveTimestamps(key: RateLimitKey, timestamps: number[]): void {
  if (typeof window === 'undefined') return

  try {
    const entry: RateLimitEntry = { timestamps }
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clean up expired timestamps
 */
function cleanupTimestamps(timestamps: number[], windowMs: number): number[] {
  const now = Date.now()
  return timestamps.filter((ts) => now - ts < windowMs)
}

/**
 * Check if an action is rate limited
 *
 * @returns Object with isLimited, remainingAttempts, and retryAfterMs
 */
export function checkRateLimit(key: RateLimitKey): {
  isLimited: boolean
  remainingAttempts: number
  retryAfterMs: number
} {
  const config = RATE_LIMITS[key]
  const timestamps = getTimestamps(key)
  const cleaned = cleanupTimestamps(timestamps, config.windowMs)

  // Save cleaned timestamps back
  if (cleaned.length !== timestamps.length) {
    saveTimestamps(key, cleaned)
  }

  const isLimited = cleaned.length >= config.maxAttempts
  const remainingAttempts = Math.max(0, config.maxAttempts - cleaned.length)

  // Calculate when the oldest timestamp will expire
  let retryAfterMs = 0
  if (isLimited && cleaned.length > 0) {
    const oldestTimestamp = Math.min(...cleaned)
    retryAfterMs = Math.max(0, config.windowMs - (Date.now() - oldestTimestamp))
  }

  if (isLimited) {
    log.debug(`Rate limited: ${key}`, {
      action: 'checkRateLimit',
      attempts: cleaned.length,
      maxAttempts: config.maxAttempts,
      retryAfterMs,
    })
  }

  return { isLimited, remainingAttempts, retryAfterMs }
}

/**
 * Record an action attempt
 */
export function recordAttempt(key: RateLimitKey): void {
  const config = RATE_LIMITS[key]
  const timestamps = getTimestamps(key)
  const cleaned = cleanupTimestamps(timestamps, config.windowMs)

  cleaned.push(Date.now())
  saveTimestamps(key, cleaned)

  log.debug(`Recorded attempt: ${key}`, {
    action: 'recordAttempt',
    totalAttempts: cleaned.length,
  })
}

/**
 * Format retry time for display
 */
export function formatRetryTime(ms: number): string {
  if (ms < 1000) {
    return 'a moment'
  }

  const seconds = Math.ceil(ms / 1000)

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`
  }

  const minutes = Math.ceil(seconds / 60)

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

/**
 * Get a user-friendly error message for rate limiting
 */
export function getRateLimitMessage(key: RateLimitKey, retryAfterMs: number): string {
  const retryTime = formatRetryTime(retryAfterMs)

  switch (key) {
    case 'queueItem':
      return `Too many items added. Please wait ${retryTime} before adding more.`
    case 'partyCreation':
      return `Too many parties created. Please wait ${retryTime} before creating another.`
    case 'imageUpload':
      return `Too many images uploaded. Please wait ${retryTime} before uploading more.`
    default:
      return `Rate limit exceeded. Please try again in ${retryTime}.`
  }
}

/**
 * Hook-friendly function to check and optionally record an action
 *
 * @returns null if allowed, or an error message if rate limited
 */
export function tryAction(key: RateLimitKey): string | null {
  const { isLimited, retryAfterMs } = checkRateLimit(key)

  if (isLimited) {
    return getRateLimitMessage(key, retryAfterMs)
  }

  recordAttempt(key)
  return null
}
