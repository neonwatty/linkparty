import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCapture = vi.fn()
vi.mock('posthog-js', () => ({
  default: {
    capture: (...args: unknown[]) => mockCapture(...args),
    __loaded: true,
  },
}))

import { trackWaitlistSignup, trackWaitlistFailed, trackCtaClicked, trackLandingSectionViewed } from './analytics'

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('trackWaitlistSignup captures event with source and $set', () => {
    trackWaitlistSignup('landing_page')
    expect(mockCapture).toHaveBeenCalledWith('waitlist_signup', {
      source: 'landing_page',
      $set: { waitlist: true },
    })
  })

  it('trackWaitlistFailed captures event with reason', () => {
    trackWaitlistFailed('disposable_email')
    expect(mockCapture).toHaveBeenCalledWith('waitlist_signup_failed', {
      reason: 'disposable_email',
    })
  })

  it('trackCtaClicked captures event with cta and location', () => {
    trackCtaClicked('start_party', 'hero')
    expect(mockCapture).toHaveBeenCalledWith('cta_clicked', {
      cta: 'start_party',
      location: 'hero',
    })
  })

  it('trackLandingSectionViewed captures event with section', () => {
    trackLandingSectionViewed('how_it_works')
    expect(mockCapture).toHaveBeenCalledWith('landing_section_viewed', {
      section: 'how_it_works',
    })
  })
})
