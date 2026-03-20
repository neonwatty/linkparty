# PostHog Integration + Waitlist Upgrade

**Date:** 2026-03-20
**Status:** Approved
**Approach:** Hybrid (Approach C) — seatify-style PostHog provider + linkparty-style API route for waitlist

---

## Goals

- Add PostHog analytics to track the landing page funnel: visitor → waitlist signup → authenticated user
- Replace the existing newsletter subscriber flow with a robust waitlist (seatify pattern)
- Send confirmation emails via Resend when users join the waitlist
- GDPR-compliant consent-first tracking with cookie consent banner
- Lay the foundation for future feature usage analytics (not in scope now)

## Non-Goals

- Feature usage analytics (party interactions, queue usage, TV mode) — future work
- Migrating existing `newsletter_subscribers` data into the new `waitlist` table — manual if needed
- A/B testing or feature flags — future work
- Server-side PostHog (Node SDK) — client-side only for now
- Privacy policy page — prerequisite, but not part of this work

---

## 1. PostHog Integration

### 1.1 Cookie Consent Utility

**New: `lib/cookieConsent.ts`**

Shared utility for consent state management, imported by both PostHogProvider and CookieConsentBanner:

- `ConsentStatus` type: `'accepted' | 'declined' | null`
- `CONSENT_KEY` constant: `'lp-cookie-consent'`
- `CONSENT_EVENT` constant: `'cookie-consent-changed'`
- `getConsentStatus(): ConsentStatus` — reads from localStorage
- `setConsentStatus(status: 'accepted' | 'declined'): void` — writes to localStorage and dispatches `CustomEvent(CONSENT_EVENT, { detail: { status } })`
- `clearConsentStatus(): void` — removes from localStorage

### 1.2 Provider Architecture

Four client components, matching seatify's pattern:

**`components/PostHogProvider.tsx`**

- Initializes `posthog-js` with `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`
- Wraps children in `<PHProvider client={posthog}>` from `posthog-js/react` to make the instance available via `usePostHog()` hook
- Default config: `persistence: 'memory'`, `autocapture: false`, `capture_pageview: false`
- Reads initial consent via `getConsentStatus()` from `lib/cookieConsent.ts`
- Listens for `CONSENT_EVENT` CustomEvent from `lib/cookieConsent.ts`
- On consent accepted: upgrades persistence to `'localStorage+cookie'`, calls `posthog.opt_in_capturing()`
- On consent declined: calls `posthog.opt_out_capturing()`
- Contains a `PostHogPageView` sub-component (wrapped in `Suspense`) that manually captures `$pageview` on `usePathname()` changes — required because App Router client-side navigation doesn't trigger automatic pageviews

**`components/PostHogWrapper.tsx`**

- Dynamic import of PostHogProvider with `ssr: false` and no loading fallback
- Accepts and forwards `children` so it can wrap the component tree in `providers.tsx`

**`components/PostHogIdentify.tsx`**

- Reads user from `AuthContext` and consent status from `lib/cookieConsent.ts`
- When user is authenticated AND consent is `'accepted'`: `posthog.identify(userId, { email })`
- On logout (user becomes null): `posthog.reset()`
- Renders as a sibling in the provider tree (does not wrap children)
- Uses `usePostHog()` hook from `posthog-js/react`

**`components/CookieConsentBanner.tsx`**

- Fixed bottom banner, dark themed to match linkparty's aesthetic
- Two buttons: "Accept" and "Decline"
- Uses `getConsentStatus()` and `setConsentStatus()` from `lib/cookieConsent.ts`
- Does not render if choice already stored
- Renders in `app/layout.tsx` as a sibling to `<Analytics />`

### 1.3 Analytics Utility

**New: `lib/analytics.ts`**

- Lazy-loads PostHog instance via `posthog-js`
- Exports typed tracking functions:

