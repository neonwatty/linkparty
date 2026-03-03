# Funnel Audit Tracking

Top-of-funnel marketing audit. 7 categories to cover.

## Categories

| #   | Category                       | Status      |
| --- | ------------------------------ | ----------- |
| 1   | CTAs & Conversion Points       | Completed   |
| 2   | Referral & Viral Mechanics     | Not Started |
| 3   | Email Capture & Lead Nurture   | Not Started |
| 4   | Onboarding & Activation        | Not Started |
| 5   | SEO & Content Discoverability  | Not Started |
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
