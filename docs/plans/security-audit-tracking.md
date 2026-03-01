# Security Audit Tracking

Automated OWASP-aligned security audit. 10 categories to cover.

---

## Iteration Log

### Iteration 1 (2026-02-28)

**Categories Audited:** Auth & Access Control (A01), Input Validation (A03)
**Findings:** 5 (2 HIGH, 1 MEDIUM, 2 LOW)
**Fixed:** 5
**Deferred:** 0

#### Fixed

- [x] String interpolation in `.or()` PostgREST filter in `app/api/users/block/route.ts` — replaced with two parameterized `.eq()` queries (category: Input Validation, severity: HIGH)
- [x] String interpolation in `.or()` PostgREST filters (2 instances) in `app/api/friends/request/route.ts` — replaced with parameterized `.eq()` queries (category: Input Validation, severity: HIGH)
- [x] String interpolation in `.or()` PostgREST filter in `lib/friends.ts` `getFriendshipStatus()` — replaced with parameterized `.eq()` queries (category: Input Validation, severity: HIGH)
- [x] Missing max-length validation (5000 chars) on `noteContent` in PATCH `app/api/queue/items/[id]/route.ts` (category: Input Validation, severity: MEDIUM)
- [x] Lenient `dueDate` validation in PATCH `app/api/queue/items/[id]/route.ts` — added format check and 30-char max length (category: Input Validation, severity: LOW)

#### Not Issues (False Positives)

- Cron cleanup endpoint (`app/api/cron/cleanup/route.ts`) missing `validateOrigin()` — NOT a real finding. Vercel cron jobs don't send Origin headers; `CRON_SECRET` bearer token is the standard Vercel auth pattern.

#### Categories Remaining

- Authorization & Row-Level Security (A01)
- Secret Management (A02)
- Security Headers (A05)
- Dependency Vulnerabilities (A06)
- Rate Limiting (A04)
- Error Handling (A09)
- CSRF/Session (A07)
- Data Exposure (A02)

### Iteration 2 (2026-02-28)

**Categories Audited:** Secret Management (A02), Error Handling (A09)
**Findings:** 4 (0 HIGH, 4 MEDIUM)
**Fixed:** 4
**Deferred:** 0

#### Fixed

- [x] Edge function returns raw error `${err}` to client in `supabase/functions/fetch-content-metadata/index.ts` — replaced with generic "Internal server error" (category: Error Handling, severity: MEDIUM)
- [x] Email invite route exposes `result.error` from email service to client in `app/api/emails/invite/route.ts` — replaced with generic "Failed to send invitation" (category: Error Handling, severity: MEDIUM)
- [x] Raw Supabase `error.message` returned to client in `lib/profile.ts` — replaced with generic "Failed to update profile" (category: Error Handling, severity: MEDIUM)
- [x] Raw Supabase `error.message` returned to client (2x) in `lib/notifications.ts` — replaced with generic error messages (category: Error Handling, severity: MEDIUM)

#### Not Issues (False Positives)

- `.env.local` containing production secrets — file is properly in `.gitignore`, standard Next.js local dev pattern
- `console.error` logging database error details — server-side logging is standard debugging practice, not exposed to clients

#### Categories Remaining

- Authorization & Row-Level Security (A01)
- Security Headers (A05)
- Dependency Vulnerabilities (A06)
- Rate Limiting (A04)
- CSRF/Session (A07)
- Data Exposure (A02)

### Iteration 3 (2026-02-28)

**Categories Audited:** Dependency Vulnerabilities (A06), Rate Limiting (A04)
**Findings:** 2 (0 HIGH, 1 MEDIUM, 1 LOW)
**Fixed:** 1
**Deferred:** 1

#### Fixed

- [x] Missing rate limiting on friend invite endpoint `app/api/parties/invite-friends/route.ts` — added server-side rate limiter (5 requests/hour per user) with 429 response and Retry-After header (category: Rate Limiting, severity: MEDIUM)

#### Deferred

- [ ] 4 HIGH npm vulnerabilities in `minimatch` via `semantic-release` chain (dev-only) — fix requires breaking major version change to `semantic-release` (category: Dependency Vulnerabilities, severity: HIGH, reason: dev-only dependency, breaking change required)

#### Not Issues (False Positives)

- Auth callback (`app/auth/callback/page.tsx`) has no rate limiting — OAuth authorization codes are single-use and short-lived, rate limiting is unnecessary
- All other public API endpoints already have rate limiting applied

#### Categories Remaining

- Authorization & Row-Level Security (A01)
- Security Headers (A05)
- CSRF/Session (A07)
- Data Exposure (A02)