```typescript
trackWaitlistSignup(source: string): void
// captures 'waitlist_signup' with { source, $set: { waitlist: true } }
// NOTE: no email/PII in event properties — user association happens via posthog.identify() only

trackWaitlistFailed(reason: string): void
// captures 'waitlist_signup_failed' with { reason }

trackCtaClicked(cta: string, location: string): void
// captures 'cta_clicked' with { cta, location }

trackLandingSectionViewed(section: string): void
// captures 'landing_section_viewed' with { section }
```

### 1.4 Landing Page Instrumentation

**`components/landing/LandingPage.tsx`** modifications:

- Add `trackCtaClicked()` to "Create a Party" and "Join a Party" CTAs
- Add `trackLandingSectionViewed()` using an IntersectionObserver for each major section (hero, features, how-it-works, email capture)

### 1.5 Environment Variables (via Vercel)

| Variable                   | Scope  | Description                |
| -------------------------- | ------ | -------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Client | PostHog project API key    |
| `NEXT_PUBLIC_POSTHOG_HOST` | Client | `https://us.i.posthog.com` |

### 1.6 Package

- `posthog-js` (latest)

---

## 2. Waitlist

### 2.1 Database

**New migration: `supabase/migrations/040_create_waitlist_table.sql`**

```sql
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  source VARCHAR(50) NOT NULL DEFAULT 'landing_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

CREATE INDEX waitlist_created_at_idx ON public.waitlist (created_at DESC);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.waitlist
  FOR ALL USING (auth.role() = 'service_role');
```

### 2.2 API Route

**New: `app/api/waitlist/route.ts`**

Request body (validated manually, consistent with existing codebase patterns — no Zod):

```typescript
{
  email: string    // required, valid email format
  name?: string    // optional, max 100 chars, trimmed
  source?: string  // optional, defaults to 'landing_page'
}
```

Processing pipeline:

1. CSRF validation via `validateOrigin()` from `@/lib/csrf`
2. Rate limiting — dual, both using `createRateLimiter` from `@/lib/serverRateLimit`:
   - IP-based: 5 requests per hour
   - Email-based: 3 requests per hour (separate limiter instance, keyed by normalized email)
3. Manual input validation (email regex, name length, type checks) — consistent with existing `/api/subscribe` and `lib/validation.ts` patterns
4. Disposable email check via `disposable-email-domains` package
5. Upsert to `waitlist` table (catch unique constraint error code `23505` for race conditions)
6. Resend audience sync — raw `fetch` to Resend API to add contact to `RESEND_WAITLIST_AUDIENCE_ID` (best-effort, non-blocking). Uses the same raw fetch pattern as existing `lib/email.ts`.
7. Send confirmation email via `sendWaitlistConfirmation()` (best-effort, non-blocking)

Response:

```typescript
{ success: true, waitlisted: true }     // new signup
{ success: true, waitlisted: false }    // already on list (upsert no-op)
{ error: string, status: 400|403|429 }  // validation/rate limit failure
```

### 2.3 Confirmation Email

**New: `lib/email/waitlistConfirmation.ts`**

Raw HTML string template, consistent with existing `lib/email.ts` party invitation pattern:

- Subject: "You're on the Link Party waitlist!"
- Personalized greeting (uses name if provided, otherwise "Hey there")
- Brief message: what Link Party is, that they're on the list
- CTA button: "Check out Link Party" → `https://linkparty.app`
- Dark themed, matches linkparty's purple accent
- Footer with unsubscribe-friendly text
- Uses `escapeHtml()` for user-provided strings (name, email)
- Exports `sendWaitlistConfirmation(email: string, name?: string)` which calls the existing `sendEmail()` from `lib/email.ts`

**Note:** This follows the existing raw HTML email pattern rather than introducing React Email. If we want to migrate to React Email later, that's a separate effort that should convert all email templates at once.

### 2.4 Updated EmailCapture Component

**Modified: `components/landing/EmailCapture.tsx`**

Changes:

