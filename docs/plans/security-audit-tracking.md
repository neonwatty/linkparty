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
