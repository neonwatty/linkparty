# PostHog + Waitlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consent-first PostHog analytics and replace the newsletter signup with a robust waitlist backed by Resend confirmation emails.

**Architecture:** PostHog initialized via client-side provider with cookie consent banner. Waitlist as an API route with dual rate limiting, disposable email blocking, and Resend audience sync + confirmation email. All patterns follow existing linkparty conventions.

**Tech Stack:** posthog-js, disposable-email-domains, Resend (raw fetch), Supabase, Next.js 16 App Router

**Spec:** `docs/superpowers/specs/2026-03-20-posthog-waitlist-design.md`

---

## File Structure

| File                                                | Responsibility                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `lib/cookieConsent.ts`                              | Shared consent state: localStorage read/write, CustomEvent dispatch    |
| `components/PostHogProvider.tsx`                    | PostHog init, consent listener, PHProvider context, manual pageview    |
| `components/PostHogWrapper.tsx`                     | Dynamic import with `ssr: false`, forwards children                    |
| `components/PostHogIdentify.tsx`                    | Calls `posthog.identify()` / `posthog.reset()` based on auth + consent |
| `components/CookieConsentBanner.tsx`                | Accept/Decline UI, calls `setConsentStatus()`                          |
| `lib/analytics.ts`                                  | Typed `trackWaitlistSignup()`, `trackCtaClicked()`, etc.               |
| `lib/email/waitlistConfirmation.ts`                 | HTML email template + `sendWaitlistConfirmation()`                     |
| `app/api/waitlist/route.ts`                         | Waitlist endpoint: validate, rate limit, upsert, email, audience sync  |
| `supabase/migrations/040_create_waitlist_table.sql` | Waitlist table DDL                                                     |

---

### Task 1: Install packages

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install posthog-js and disposable-email-domains**

```bash
npm install posthog-js disposable-email-domains
```

- [ ] **Step 2: Verify installation**

```bash
ls node_modules/posthog-js/package.json && echo "posthog-js OK"
ls node_modules/disposable-email-domains/package.json && echo "disposable-email-domains OK"
```

Expected: Both files exist and print OK.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add posthog-js and disposable-email-domains"
```

---

### Task 2: Cookie consent utility

**Files:**

- Create: `lib/cookieConsent.ts`
- Create: `lib/cookieConsent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/cookieConsent.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Mock CustomEvent + dispatchEvent
const dispatchEventSpy = vi.fn()
Object.defineProperty(globalThis, 'dispatchEvent', { value: dispatchEventSpy })

import { getConsentStatus, setConsentStatus, clearConsentStatus, CONSENT_KEY, CONSENT_EVENT } from './cookieConsent'

describe('cookieConsent', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('returns null when no consent stored', () => {
    expect(getConsentStatus()).toBeNull()
  })

  it('returns accepted when stored', () => {
    localStorageMock.setItem(CONSENT_KEY, 'accepted')
    expect(getConsentStatus()).toBe('accepted')
  })

  it('returns declined when stored', () => {
    localStorageMock.setItem(CONSENT_KEY, 'declined')
    expect(getConsentStatus()).toBe('declined')
  })

  it('setConsentStatus writes to localStorage and dispatches event', () => {
    setConsentStatus('accepted')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(CONSENT_KEY, 'accepted')
    expect(dispatchEventSpy).toHaveBeenCalledOnce()
    const event = dispatchEventSpy.mock.calls[0][0]
    expect(event.type).toBe(CONSENT_EVENT)
    expect(event.detail).toEqual({ status: 'accepted' })
  })

  it('clearConsentStatus removes from localStorage', () => {
    localStorageMock.setItem(CONSENT_KEY, 'accepted')
    clearConsentStatus()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(CONSENT_KEY)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/cookieConsent.test.ts`
Expected: FAIL — module `./cookieConsent` not found.

- [ ] **Step 3: Write the implementation**

Create `lib/cookieConsent.ts`:

```typescript
export type ConsentStatus = 'accepted' | 'declined' | null

export const CONSENT_KEY = 'lp-cookie-consent'
export const CONSENT_EVENT = 'cookie-consent-changed'

export function getConsentStatus(): ConsentStatus {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    if (value === 'accepted' || value === 'declined') return value
    return null
  } catch {
    return null
  }
}

export function setConsentStatus(status: 'accepted' | 'declined'): void {
  try {
    localStorage.setItem(CONSENT_KEY, status)
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { status } }))
  } catch {
    // Private browsing or SSR
  }
}

