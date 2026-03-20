import posthog from 'posthog-js'

export function trackWaitlistSignup(source: string): void {
  posthog.capture('waitlist_signup', {
    source,
    $set: { waitlist: true },
  })
}

export function trackWaitlistFailed(reason: string): void {
  posthog.capture('waitlist_signup_failed', { reason })
}

export function trackCtaClicked(cta: string, location: string): void {
  posthog.capture('cta_clicked', { cta, location })
}

export function trackLandingSectionViewed(section: string): void {
  posthog.capture('landing_section_viewed', { section })
}
