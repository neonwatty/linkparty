'use client'

import { useEffect, Suspense } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getConsentStatus, CONSENT_EVENT } from '@/lib/cookieConsent'

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (pathname && ph) {
      let url = window.origin + pathname
      const search = searchParams.toString()
      if (search) url += '?' + search
      ph.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams, ph])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
    if (!key || !host) return

    const consent = getConsentStatus()

    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      autocapture: false,
      persistence: consent === 'accepted' ? 'localStorage+cookie' : 'memory',
      loaded: (ph) => {
        if (consent === 'declined') ph.opt_out_capturing()
      },
    })

    const handleConsent = (e: Event) => {
      const status = (e as CustomEvent).detail?.status
      if (status === 'accepted') {
        posthog.set_config({ persistence: 'localStorage+cookie' })
        posthog.opt_in_capturing()
      } else if (status === 'declined') {
        posthog.opt_out_capturing()
      }
    }

    window.addEventListener(CONSENT_EVENT, handleConsent)
    return () => window.removeEventListener(CONSENT_EVENT, handleConsent)
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