export function clearConsentStatus(): void {
  try {
    localStorage.removeItem(CONSENT_KEY)
  } catch {
    // Private browsing or SSR
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/cookieConsent.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cookieConsent.ts lib/cookieConsent.test.ts
git commit -m "feat: add cookie consent utility with tests"
```

---

### Task 3: PostHog provider + wrapper + pageview

**Files:**

- Create: `components/PostHogProvider.tsx`
- Create: `components/PostHogWrapper.tsx`

**Docs to check:** posthog-js React integration docs for `PHProvider` from `posthog-js/react` and manual pageview capture pattern for Next.js App Router.

- [ ] **Step 1: Create PostHogProvider**

Create `components/PostHogProvider.tsx`:

```tsx
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
      capture_pageview: false, // manual via PostHogPageView
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
```

- [ ] **Step 2: Create PostHogWrapper**

Create `components/PostHogWrapper.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'

const PostHogProvider = dynamic(() => import('@/components/PostHogProvider').then((mod) => mod.PostHogProvider), {
  ssr: false,
})

export function PostHogWrapper({ children }: { children: React.ReactNode }) {
  return <PostHogProvider>{children}</PostHogProvider>
}
```

- [ ] **Step 3: Verify files compile**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "PostHog|cookieConsent" | head -5`
Expected: No type errors related to these files (warnings from other files are OK).

- [ ] **Step 4: Commit**

```bash
git add components/PostHogProvider.tsx components/PostHogWrapper.tsx
git commit -m "feat: add PostHog provider with consent-aware init and manual pageview"
```

---

### Task 4: PostHog identify component

**Files:**

- Create: `components/PostHogIdentify.tsx`

- [ ] **Step 1: Create PostHogIdentify**

Create `components/PostHogIdentify.tsx`:

```tsx
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

    // Re-identify when consent changes
    window.addEventListener(CONSENT_EVENT, identify)
    return () => window.removeEventListener(CONSENT_EVENT, identify)
  }, [user, posthog])

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PostHogIdentify.tsx
git commit -m "feat: add PostHog identify component for auth-aware user tracking"
```

---

### Task 5: Cookie consent banner

**Files:**

- Create: `components/CookieConsentBanner.tsx`

- [ ] **Step 1: Create CookieConsentBanner**

Create `components/CookieConsentBanner.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { getConsentStatus, setConsentStatus } from '@/lib/cookieConsent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if no choice has been made
    if (getConsentStatus() === null) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const handleChoice = (status: 'accepted' | 'declined') => {
    setConsentStatus(status)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-lg mx-auto card p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 pointer-events-auto border border-surface-border shadow-lg">
        <p className="text-sm text-text-secondary flex-1 text-center sm:text-left">
          We use cookies to understand how people find and use Link Party.
        </p>
        <div className="flex gap-3 shrink-0">
          <button onClick={() => handleChoice('declined')} className="btn btn-secondary text-xs px-4 py-1.5">
            Decline
          </button>
          <button onClick={() => handleChoice('accepted')} className="btn btn-primary text-xs px-4 py-1.5">
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/CookieConsentBanner.tsx
git commit -m "feat: add cookie consent banner component"
```

---

### Task 6: Wire PostHog into providers and layout

**Files:**

- Modify: `app/providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add PostHogWrapper and PostHogIdentify to providers.tsx**

In `app/providers.tsx`, add imports and wrap children:

```diff
 'use client'

 import { AuthProvider } from '@/contexts/AuthContext'
 import { ErrorProvider } from '@/contexts/ErrorContext'
+import { PostHogWrapper } from '@/components/PostHogWrapper'
+import { PostHogIdentify } from '@/components/PostHogIdentify'
 import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
 import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
 import { InstallPrompt } from '@/components/ui/InstallPrompt'

 interface ProvidersProps {
   children: React.ReactNode
 }

 export function Providers({ children }: ProvidersProps) {
   return (
     <ErrorProvider>
       <AuthProvider>
-        <ServiceWorkerRegistration />
-        <OfflineIndicator />
-        <InstallPrompt />
-        {children}
+        <PostHogWrapper>
+          <PostHogIdentify />
+          <ServiceWorkerRegistration />
+          <OfflineIndicator />
+          <InstallPrompt />
+          {children}
+        </PostHogWrapper>
       </AuthProvider>
     </ErrorProvider>
   )
 }
```

- [ ] **Step 2: Add CookieConsentBanner to layout.tsx**

In `app/layout.tsx`, add the banner import and render it alongside `<Analytics />`:

Add import at top:

```typescript
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
```

In the body, inside `<ErrorBoundary>` but before `<Providers>` (line 91), add:

```tsx
        <ErrorBoundary>
          <CookieConsentBanner />
          <Providers>
```

This places the banner inside the error boundary for crash safety, but outside `<Providers>` since it doesn't depend on auth or other context.

- [ ] **Step 3: Verify build compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds (may warn about missing PostHog env vars — that's expected).

- [ ] **Step 4: Commit**

```bash
git add app/providers.tsx app/layout.tsx
git commit -m "feat: wire PostHog provider and cookie consent banner into app shell"
```

---

### Task 7: Analytics tracking utility

**Files:**

- Create: `lib/analytics.ts`
- Create: `lib/analytics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/analytics.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/analytics.test.ts`
Expected: FAIL — module `./analytics` not found.

- [ ] **Step 3: Write the implementation**

Create `lib/analytics.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/analytics.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics.ts lib/analytics.test.ts
git commit -m "feat: add typed PostHog analytics tracking functions with tests"
```

---

### Task 8: Waitlist database migration

**Files:**

- Create: `supabase/migrations/040_create_waitlist_table.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/040_create_waitlist_table.sql`:

```sql
-- Waitlist for beta signup lead capture
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  source VARCHAR(50) NOT NULL DEFAULT 'landing_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

CREATE INDEX waitlist_created_at_idx ON public.waitlist (created_at DESC);

-- RLS: only service_role can read/write (no public access)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.waitlist
  FOR ALL USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Verify SQL syntax**

Run: `cat supabase/migrations/040_create_waitlist_table.sql`
Expected: Clean SQL, no syntax issues.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/040_create_waitlist_table.sql
git commit -m "feat: add waitlist table migration"
```

**Note:** Apply this migration to all environments (staging + production) after merging. Run `supabase db push` or apply via dashboard.

---

### Task 9: Waitlist confirmation email

**Files:**

- Create: `lib/email/waitlistConfirmation.ts` (note: this creates a `lib/email/` directory alongside the existing `lib/email.ts` file — both resolve correctly via `@/lib/email` and `@/lib/email/waitlistConfirmation`)
- Create: `lib/email/waitlistConfirmation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/email/waitlistConfirmation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSendEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

const originalEnv = process.env

describe('waitlistConfirmation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv, APP_URL: 'https://linkparty.app' }
    mockSendEmail.mockResolvedValue({ success: true, id: 'email-123' })
  })

  it('sends confirmation email with name', async () => {
    const { sendWaitlistConfirmation } = await import('./waitlistConfirmation')
    const result = await sendWaitlistConfirmation('test@example.com', 'Alice')

    expect(mockSendEmail).toHaveBeenCalledOnce()
    const call = mockSendEmail.mock.calls[0][0]
    expect(call.to).toBe('test@example.com')
    expect(call.subject).toBe("You're on the Link Party waitlist!")
    expect(call.html).toContain('Alice')
    expect(call.html).toContain('https://linkparty.app')
    expect(call.text).toContain('Alice')
    expect(call.tags).toEqual([{ name: 'type', value: 'waitlist-confirmation' }])
    expect(result).toEqual({ success: true, id: 'email-123' })
  })

  it('sends confirmation email without name (fallback greeting)', async () => {
    const { sendWaitlistConfirmation } = await import('./waitlistConfirmation')
    await sendWaitlistConfirmation('test@example.com')

    const call = mockSendEmail.mock.calls[0][0]
    expect(call.html).toContain('Hey there')
    expect(call.html).not.toContain('undefined')
  })

  it('escapes HTML in name to prevent XSS', async () => {
    const { sendWaitlistConfirmation } = await import('./waitlistConfirmation')
    await sendWaitlistConfirmation('test@example.com', '<script>alert("xss")</script>')

    const call = mockSendEmail.mock.calls[0][0]
    expect(call.html).not.toContain('<script>')
    expect(call.html).toContain('&lt;script&gt;')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/email/waitlistConfirmation.test.ts`
Expected: FAIL — module `./waitlistConfirmation` not found.

- [ ] **Step 3: Write the implementation**

Create `lib/email/waitlistConfirmation.ts`:

```typescript
import { sendEmail } from '@/lib/email'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const getBaseUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  return 'http://localhost:3000'
}

function generateHtml(name?: string): string {
  const greeting = name ? escapeHtml(name) : 'Hey there'
  const baseUrl = getBaseUrl()

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Link Party waitlist!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #171717; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Link Party</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">Share content together in real-time</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #ffffff;">
                ${greeting}, you're on the list!
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                Thanks for joining the Link Party waitlist. We're building a better way to share and watch content with your crew — no more links lost in group chats.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
                We'll keep you posted as we ship new features.
              </p>
              <a href="${escapeHtml(baseUrl)}" style="display: block; width: 100%; padding: 16px 24px; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; text-align: center; font-size: 16px; font-weight: 600; border-radius: 8px; box-sizing: border-box;">
                Check out Link Party
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #525252;">
                You received this email because you joined the Link Party waitlist. If this wasn't you, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function generateText(name?: string): string {
  const greeting = name || 'Hey there'
  const baseUrl = getBaseUrl()

  return `${greeting}, you're on the list!

Thanks for joining the Link Party waitlist. We're building a better way to share and watch content with your crew — no more links lost in group chats.

We'll keep you posted as we ship new features.

Check out Link Party: ${baseUrl}

---
You received this email because you joined the Link Party waitlist. If this wasn't you, you can safely ignore it.`
}

export async function sendWaitlistConfirmation(email: string, name?: string) {
  return sendEmail({
    to: email,
    subject: "You're on the Link Party waitlist!",
    html: generateHtml(name),
    text: generateText(name),
    tags: [{ name: 'type', value: 'waitlist-confirmation' }],
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/email/waitlistConfirmation.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/email/waitlistConfirmation.ts lib/email/waitlistConfirmation.test.ts
git commit -m "feat: add waitlist confirmation email template with tests"
```

---

### Task 10: Waitlist API route

**Files:**

- Create: `app/api/waitlist/route.ts`
- Create: `app/api/waitlist/route.test.ts`

**Key patterns to follow:** See `app/api/subscribe/route.ts` for CSRF + rate limit pattern, `app/api/emails/invite/route.test.ts` for test mock pattern.

**Note:** The `disposable-email-domains` package exports a plain JSON array with no type declarations. If the default import fails type-checking, add `declare module 'disposable-email-domains' { const domains: string[]; export default domains; }` to a `.d.ts` file or use `// @ts-expect-error`.

- [ ] **Step 1: Write the failing test**

Create `app/api/waitlist/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockUpsert = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  })),
}))

// Mock CSRF
vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
}))

// Mock email
const mockSendWaitlistConfirmation = vi.fn()
vi.mock('@/lib/email/waitlistConfirmation', () => ({
  sendWaitlistConfirmation: (...args: unknown[]) => mockSendWaitlistConfirmation(...args),
}))

const originalEnv = process.env

describe('Waitlist API Route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      RESEND_API_KEY: 're_test',
    }
    mockUpsert.mockResolvedValue({ data: [{ id: 'uuid-1' }], error: null })
    mockSendWaitlistConfirmation.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function makeRequest(body: Record<string, unknown>, ip = '127.0.0.1') {
    return new NextRequest('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(body),
    })
  }

  it('accepts valid email and returns success', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'test@gmail.com' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('rejects invalid email', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('rejects empty email', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: '' }))
    expect(res.status).toBe(400)
  })

  it('trims and lowercases email', async () => {
    const { POST } = await import('./route')
    await POST(makeRequest({ email: '  Test@Gmail.COM  ' }))
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@gmail.com' }), expect.anything())
  })

  it('rejects disposable emails', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ email: 'test@mailinator.com' }))
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toContain('disposable')
  })

  it('sends confirmation email on success', async () => {
    const { POST } = await import('./route')
    await POST(makeRequest({ email: 'test@gmail.com', name: 'Alice' }))
    expect(mockSendWaitlistConfirmation).toHaveBeenCalledWith('test@gmail.com', 'Alice')
  })

  it('rate limits by IP after 5 requests', async () => {
    const { POST } = await import('./route')
    const sameIp = '1.2.3.4'
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ email: `user${i}@gmail.com` }, sameIp))
      expect(res.status).toBe(200)
    }
    const res = await POST(makeRequest({ email: 'user5@gmail.com' }, sameIp))
    expect(res.status).toBe(429)
  })

  it('rate limits by email after 3 requests', async () => {
    const { POST } = await import('./route')
    for (let i = 0; i < 3; i++) {
      const res = await POST(makeRequest({ email: 'same@gmail.com' }, `10.0.0.${i}`))
      expect(res.status).toBe(200)
    }
    const res = await POST(makeRequest({ email: 'same@gmail.com' }, '10.0.0.99'))
    expect(res.status).toBe(429)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/waitlist/route.test.ts`
Expected: FAIL — module `./route` not found.

- [ ] **Step 3: Write the implementation**

Create `app/api/waitlist/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateOrigin } from '@/lib/csrf'
import { createRateLimiter } from '@/lib/serverRateLimit'
import disposableDomains from 'disposable-email-domains'
import { sendWaitlistConfirmation } from '@/lib/email/waitlistConfirmation'

export const dynamic = 'force-dynamic'

const ipLimiter = createRateLimiter({ maxRequests: 5, windowMs: 60 * 60 * 1000 })
const emailLimiter = createRateLimiter({ maxRequests: 3, windowMs: 60 * 60 * 1000 })

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const disposableSet = new Set(disposableDomains)

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { limited: ipLimited } = ipLimiter.check(ip)
    if (ipLimited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : undefined
    const source = typeof body.source === 'string' ? body.source.trim() : 'landing_page'

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    }

    // Rate limit by email
    const { limited: emailLimited } = emailLimiter.check(email)
    if (emailLimited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Block disposable emails
    const domain = email.split('@')[1]
    if (disposableSet.has(domain)) {
      return NextResponse.json({ error: 'Please use a non-disposable email address' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !serviceRoleKey) {
      // Mock mode — return success without DB
      return NextResponse.json({ success: true, waitlisted: true })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { error } = await supabase
      .from('waitlist')
      .upsert({ email, name: name || null, source }, { onConflict: 'email', ignoreDuplicates: true })

    if (error) {
      // Unique constraint race condition
      if (error.code === '23505') {
        return NextResponse.json({ success: true, waitlisted: false })
      }
      console.error('Waitlist insert error:', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    // Best-effort: send confirmation email (don't block response)
    sendWaitlistConfirmation(email, name).catch((err) => console.error('Waitlist confirmation email failed:', err))

    // Best-effort: sync to Resend audience
    syncToResendAudience(email, name).catch((err) => console.error('Resend audience sync failed:', err))

    return NextResponse.json({ success: true, waitlisted: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

async function syncToResendAudience(email: string, name?: string) {
  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_WAITLIST_AUDIENCE_ID
  if (!apiKey || !audienceId) return

  await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      first_name: name || undefined,
      unsubscribed: false,
    }),
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/waitlist/route.test.ts`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/waitlist/route.ts app/api/waitlist/route.test.ts
git commit -m "feat: add waitlist API route with dual rate limiting, disposable email blocking, and Resend sync"
```

---

### Task 11: Update EmailCapture component

**Files:**

- Modify: `components/landing/EmailCapture.tsx`

- [ ] **Step 1: Update EmailCapture to use waitlist API and PostHog tracking**

Replace the contents of `components/landing/EmailCapture.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { trackWaitlistSignup, trackWaitlistFailed } from '@/lib/analytics'

const STORAGE_KEY = 'lp-waitlist-joined'

function getInitialJoined(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}

export function EmailCapture() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [alreadyJoined] = useState(getInitialJoined)

  if (alreadyJoined || status === 'success') {
    return (
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16 sm:pb-24 text-center">
        <div className="card p-6 sm:p-8">
          <p className="text-accent-400 font-semibold">You&rsquo;re on the waitlist!</p>
          <p className="text-text-muted text-sm mt-1">We&rsquo;ll let you know when something cool ships.</p>
        </div>
      </section>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          name: name.trim() || undefined,
          source: 'landing_page',
        }),
      })
      if (res.ok) {
        setStatus('success')
        trackWaitlistSignup('landing_page')
        try {
          localStorage.setItem(STORAGE_KEY, '1')
        } catch {
          /* private browsing */
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || 'Something went wrong')
        setStatus('error')
        trackWaitlistFailed(data.error || 'unknown')
      }
    } catch {
      setErrorMsg('Something went wrong')
      setStatus('error')
      trackWaitlistFailed('network_error')
    }
  }

  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16 sm:pb-24 text-center">
      <div className="card p-6 sm:p-8">
        <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Join the waitlist
        </h3>
        <p className="text-text-muted text-sm mb-5">
          Drop your info to get early access &mdash; no spam, just updates.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full text-sm"
            maxLength={100}
          />
          <div className="flex flex-col sm:flex-row w-full gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full sm:flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn btn-primary text-sm px-6 py-2 whitespace-nowrap"
            >
              {status === 'loading' ? 'Joining...' : 'Join the waitlist'}
            </button>
          </div>
        </form>
        {status === 'error' && <p className="text-red-400 text-xs mt-2">{errorMsg}</p>}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep EmailCapture`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/EmailCapture.tsx
git commit -m "feat: update EmailCapture to use waitlist API with name field and PostHog tracking"
```

---

### Task 12: Add landing page section tracking

**Files:**

- Modify: `components/landing/LandingPage.tsx`

- [ ] **Step 1: Add PostHog tracking to CTAs and sections**

In `components/landing/LandingPage.tsx`, make these changes:

Replace the import at the top:

```diff
-import { track } from '@vercel/analytics'
+import { track } from '@vercel/analytics'
+import { trackCtaClicked, trackLandingSectionViewed } from '@/lib/analytics'
```

Add a section tracking hook component inside the file (before `LandingPage` function):

```typescript
function useSectionTracking(ref: React.RefObject<HTMLElement | null>, section: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackLandingSectionViewed(section)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, section])
}
```

Add `useRef` and `useEffect` to the existing imports from `react`:

```diff
+'use client'
+
+import { useRef, useEffect } from 'react'
```

Inside the `LandingPage` component, add refs and tracking:

```typescript
const heroRef = useRef<HTMLElement>(null)
const problemsRef = useRef<HTMLElement>(null)
const howItWorksRef = useRef<HTMLElement>(null)
const emailCaptureRef = useRef<HTMLElement>(null)

useSectionTracking(heroRef, 'hero')
useSectionTracking(problemsRef, 'sound_familiar')
useSectionTracking(howItWorksRef, 'how_it_works')
useSectionTracking(emailCaptureRef, 'email_capture')
```

Add `ref` attributes to the corresponding `<section>` elements:

- Hero section (line ~101): `ref={heroRef}`
- Sound Familiar section (line ~140): `ref={problemsRef}`
- How It Works section (line ~159): `ref={howItWorksRef}`
- The `<EmailCapture />` parent doesn't have a section — wrap it or add a div with ref

Update CTA onClick handlers to also fire PostHog events:

```typescript
// Hero "Start a Party" (line ~117)
onClick={() => { track('cta_start_party_hero'); trackCtaClicked('start_party', 'hero') }}

// Hero "Join with Code" (line ~127)
onClick={() => { track('cta_join_with_code'); trackCtaClicked('join_with_code', 'hero') }}

// Bottom "Start a Party" (line ~194)
onClick={() => { track('cta_start_party_bottom'); trackCtaClicked('start_party', 'bottom_cta') }}

// Bottom "Join with Code" (line ~200)
onClick={() => { track('cta_join_with_code_bottom'); trackCtaClicked('join_with_code', 'bottom_cta') }}
```

Keep the existing `track()` calls from `@vercel/analytics` alongside the new PostHog calls.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep LandingPage`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/LandingPage.tsx
git commit -m "feat: add PostHog CTA click and section view tracking to landing page"
```

---

### Task 13: Remove old subscribe route + update env example

**Files:**

- Delete: `app/api/subscribe/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Delete the old subscribe route**

```bash
rm app/api/subscribe/route.ts
```

- [ ] **Step 2: Update .env.example with new variables**

Add these entries to `.env.example`:

```
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Waitlist (Resend Audience)
RESEND_WAITLIST_AUDIENCE_ID=aud_your-audience-id
```

- [ ] **Step 3: Run full lint + type check**

Run: `npm run lint && npx tsc --noEmit`
Expected: No errors. Warnings from unrelated files are OK.

- [ ] **Step 4: Run all tests**

Run: `npm run test`
Expected: All tests pass (existing + new ones from this plan).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old subscribe route, update .env.example with PostHog and waitlist vars"
```

---

### Task 14: Manual setup + smoke test

These steps require human action and cannot be automated:

- [ ] **Step 1: Create PostHog project**

Go to https://us.posthog.com → New Project → Name: "Link Party" → Copy the project API key.

- [ ] **Step 2: Create Resend audience**

Go to Resend dashboard → Audiences → Create → Name: "Link Party Waitlist" → Copy the audience ID.

- [ ] **Step 3: Add env vars to Vercel**

```bash
vercel env add NEXT_PUBLIC_POSTHOG_KEY
vercel env add NEXT_PUBLIC_POSTHOG_HOST
vercel env add RESEND_WAITLIST_AUDIENCE_ID
```

Or add via Vercel dashboard. Values:

- `NEXT_PUBLIC_POSTHOG_KEY` = the API key from step 1
- `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com`
- `RESEND_WAITLIST_AUDIENCE_ID` = the audience ID from step 2

- [ ] **Step 4: Apply database migration**

Run `supabase db push` or apply `040_create_waitlist_table.sql` via Supabase dashboard to staging and production.

- [ ] **Step 5: Deploy and verify**

Deploy to preview, then verify:

1. Cookie consent banner appears on first visit
2. Accepting consent → pageview events appear in PostHog
3. Declining consent → no events in PostHog
4. Submitting waitlist form → `waitlist_signup` event in PostHog
5. Submitting waitlist form → row in `waitlist` table
6. Submitting waitlist form → confirmation email received
7. Submitting disposable email → rejected with error message
8. Clicking CTAs → `cta_clicked` events in PostHog
