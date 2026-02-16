/** Server-enforced limit error messages */
export const LIMITS = {
  MAX_PARTIES: 'You can have at most 5 active parties. Close or let one expire first.',
  MAX_MEMBERS: 'This party is full (max 20 members).',
  MAX_IMAGES: 'This party has reached the image limit (max 20 images).',
  PARTY_EXPIRED: 'This party has expired.',
  INCORRECT_PASSWORD: 'Incorrect party password.',
  PARTY_NOT_FOUND: 'Party not found. Check the code and try again.',
} as const

/** Friend-related error messages */
export const FRIENDS = {
  ALREADY_FRIENDS: 'You are already friends with this user.',
  REQUEST_EXISTS: 'A friend request has already been sent.',
  REQUEST_INCOMING: 'This user has already sent you a friend request.',
  REQUEST_NOT_FOUND: 'Friend request not found.',
  CANNOT_FRIEND_SELF: 'You cannot send a friend request to yourself.',
  NOT_AUTHORIZED: 'You are not authorized to perform this action.',
  USER_NOT_FOUND: 'User not found.',
  INVALID_ACTION: 'Invalid action. Use decline, cancel, or unfriend.',
  RATE_LIMITED: 'Too many friend requests. Please wait before sending more.',
  BLOCKED: 'You cannot interact with this user.',
} as const

/**
 * Convert errors to user-friendly messages
 */
export function getUserFriendlyMessage(err: unknown): string {
  if (err instanceof Error) {
    // Network errors
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return 'Connection failed. Check your internet and try again.'
    }

    // Rate limiting
    if (err.message.includes('rate limit') || err.message.includes('too many')) {
      return 'Too many requests. Please wait a moment.'
    }

    // Auth errors
    if (err.message.includes('not authenticated') || err.message.includes('unauthorized')) {
      return 'Please sign in to continue.'
    }

    // Permission errors
    if (err.message.includes('permission') || err.message.includes('forbidden')) {
      return "You don't have permission for this action."
    }

    // Not found
    if (err.message.includes('not found')) {
      return 'The requested item was not found.'
    }

    // Timeout
    if (err.message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }

    // Return the error message if it's already user-friendly (short and clean)
    if (err.message.length < 100 && !err.message.includes('Error:')) {
      return err.message
    }
  }

  // Generic fallback
  return 'Something went wrong. Please try again.'
}
