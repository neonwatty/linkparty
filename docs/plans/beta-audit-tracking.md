# Beta Audit Tracking

Holistic beta-readiness audit across feature completeness, error handling, UX polish, ops readiness, and performance.

---

## Iteration Log

### Iteration 1 (2026-03-01)

**Findings:** 90+ total across 5 dimensions (12 HIGH, 30+ MEDIUM, 40+ LOW)
**Code fixes applied:** 10
**Manual to-dos added:** 10
**Deferred:** 40+ LOW items

#### Fixed (Code)

- [x] Auth callback route missing error handling — silent redirect on failed OAuth exchange (dimension: error-handling, severity: HIGH)
- [x] ProfileTabs no error handling on data fetch — silent failure on friends/requests/blocked (dimension: error-handling, severity: HIGH)
- [x] ProfileTabs eagerly loads all 3 tabs on mount — now lazy-loads per active tab (dimension: performance, severity: MEDIUM)
- [x] E2E_MOCK_AUTH leak risk — could bypass auth in production if env var accidentally set (dimension: ops, severity: HIGH)
- [x] ErrorBoundary uses wrong color tokens (purple-600 instead of app theme) (dimension: polish, severity: MEDIUM)
- [x] Global error page uses non-existent bg-primary-600 class (dimension: polish, severity: MEDIUM)
- [x] Missing `<main>` landmark in layout — screen readers can't navigate to content (dimension: polish, severity: MEDIUM)
- [x] Missing skip-to-content link for keyboard users (dimension: polish, severity: MEDIUM)
- [x] Reset password allows submit with empty fields (dimension: error-handling, severity: MEDIUM)
- [x] Error input border color #f87171 fails WCAG contrast on dark surface — upgraded to #ff6b6b (dimension: polish, severity: MEDIUM)
- [x] AddContentModal URL input missing `<label>` element for screen readers (dimension: polish, severity: MEDIUM)
- [x] useOnlineStatus fires rapid health checks on network flicker — added debounce (dimension: performance, severity: MEDIUM)

#### Manual To-Dos Added

- Missing privacy policy and terms of service pages (dimension: feature, severity: HIGH)
- Set up Sentry error monitoring + SENTRY_DSN in Vercel (dimension: ops, severity: HIGH)
- Implement email bounce suppression list (dimension: ops, severity: HIGH)
- Add List-Unsubscribe headers to email invitations (dimension: ops, severity: HIGH)
- Set up Upstash Redis for distributed rate limiting (dimension: ops, severity: MEDIUM)
- Configure CRON_SECRET rotation policy (dimension: ops, severity: MEDIUM)
- Test Resend delivery with real domain + SPF/DKIM records (dimension: ops, severity: MEDIUM)
- Ensure Google OAuth callback URL in Supabase dashboard (dimension: ops, severity: MANUAL)
- Account deletion/data export endpoint for GDPR (dimension: feature, severity: HIGH)
- Email unsubscribe mechanism/endpoint (dimension: feature, severity: HIGH)

#### Deferred

- [ ] No tablet/desktop layout (dimension: polish, severity: LOW, not critical for mobile-first beta)
- [ ] Missing breadcrumb navigation (dimension: polish, severity: LOW)
- [ ] Password strength indicator on signup (dimension: polish, severity: LOW)
- [ ] Queue item deletion lacks undo option (dimension: feature, severity: LOW)
- [ ] TV mode missing exit confirmation dialog (dimension: polish, severity: LOW)
- [ ] Toast dismiss timing indicator (dimension: polish, severity: LOW)
- [ ] Character counters lack aria-live announcements (dimension: polish, severity: LOW)
- [ ] Image optimization hints in QueueListItem (dimension: performance, severity: LOW)
- [ ] PartyContext incomplete memo dependencies (dimension: performance, severity: LOW)
- [ ] Reconnection refetch cascade needs debounce (dimension: performance, severity: LOW)
- [ ] Reply-to header in transactional emails (dimension: ops, severity: LOW)
- [ ] Cron endpoint idempotency guard (dimension: ops, severity: LOW)
- [ ] Health check endpoint should test Resend/push config (dimension: ops, severity: LOW)
- [ ] NotificationDropdown missing Escape key handler (dimension: polish, severity: LOW)
- [ ] ImageLightbox missing role="dialog" (dimension: polish, severity: LOW)

