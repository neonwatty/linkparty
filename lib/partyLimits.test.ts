import { describe, it, expect } from 'vitest'
import {
  MAX_MEMBERS,
  QUEUE_LIMIT,
  IMAGE_LIMIT,
  QUEUE_RATE_LIMIT,
  QUEUE_RATE_WINDOW_MS,
  PUSH_RATE_LIMIT,
  PUSH_RATE_WINDOW_MS,
  INVITE_RATE_LIMIT,
  INVITE_RATE_WINDOW_MS,
  CLAIM_RATE_LIMIT,
  CLAIM_RATE_WINDOW_MS,
  JOIN_RATE_LIMIT,
  JOIN_RATE_WINDOW_MS,
  CODE_THROTTLE_LIMIT,
  CODE_THROTTLE_WINDOW_MS,
  MAX_FRIEND_INVITES,
} from './partyLimits'

describe('partyLimits', () => {
  it('exports all 15 constants as positive numbers', () => {
    const constants = [
      MAX_MEMBERS,
      QUEUE_LIMIT,
      IMAGE_LIMIT,
      QUEUE_RATE_LIMIT,
      QUEUE_RATE_WINDOW_MS,
      PUSH_RATE_LIMIT,
      PUSH_RATE_WINDOW_MS,
      INVITE_RATE_LIMIT,
      INVITE_RATE_WINDOW_MS,
      CLAIM_RATE_LIMIT,
      CLAIM_RATE_WINDOW_MS,
      JOIN_RATE_LIMIT,
      JOIN_RATE_WINDOW_MS,
      CODE_THROTTLE_LIMIT,
      CODE_THROTTLE_WINDOW_MS,
      MAX_FRIEND_INVITES,
    ]
    expect(constants).toHaveLength(16)
    for (const c of constants) {
      expect(typeof c).toBe('number')
      expect(c).toBeGreaterThan(0)
    }
  })

  it('CODE_THROTTLE_LIMIT > MAX_MEMBERS (E2E invariant for initial party fill)', () => {
    expect(CODE_THROTTLE_LIMIT).toBeGreaterThan(MAX_MEMBERS)
  })

  it('rate limit windows are in milliseconds (>= 1000)', () => {
    const windows = [
      QUEUE_RATE_WINDOW_MS,
      PUSH_RATE_WINDOW_MS,
      INVITE_RATE_WINDOW_MS,
      CLAIM_RATE_WINDOW_MS,
      JOIN_RATE_WINDOW_MS,
      CODE_THROTTLE_WINDOW_MS,
    ]
    for (const w of windows) {
      expect(w).toBeGreaterThanOrEqual(1000)
    }
  })

  it('QUEUE_LIMIT >= IMAGE_LIMIT (images are a subset of queue)', () => {
    expect(QUEUE_LIMIT).toBeGreaterThanOrEqual(IMAGE_LIMIT)
  })

  it('snapshot: all exports match expected values', () => {
    expect({
      MAX_MEMBERS,
      QUEUE_LIMIT,
      IMAGE_LIMIT,
      QUEUE_RATE_LIMIT,
      QUEUE_RATE_WINDOW_MS,
      PUSH_RATE_LIMIT,
      PUSH_RATE_WINDOW_MS,
      INVITE_RATE_LIMIT,
      INVITE_RATE_WINDOW_MS,
      CLAIM_RATE_LIMIT,
      CLAIM_RATE_WINDOW_MS,
      JOIN_RATE_LIMIT,
      JOIN_RATE_WINDOW_MS,
      CODE_THROTTLE_LIMIT,
      CODE_THROTTLE_WINDOW_MS,
      MAX_FRIEND_INVITES,
    }).toEqual({
      MAX_MEMBERS: 20,
      QUEUE_LIMIT: 100,
      IMAGE_LIMIT: 20,
      QUEUE_RATE_LIMIT: 10,
      QUEUE_RATE_WINDOW_MS: 60_000,
      PUSH_RATE_LIMIT: 30,
      PUSH_RATE_WINDOW_MS: 60_000,
      INVITE_RATE_LIMIT: 10,
      INVITE_RATE_WINDOW_MS: 3_600_000,
      CLAIM_RATE_LIMIT: 10,
      CLAIM_RATE_WINDOW_MS: 60_000,
      JOIN_RATE_LIMIT: 60,
      JOIN_RATE_WINDOW_MS: 60_000,
      CODE_THROTTLE_LIMIT: 25,
      CODE_THROTTLE_WINDOW_MS: 60_000,
      MAX_FRIEND_INVITES: 20,
    })
  })
})
