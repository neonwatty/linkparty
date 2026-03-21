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

export function trackSignup(): void {
  posthog.capture('signup')
}

export function trackLogin(): void {
  posthog.capture('login')
}

export function trackPartyCreated(partyId: string): void {
  posthog.capture('party_created', { partyId })
}

export function trackPartyJoined(partyId: string): void {
  posthog.capture('party_joined', { partyId })
}

export function trackQueueItemAdded(type: string): void {
  posthog.capture('queue_item_added', { type })
}

export function trackQueueItemCompleted(): void {
  posthog.capture('queue_item_completed')
}

export function trackTVModeStarted(): void {
  posthog.capture('tv_mode_started')
}

export function trackInviteSent(method: string): void {
  posthog.capture('invite_sent', { method })
}

export function trackShareLinkCopied(): void {
  posthog.capture('share_link_copied')
}