---

### Iteration 2 (2026-03-01)

**Findings:** 35+ total across 5 dimensions (1 HIGH, 12 MEDIUM, 20+ LOW)
**Code fixes applied:** 10
**Manual to-dos added:** 2
**Deferred:** 5

#### Fixed (Code)

- [x] PII in console logs — email addresses logged unmasked in webhook handler, now masked as `te***@domain.com` (dimension: ops, severity: HIGH)
- [x] Click-outside-to-close missing on DeleteConfirmDialog — clicking backdrop now closes dialog (dimension: polish, severity: MEDIUM)
- [x] Click-outside-to-close missing on InviteModal — clicking backdrop now closes modal (dimension: polish, severity: MEDIUM)
- [x] Click-outside-to-close missing on NoteEditModal — clicking backdrop now closes modal (dimension: polish, severity: MEDIUM)
- [x] InviteModal textarea missing `<label>` for screen readers — added sr-only label (dimension: polish, severity: MEDIUM)
- [x] NoteEditModal textarea missing `<label>` for screen readers — added sr-only label (dimension: polish, severity: MEDIUM)
- [x] ServiceWorkerRegistration uses hardcoded hex colors — replaced with Tailwind classes using design tokens (dimension: polish, severity: MEDIUM)
- [x] 6 API routes return 500 for malformed JSON — now return 400 "Invalid JSON body" (parties/create, parties/join, push/subscribe, push/send, friends/request, users/block) (dimension: error-handling, severity: MEDIUM)
- [x] push/send test expected 500 for bad JSON — updated to expect 400 (dimension: error-handling, severity: MEDIUM)

#### Manual To-Dos Added

- CRITICAL: Audit `.env.local` in git history and rotate all potentially exposed secrets (dimension: ops, severity: HIGH)
- Ensure `.env.local` is in `.gitignore` and not tracked (dimension: ops, severity: HIGH)

#### Deferred

- [ ] Redundant getUser() calls in lib/friends.ts — 7 separate functions each call getUser() independently (dimension: performance, severity: LOW, acceptable since each is a separate API call)
- [ ] History page could add cursor-based pagination for users with many parties (dimension: performance, severity: LOW)
- [ ] AddContentModal textarea for notes missing label (dimension: polish, severity: LOW)
- [ ] FriendsPicker search input missing form label (dimension: polish, severity: LOW)
- [ ] PartyContext useMemo could include callback deps for completeness (dimension: performance, severity: LOW)

---

### Iteration 3 (2026-03-01)

**Findings:** 20+ total across 5 dimensions (4 HIGH, 8 MEDIUM, 10+ LOW)
**Code fixes applied:** 8
**Manual to-dos added:** 0
**Deferred:** 6

#### Fixed (Code)

- [x] CRON cleanup endpoint uses `===` for secret comparison — replaced with `crypto.timingSafeEqual` to prevent timing attacks (dimension: ops, severity: HIGH)
- [x] AppHome profile fetch `.single()` ignores error — now checks `error` before updating state (dimension: error-handling, severity: HIGH)
- [x] Queue items missing `focus-visible` outline — added `.queue-item:focus-visible` style in globals.css (dimension: polish, severity: HIGH)
- [x] Create party allows submit with password enabled but empty — added client-side validation (dimension: feature, severity: HIGH)
- [x] Queue items not keyboard-activatable — added `tabIndex={0}` and Enter/Space `onKeyDown` handler (dimension: polish, severity: MEDIUM)
- [x] Login/signup form inputs missing `autocomplete` attributes — added `email`, `current-password`, `new-password`, `name` (dimension: polish, severity: MEDIUM)
- [x] UploadToast missing `aria-live` region — added `role="status"` and `aria-live="polite"` (dimension: polish, severity: MEDIUM)
- [x] ImageLightbox missing `role="dialog"`, `aria-modal`, and `loading="lazy"` — added all three (dimension: polish/performance, severity: MEDIUM)

