// Centralized party configuration constants

/** Maximum members allowed per party */
export const MAX_MEMBERS = 20

/** Maximum items allowed in a single party's queue */
export const QUEUE_LIMIT = 100

/** Maximum images allowed in a single party's queue */
export const IMAGE_LIMIT = 20

/** Rate limit: max queue items added per session per minute */
export const QUEUE_RATE_LIMIT = 10

/** Rate limit window in milliseconds (1 minute) */
export const QUEUE_RATE_WINDOW_MS = 60_000

/** Rate limit: max push notifications per user per minute */
export const PUSH_RATE_LIMIT = 30

/** Rate limit window for push notifications in milliseconds */
export const PUSH_RATE_WINDOW_MS = 60_000

/** Rate limit: max email invites per party per hour */
export const INVITE_RATE_LIMIT = 10

/** Rate limit window for email invites in milliseconds (1 hour) */
export const INVITE_RATE_WINDOW_MS = 60 * 60 * 1000

/** Rate limit: max invite claim attempts per user per minute */
export const CLAIM_RATE_LIMIT = 10

/** Rate limit window for invite claims in milliseconds */
export const CLAIM_RATE_WINDOW_MS = 60_000

/** Rate limit: max join attempts per IP per minute */
export const JOIN_RATE_LIMIT = 60

/** Rate limit window for join attempts in milliseconds */
export const JOIN_RATE_WINDOW_MS = 60_000

/** Rate limit: max join attempts per party code per minute (must exceed MAX_MEMBERS for initial party fill) */
export const CODE_THROTTLE_LIMIT = 25

/** Rate limit window for code throttle in milliseconds */
export const CODE_THROTTLE_WINDOW_MS = 60_000

/** Max friends that can be invited at once */
export const MAX_FRIEND_INVITES = 20
