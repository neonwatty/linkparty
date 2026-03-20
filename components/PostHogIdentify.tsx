'use client'

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'
import { useAuth } from '@/contexts/AuthContext'
import { getConsentStatus, CONSENT_EVENT } from '@/lib/cookieConsent'

export function PostHogIdentify() {
  const { user } = useAuth()
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog) return

    function identify() {
      if (user && getConsentStatus() === 'accepted') {
        posthog.identify(user.id, { email: user.email })
      } else if (!user) {
        posthog.reset()
      }
    }

    identify()

    window.addEventListener(CONSENT_EVENT, identify)
    return () => window.removeEventListener(CONSENT_EVENT, identify)
  }, [user, posthog])

  return null
}