#### Deferred

- [ ] Queue virtualization for 100+ items (dimension: performance, severity: HIGH, architectural — requires windowing library integration)
- [ ] @dnd-kit not code-split — 60KB in main bundle (dimension: performance, severity: MEDIUM, requires dynamic import refactor)
- [ ] Push notifications only support 1 trigger type (dimension: feature, severity: MEDIUM, feature scope)
- [ ] Missing error.tsx boundaries for 8 route groups (dimension: error-handling, severity: MEDIUM, many files)
- [ ] Missing loading.tsx for most routes (dimension: error-handling, severity: MEDIUM, many files)
- [ ] Admin emails page orphaned — no navigation link (dimension: feature, severity: LOW)

---

### Iteration 4 (2026-03-01)

**Findings:** 15+ total across 5 dimensions (2 HIGH, 5 MEDIUM, 8+ LOW)
**Code fixes applied:** 7
**Manual to-dos added:** 0
**Deferred:** 5

#### Fixed (Code)

- [x] `checkUsernameAvailable` returned incorrect result on DB error — now returns structured `{ available, error }` with PGRST116 handling (dimension: error-handling, severity: HIGH)
- [x] Auth callback route crashes on missing env vars via non-null assertion (`!`) — replaced with guard + redirect to login (dimension: error-handling, severity: HIGH)
- [x] Members realtime channel missing reconnection refetch — now re-fetches data on SUBSCRIBED after reconnect (dimension: error-handling, severity: MEDIUM)
- [x] InviteModal tab buttons missing `role="tab"` and `aria-selected` attributes (dimension: polish, severity: MEDIUM)
- [x] CSRF origin validation used `startsWith` allowing subdomain bypass — changed to exact `includes` match (dimension: ops, severity: MEDIUM)
- [x] Invite-friends API sent N+1 notification inserts — replaced with batch `.insert()` and parallel emails (dimension: performance, severity: MEDIUM)
- [x] User images in QueueList had `unoptimized` prop bypassing Next.js image optimization (dimension: performance, severity: MEDIUM)

#### Deferred

- [ ] Queue virtualization for 100+ items (dimension: performance, severity: HIGH, architectural — carried from iteration 3)
- [ ] @dnd-kit not code-split — 60KB in main bundle (dimension: performance, severity: MEDIUM, carried from iteration 3)
- [ ] Missing error.tsx boundaries for route groups (dimension: error-handling, severity: MEDIUM, carried from iteration 3)
- [ ] Missing loading.tsx for most routes (dimension: error-handling, severity: MEDIUM, carried from iteration 3)
- [ ] AddContentModal/FriendsPicker missing form labels (dimension: polish, severity: LOW, carried from iteration 2)

---

### Iteration 5 (2026-03-01)

**Findings:** 25+ total across 5 dimensions (6 HIGH, 8 MEDIUM, 11+ LOW)
**Code fixes applied:** 10
**Manual to-dos added:** 0
**Deferred:** 8

#### Fixed (Code)

- [x] `lib/friends.ts` — 7 mutation functions missing try/catch around fetch — network failures threw unhandled exceptions (dimension: error-handling, severity: HIGH)
- [x] `ProfileTabs` missing ARIA tab pattern — screen readers couldn't navigate tabs; added role="tablist", role="tab", aria-selected, aria-controls, role="tabpanel" (dimension: polish, severity: HIGH)
- [x] `NotificationDropdown` + `NotificationItem` — invalid ARIA role pairing (role="menu" with role="button" children); changed to role="list" + role="listitem" (dimension: polish, severity: HIGH)
- [x] `NowShowingSection` image click target not keyboard-accessible — added role="button", tabIndex={0}, aria-label, onKeyDown (dimension: polish, severity: HIGH)
- [x] Create party toggle switches missing `aria-label` — screen readers couldn't identify switch purpose (dimension: polish, severity: HIGH)
- [x] TV mode exit button not safe-area aware — overlaps iOS notch; now uses `env(safe-area-inset-top)` (dimension: polish, severity: HIGH)
- [x] `app/loading.tsx` spinner missing `role="status"` and screen reader text (dimension: polish, severity: MEDIUM)
- [x] `PartyRoomClient` toast notifications missing `role="status"`/`role="alert"` and `aria-live` — invisible to screen readers (dimension: polish, severity: MEDIUM)
- [x] `QueueList` note checkbox missing `onKeyDown` handler — not operable via keyboard (dimension: polish, severity: MEDIUM)
- [x] No `prefers-reduced-motion` support — custom animations now disabled for users who prefer reduced motion (dimension: polish, severity: MEDIUM)

