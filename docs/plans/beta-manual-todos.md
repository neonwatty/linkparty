# Beta Launch — Manual To-Dos

Items that require human action outside the codebase (service provider settings, deployment config, external tools, etc.).

---

### From Iteration 1 (2026-03-01)

- [ ] Create privacy policy and terms of service pages, link from footer/signup (dimension: feature, severity: HIGH)
- [ ] Set up Sentry project — get SENTRY_DSN, add to Vercel env vars, uncomment integration in lib/logger.ts (dimension: ops, severity: HIGH)
- [ ] Implement account deletion endpoint + data export for GDPR compliance (dimension: feature, severity: HIGH)
- [ ] Add email unsubscribe mechanism — create endpoint, add unsubscribe link to email templates (dimension: feature, severity: HIGH)
- [ ] Add List-Unsubscribe and List-Unsubscribe-Post headers to Resend email calls in lib/email.ts (dimension: ops, severity: HIGH)
- [ ] Create email_suppressions table + check bounced/complained addresses before sending invites (dimension: ops, severity: HIGH)
- [ ] Set up Upstash Redis for distributed rate limiting — replace in-memory Map in lib/serverRateLimit.ts (dimension: ops, severity: MEDIUM)
- [ ] Configure CRON_SECRET with secure random value in Vercel, document 90-day rotation policy (dimension: ops, severity: MEDIUM)
- [ ] Test Resend email delivery with real domain — verify SPF/DKIM/DMARC records (dimension: ops, severity: MEDIUM)
- [ ] Verify Google OAuth callback URL https://linkparty.app/auth/callback is in Supabase Dashboard redirect allowlist (dimension: ops, severity: MEDIUM)