- POST to `/api/waitlist` instead of `/api/subscribe`
- Add optional name input field
- Replace `track('email_subscribe')` with `trackWaitlistSignup()` from `lib/analytics.ts`
- Update success message copy
- Update localStorage key to `'lp-waitlist-joined'`

### 2.5 Packages

- `disposable-email-domains` — blocklist of throwaway email providers

### 2.6 Environment Variables (via Vercel)

| Variable                      | Scope  | Description                           |
| ----------------------------- | ------ | ------------------------------------- |
| `RESEND_WAITLIST_AUDIENCE_ID` | Server | Resend audience for waitlist contacts |

---

## 3. Cleanup

### 3.1 Remove `/api/subscribe`

Delete `app/api/subscribe/route.ts`. The `EmailCapture` component is the sole consumer and will be updated to use `/api/waitlist`.

### 3.2 Keep `newsletter_subscribers` Table

No destructive migration. The table stays but is no longer written to by application code. Can be dropped manually later if desired.

### 3.3 Provider Tree Order

```
ErrorProvider
  └── AuthProvider
        └── PostHogWrapper (wraps children, provides PHProvider context)
              ├── PostHogIdentify (sibling, reads auth + consent, no children)
              ├── ServiceWorkerRegistration
              ├── OfflineIndicator
              ├── InstallPrompt
              └── {children}
```

PostHogWrapper wraps children so `PHProvider` context is available to PostHogIdentify and all descendants. PostHogIdentify reads from AuthContext (must be inside AuthProvider) and uses `usePostHog()` hook (must be inside PostHogWrapper/PHProvider).

---

## 4. Manual Steps (Not Code)

1. **Create PostHog project** — go to us.posthog.com, create project "Link Party", copy API key
2. **Add env vars to Vercel** — `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `RESEND_WAITLIST_AUDIENCE_ID`
3. **Create Resend audience** — create a "Link Party Waitlist" audience in Resend, copy ID
4. **Apply migration** — run `supabase db push` or apply via Supabase dashboard to all environments
5. **Verify in PostHog** — after deploy, check that pageview events appear and waitlist signup fires correctly

---

## 5. Testing

Unit tests expected for:

- `app/api/waitlist/route.ts` — test validation, rate limiting, disposable email blocking, success/duplicate paths
- `lib/email/waitlistConfirmation.ts` — test HTML output, escaping, personalization
- `lib/cookieConsent.ts` — test get/set/clear and event dispatch
- `lib/analytics.ts` — test that tracking functions call posthog.capture with correct event names and properties

---

## File Summary

| Action | File                                                | Purpose                              |
| ------ | --------------------------------------------------- | ------------------------------------ |
| Create | `lib/cookieConsent.ts`                              | Shared consent state utility         |
| Create | `components/PostHogProvider.tsx`                    | PostHog init with consent + pageview |
| Create | `components/PostHogWrapper.tsx`                     | SSR-safe dynamic import              |
| Create | `components/PostHogIdentify.tsx`                    | User identification                  |
| Create | `components/CookieConsentBanner.tsx`                | Consent UI                           |
| Create | `lib/analytics.ts`                                  | Typed tracking functions             |
| Create | `lib/email/waitlistConfirmation.ts`                 | Confirmation email (HTML template)   |
| Create | `app/api/waitlist/route.ts`                         | Waitlist API endpoint                |
| Create | `supabase/migrations/040_create_waitlist_table.sql` | Waitlist table                       |
| Modify | `app/providers.tsx`                                 | Add PostHogWrapper + PostHogIdentify |
| Modify | `app/layout.tsx`                                    | Add CookieConsentBanner              |
| Modify | `components/landing/LandingPage.tsx`                | Add CTA + section tracking           |
| Modify | `components/landing/EmailCapture.tsx`               | Point to /api/waitlist, add name     |
| Modify | `.env.example`                                      | Add new env var entries              |
| Delete | `app/api/subscribe/route.ts`                        | Replaced by /api/waitlist            |

**New packages:** `posthog-js`, `disposable-email-domains`
