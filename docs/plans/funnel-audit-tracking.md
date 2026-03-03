# Funnel Audit Tracking

Top-of-funnel marketing audit. 7 categories to cover.

## Categories

| #   | Category                       | Status      |
| --- | ------------------------------ | ----------- |
| 1   | CTAs & Conversion Points       | Completed   |
| 2   | Referral & Viral Mechanics     | Completed   |
| 3   | Email Capture & Lead Nurture   | Completed   |
| 4   | Onboarding & Activation        | Completed   |
| 5   | SEO & Content Discoverability  | Completed   |
| 6   | Demo-to-Signup Funnel          | Not Started |
| 7   | Shareable & Exportable Content | Not Started |

---

## Iteration Log

### Iteration 1 (2026-03-02)

**Category:** CTAs & Conversion Points
**Findings:** 5 total (2 HIGH, 2 MEDIUM, 1 LOW)
**Fixed:** 4
**Deferred:** 1

#### Fixed

- [x] [HIGH] Restored public landing page — `LandingPage` component existed but was never rendered; unauthenticated visitors went straight to `/login`. Made `/` a public route and conditionally render `LandingPage` vs `AppHome` based on auth state.
- [x] [HIGH] History empty state dead end — added "Start a Party" and "Join with Code" CTA buttons to the empty history state.
- [x] [MEDIUM] Login page lacked value proposition — updated sub-headline from "Sign in to access your party history" to "Sign in to start sharing links with your crew".
- [x] [MEDIUM] Landing page bottom CTA missing secondary action — added "Join with Code" button alongside "Start a Party" and moved "Already have an account?" to a separate line with styled sign-in link.

#### Deferred

- [ ] [LOW] Footer on landing page is minimal (only "Link Party" text, no links) — low priority, acceptable for current stage.

#### Categories Remaining

- Referral & Viral Mechanics
- Email Capture & Lead Nurture
- Onboarding & Activation
- SEO & Content Discoverability
- Demo-to-Signup Funnel
- Shareable & Exportable Content

### Iteration 2 (2026-03-03)

**Category:** Referral & Viral Mechanics
**Findings:** 5 total (1 HIGH, 2 MEDIUM, 2 LOW)
**Fixed:** 3
**Deferred:** 2

#### Fixed

- [x] [HIGH] Join page URLs (`/join/[code]`) had no custom OG metadata — added `generateMetadata` with party-code-specific title, description, and OG/Twitter card metadata for rich link previews.
- [x] [MEDIUM] Share text in Web Share API was bare ("Join my Link Party with code ABC123") — improved to include value pitch: "one shared queue so nothing gets missed."
- [x] [MEDIUM] Landing page had no sharing/referral prompt — added "Tell a friend about Link Party" share button using Web Share API with clipboard fallback and analytics tracking.

#### Deferred

- [ ] [LOW] No social media share buttons (Twitter/X, etc.) on landing page — email invite + Web Share API cover primary use cases; social buttons add complexity for minimal gain at current scale.
- [ ] [LOW] Auto-friendship on invite claim has no visible user messaging — works silently; a celebration toast would be nice-to-have but not critical.

#### Categories Remaining

- Email Capture & Lead Nurture
- Onboarding & Activation
- SEO & Content Discoverability
- Demo-to-Signup Funnel
- Shareable & Exportable Content

### Iteration 3 (2026-03-03)

**Category:** Email Capture & Lead Nurture
**Findings:** 5 total (1 HIGH, 2 MEDIUM, 2 LOW)
**Fixed:** 3
**Deferred:** 2

#### Fixed

- [x] [HIGH] No email capture on landing page — visitors who didn't sign up were permanently lost. Added `EmailCapture` component with clear value prop ("Drop your email to hear about new features"), inline form, and analytics tracking.
- [x] [MEDIUM] No infrastructure to store captured emails — created `/api/subscribe` API route with Resend-compatible Supabase storage, CSRF protection, rate limiting (5/hr per IP), and email validation. Added `039_newsletter_subscribers.sql` migration.
- [x] [MEDIUM] No session-aware capture — added localStorage persistence (`lp-email-subscribed`) so subscribed visitors see a confirmation instead of the form on return visits.

#### Deferred

- [ ] [LOW] No exit-intent or scroll-depth triggers — adds complexity (mouse tracking, IntersectionObserver); the inline form captures most engaged visitors already.
- [ ] [LOW] No lead nurture sequences (drip campaigns) — requires email automation infrastructure beyond current stage.

#### Categories Remaining

- Onboarding & Activation
- SEO & Content Discoverability
- Demo-to-Signup Funnel
- Shareable & Exportable Content

### Iteration 4 (2026-03-03)

**Category:** Onboarding & Activation
**Findings:** 5 total (1 HIGH, 2 MEDIUM, 2 LOW)
**Fixed:** 1
**Deferred:** 4

#### Fixed

- [x] [HIGH] No first-run experience — new authenticated users landed on blank home page with no guidance. Added `GettingStarted` component showing numbered "How it works" steps (Start a party, Drop your links, Watch together) that appears on AppHome when no friend parties are active. Dismissable via localStorage.

#### Deferred

- [ ] [MEDIUM] No celebration moment after first party creation — adding toast/confetti requires modifying the complex PartyRoomClient; current redirect-to-room flow is functional.
- [ ] [MEDIUM] No progress indicators in onboarding — would require significant UX redesign across signup/create/join flows.
- [ ] [LOW] No skip option — no formal onboarding exists to skip; the app's minimal design means users can immediately start using it.
- [ ] [LOW] No personalized first-run using user data — limited personalization opportunities at current scale.

#### Categories Remaining

- SEO & Content Discoverability
- Demo-to-Signup Funnel
- Shareable & Exportable Content

### Iteration 5 (2026-03-03)

**Category:** SEO & Content Discoverability
**Findings:** 6 total (3 HIGH, 1 MEDIUM, 2 LOW)
**Fixed:** 4
**Deferred:** 2

#### Fixed

- [x] [HIGH] 5 public pages (login, signup, create, join, reset-password) had no server-side metadata — used client-side `document.title` only, invisible to crawlers. Added `layout.tsx` files with proper `Metadata` exports including title, description, OG, and Twitter cards.
- [x] [HIGH] No sitemap — created `app/sitemap.ts` with all 5 public URLs using Next.js `MetadataRoute.Sitemap` typed export.
- [x] [HIGH] No robots.txt — created `app/robots.ts` allowing public pages and disallowing private routes (`/api/`, `/party/`, `/history/`, `/profile/`, `/admin/`).
- [x] [MEDIUM] No structured data — added JSON-LD `WebApplication` schema to root `app/layout.tsx` with app name, URL, description, category, and free pricing.

#### Deferred

- [ ] [LOW] No explicit canonical URLs on individual pages — Next.js handles canonical via `metadataBase` in root layout; explicit per-page canonicals are redundant.
- [ ] [LOW] No breadcrumb or FAQ schema — limited value for a single-page-app-style product; WebApplication schema covers the primary use case.

#### Categories Remaining

- Demo-to-Signup Funnel
- Shareable & Exportable Content
