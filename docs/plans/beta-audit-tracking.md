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