#### Deferred

- [ ] YouTube/Tweet/Reddit source URLs discarded — no "open original" link in queue items (dimension: feature, severity: HIGH, requires DB migration to store source URL)
- [ ] `searchUsers` is a dead export — no friend discovery UI exists (dimension: feature, severity: HIGH, architectural — needs new search page)
- [ ] Queue virtualization for 100+ items (dimension: performance, severity: HIGH, carried from iteration 3)
- [ ] Admin page gate is client-side only — API routes not admin-restricted (dimension: ops, severity: HIGH, requires admin role in Supabase)
- [ ] @dnd-kit not code-split — 60KB in main bundle (dimension: performance, severity: MEDIUM, carried from iteration 3)
- [ ] Missing error.tsx boundaries for route groups (dimension: error-handling, severity: MEDIUM, carried from iteration 3)
- [ ] Missing loading.tsx for most routes (dimension: error-handling, severity: MEDIUM, carried from iteration 3)
- [ ] History page shows expired parties as clickable cards (dimension: feature, severity: MEDIUM, needs expired-state UI)

---

### Iteration 6 (2026-03-01)

**Findings:** 20+ total across 5 dimensions (1 HIGH, 5 MEDIUM, 14+ LOW)
**Code fixes applied:** 6
**Manual to-dos added:** 0
**Deferred:** 8

#### Fixed (Code)

- [x] `invites/claim` asymmetric friendship on partial insert — replaced two separate `.insert()` calls with single `.upsert()` with `ignoreDuplicates`; checks both friendship directions before creating (dimension: error-handling, severity: HIGH)
- [x] `NotificationDropdown` missing Escape key handler — keyboard users couldn't close dropdown (dimension: polish, severity: MEDIUM)
- [x] Avatar picker emoji buttons 40px < WCAG 44px touch target — increased to 44px (`w-11 h-11`), added `aria-label` (dimension: polish, severity: MEDIUM)
- [x] Notification accept/decline buttons too small for touch — added `min-h-[44px]` and `py-2` padding (dimension: polish, severity: MEDIUM)
- [x] ImageLightbox close button touch target too small — added `min-w-[44px] min-h-[44px]`, improved aria-label to "Close image lightbox" (dimension: polish, severity: MEDIUM)
- [x] `friends/accept` returns 500 for malformed JSON instead of 400 — added explicit try-catch for JSON parse consistency with other routes (dimension: error-handling, severity: MEDIUM)

#### Deferred

- [ ] YouTube/Tweet/Reddit source URLs discarded — no "open original" link (dimension: feature, severity: HIGH, requires DB migration)
- [ ] `searchUsers` dead export — no friend discovery UI (dimension: feature, severity: HIGH, architectural)
- [ ] Queue virtualization for 100+ items (dimension: performance, severity: HIGH, carried from iteration 3)
- [ ] Admin page gate client-side only (dimension: ops, severity: HIGH, requires admin role in Supabase)
- [ ] N+1 query in `invites/claim` loop (dimension: performance, severity: MEDIUM, loop is capped at 10 tokens)
- [ ] @dnd-kit not code-split (dimension: performance, severity: MEDIUM, carried from iteration 3)
- [ ] Missing error.tsx boundaries for route groups (dimension: error-handling, severity: MEDIUM, carried from iteration 3)
- [ ] Missing loading.tsx for most routes (dimension: error-handling, severity: MEDIUM, carried from iteration 3)
