# Beta Readiness Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all security, infrastructure, UI, and test gaps identified in the 2026-02-16 beta readiness audit so the app is ready for closed beta with untrusted users.

**Architecture:** Five parallel tracks that touch independent files/systems. Track A hardens API routes. Track B fixes infrastructure/config. Track C wires up unmounted UI components and adds error boundaries. Track D tightens database RLS policies and adds cleanup. Track E adds high-priority unit tests for pure functions and critical API routes.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + Auth + Realtime), Tailwind CSS v4, Vitest, Playwright

---

## Parallel Track Map

```
Track A: Security — API Route Hardening     (7 tasks)  → touches app/api/**
Track B: Infrastructure & Config             (5 tasks)  → touches next.config.ts, public/, app/api/health
Track C: UI/UX — Error Boundaries & PWA      (4 tasks)  → touches app/, components/, providers.tsx
Track D: Database — RLS & Cleanup            (3 tasks)  → touches supabase/migrations/
Track E: Test Coverage — Pure Functions      (4 tasks)  → touches lib/*.test.ts, app/api/*.test.ts
```

Tracks A–E are **fully independent** and can run as 5 parallel agents. Within each track, tasks are sequential.

---

## Track A: Security — API Route Hardening

### Task A1: Change "skipped" fallbacks to 500 errors

**Files:**

- Modify: `app/api/parties/create/route.ts:42-48`
- Modify: `app/api/parties/join/route.ts:31-37`
- Modify: `app/api/queue/items/route.ts:196-204`
- Modify: `app/api/friends/request/route.ts:45-51`
- Modify: `app/api/friends/accept/route.ts:25-29`
- Modify: `app/api/friends/[id]/route.ts:31-36`

**Step 1: In each file, replace the "skipped" success response with a 500 error**

In every file listed above, find this pattern:

```typescript
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase service role key not configured, skipping server-side validation')
  return NextResponse.json(
    { success: true, skipped: true, message: 'Server-side validation skipped (no service key)' },
    { status: 200 },
  )
}
```

Replace with:

```typescript
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('FATAL: Supabase service role key not configured')
  return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
}
```

For `queue/items/route.ts` the message is slightly different but the pattern is the same.

**Step 2: Run tests to verify nothing breaks**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass. The mock tests don't depend on the skipped fallback.

**Step 3: Commit**

```bash
git add app/api/parties/create/route.ts app/api/parties/join/route.ts app/api/queue/items/route.ts app/api/friends/request/route.ts app/api/friends/accept/route.ts app/api/friends/\[id\]/route.ts
git commit -m "security: fail closed when service role key is missing (S3)"
```

---

### Task A2: Add membership verification to push send route

**Files:**

- Modify: `app/api/push/send/route.ts:39-58`

**Step 1: After the auth check (line 38), add a membership verification query**

After `if (authError || !user) { return ... }`, add:

```typescript
// Verify the authenticated user is a member of this party
const { data: membership, error: membershipError } = await supabase
  .from('party_members')
  .select('id')
  .eq('party_id', partyId)
  .eq('user_id', user.id)
  .maybeSingle()

if (membershipError || !membership) {
  return NextResponse.json({ error: 'You must be a member of this party' }, { status: 403 })
}
```

Note: Move the `const supabase = createClient(...)` line to BEFORE this check (it's currently on line 42, after the auth block).

**Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All pass.

**Step 3: Commit**

```bash
git add app/api/push/send/route.ts
git commit -m "security: verify party membership before sending push notifications (S5)"
```

---

### Task A3: Add session ownership verification to push subscribe/unsubscribe

**Files:**

- Modify: `app/api/push/subscribe/route.ts`

**Step 1: In the POST handler, after auth check, verify session ownership**

After `if (authError || !user) { return ... }` (line 33), add:

```typescript
// Verify this session belongs to the authenticated user
const { data: memberRecord } = await supabase
  .from('party_members')
  .select('id')
  .eq('session_id', sessionId)
  .eq('user_id', user.id)
  .maybeSingle()

if (!memberRecord) {
  return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
}
```

**Step 2: Apply same check to DELETE handler (line 88)**

Same pattern after the auth check in the DELETE function.

**Step 3: Commit**

```bash
git add app/api/push/subscribe/route.ts
git commit -m "security: verify session ownership in push subscribe/unsubscribe (S8)"
```

---

### Task A4: Escape ilike wildcards in email events API

**Files:**

- Modify: `app/api/emails/events/route.ts:105-107`

**Step 1: Add an escape helper and use it**

Before the route handler, add:

```typescript
function escapeIlike(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_')
}
```

Then change line 106 from:

```typescript
query = query.ilike('recipient', `%${recipient}%`)
```

To:

```typescript
query = query.ilike('recipient', `%${escapeIlike(recipient)}%`)
```

**Step 2: Commit**

```bash
git add app/api/emails/events/route.ts
git commit -m "security: escape ilike wildcards in email events search (S9)"
```

---

### Task A5: Fix webhook error message information leaking

**Files:**

- Modify: `app/api/webhooks/resend/route.ts:181-184`

**Step 1: Replace the error interpolation**

Change:

```typescript
return NextResponse.json({ error: `Server error: ${err}` }, { status: 500 })
```

To:

```typescript
console.error('Webhook processing error:', err)
return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
```

Note: The `console.error` on the line above the return already logs the error, so the duplicate log on line 182 can be removed. Check — if there is already a `console.error('Webhook processing error:', err)` above the return, just change the return line.

**Step 2: Commit**

```bash
git add app/api/webhooks/resend/route.ts
git commit -m "security: remove error details from webhook response (S-low)"
```

---

### Task A6: Add CSRF Origin check for anonymous routes

**Files:**

- Create: `lib/csrf.ts`
- Modify: `app/api/queue/items/route.ts`
- Modify: `app/api/parties/create/route.ts`
- Modify: `app/api/parties/join/route.ts`

**Step 1: Create CSRF helper**

```typescript
// lib/csrf.ts
import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = ['https://linkparty.app', 'http://localhost:3000', 'http://localhost:5173']

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // If no origin/referer, allow (direct API calls, mobile app)
  if (!origin && !referer) return true

  if (origin && ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed))) return true
  if (referer && ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed))) return true

  return false
}
```

**Step 2: Add origin check to the 3 anonymous routes**

At the top of each POST handler (before parsing body), add:

```typescript
import { validateOrigin } from '@/lib/csrf'

// ... inside POST handler, first thing:
if (!validateOrigin(request)) {
  return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
}
```

**Step 3: Commit**

```bash
git add lib/csrf.ts app/api/queue/items/route.ts app/api/parties/create/route.ts app/api/parties/join/route.ts
git commit -m "security: add CSRF origin validation for anonymous routes (S11)"
```

---

### Task A7: Use crypto.getRandomValues() for party codes

**Files:**

- Modify: `app/api/parties/create/route.ts:11-18`

**Step 1: Replace Math.random() with crypto**

Change:

```typescript
function generatePartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
```

To:

```typescript
function generatePartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomValues = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(randomValues, (v) => chars.charAt(v % chars.length)).join('')
}
```

**Step 2: Commit**

```bash
git add app/api/parties/create/route.ts
git commit -m "security: use crypto.getRandomValues for party code generation (S-low)"
```

---

## Track B: Infrastructure & Config

### Task B1: Delete .env.temp file

**Files:**

- Delete: `.env.temp`

**Step 1: Delete the file**

```bash
rm .env.temp
```

**Step 2: Verify .gitignore covers env files**

Check that `.gitignore` has `.env*` or `.env.*` patterns (it should already).

**Step 3: Commit**

```bash
git add .env.temp
git commit -m "security: remove .env.temp containing production secrets (S1)"
```

Note: After this, rotate all secrets (SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, VAPID_PRIVATE_KEY, CRON_SECRET, VERCEL_OIDC_TOKEN) in Doppler and Vercel. This is a manual step the user must do.

---

### Task B2: Add CSP and HSTS headers

**Files:**

- Modify: `next.config.ts:24-29`

**Step 1: Add Content-Security-Policy and Strict-Transport-Security headers**

Add these entries to the `headers` array after the existing headers:

```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload',
},
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com https://pbs.twimg.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; '),
},
```

**Step 2: Also make image optimization conditional on static export**

Change line 13 from:

```typescript
images: {
  unoptimized: true,
},
```

To:

```typescript
images: {
  unoptimized: useStaticExport,
},
```

**Step 3: Run build to verify headers don't break anything**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add next.config.ts
git commit -m "security: add CSP and HSTS headers, conditional image optimization (S7)"
```

---

### Task B3: Add health check endpoint

**Files:**

- Create: `app/api/health/route.ts`

**Step 1: Create the health check route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  // Check Supabase connectivity
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey.trim())
      const { error } = await supabase.from('parties').select('id').limit(1)
      checks.database = error ? 'error' : 'ok'
    } catch {
      checks.database = 'error'
    }
  } else {
    checks.database = 'error'
  }

  const allOk = Object.values(checks).every((v) => v === 'ok')

  return NextResponse.json(
    { status: allOk ? 'healthy' : 'degraded', checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 },
  )
}
```

**Step 2: Commit**

```bash
git add app/api/health/route.ts
git commit -m "feat: add /api/health endpoint for monitoring"
```

---

### Task B4: Add proper PWA icons and fix manifest

**Files:**

- Create: `public/icons/icon-192.png` (generate from existing branding or placeholder)
- Create: `public/icons/icon-512.png`
- Modify: `public/manifest.json`
- Modify: `app/layout.tsx:33-35`

**Step 1: Generate PWA icons**

Use a solid-color placeholder icon with "LP" text. Create a simple script or use an online generator. At minimum, create 192x192 and 512x512 PNG files.

If no design asset is available, create simple placeholder icons:

```bash
# Using ImageMagick if available:
convert -size 192x192 xc:'#6366f1' -gravity center -pointsize 72 -fill white -annotate 0 'LP' public/icons/icon-192.png
convert -size 512x512 xc:'#6366f1' -gravity center -pointsize 192 -fill white -annotate 0 'LP' public/icons/icon-512.png
```

If ImageMagick is not available, create icons programmatically or note as a manual step.

**Step 2: Update manifest.json**

Replace the icons array and update description:

```json
{
  "name": "Link Party",
  "short_name": "LinkParty",
  "description": "Stop losing links in chat. One shared queue for your crew.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#6366f1",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["lifestyle", "productivity"],
  "shortcuts": [
    {
      "name": "Start Party",
      "short_name": "Start",
      "description": "Start a new party",
      "url": "/create",
      "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }]
    },
    {
      "name": "Join Party",
      "short_name": "Join",
      "description": "Join an existing party",
      "url": "/join",
      "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }]
    }
  ]
}
```

**Step 3: Update layout.tsx icons**

Change:

```typescript
icons: {
  icon: '/vite.svg',
  apple: '/icons/icon-192.png',
},
```

To:

```typescript
icons: {
  icon: '/icons/icon-192.png',
  apple: '/icons/icon-192.png',
},
```

**Step 4: Commit**

```bash
git add public/icons/ public/manifest.json app/layout.tsx
git commit -m "feat: add proper PWA icons and update manifest"
```

---

### Task B5: Add server-side rate limiting to unprotected routes

**Files:**

- Modify: `app/api/parties/join/route.ts`
- Modify: `app/api/push/send/route.ts`
- Modify: `app/api/invites/claim/route.ts`
- Modify: `app/api/users/block/route.ts`

**Step 1: Add in-memory rate limiting to each route**

Copy the same rate-limiting pattern used in `app/api/queue/items/route.ts` (the `rateLimitMap` + `checkRateLimit` function). For each route, add:

```typescript
const rateLimitMap = new Map<string, { timestamps: number[] }>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry) {
    rateLimitMap.set(key, { timestamps: [now] })
    return { isLimited: false, retryAfterMs: 0 }
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    return { isLimited: true, retryAfterMs: windowMs - (now - oldestInWindow) }
  }

  entry.timestamps.push(now)
  return { isLimited: false, retryAfterMs: 0 }
}
```

Rate limits per route:

- `parties/join`: 20 attempts per minute per IP (use `request.headers.get('x-forwarded-for')` or `'unknown'`)
- `push/send`: 30 per minute per user ID
- `invites/claim`: 10 per minute per user ID
- `users/block`: 20 per minute per user ID

At the top of each POST handler:

```typescript
const rateLimitKey = user?.id || request.headers.get('x-forwarded-for') || 'unknown'
const { isLimited, retryAfterMs } = checkRateLimit(rateLimitKey, MAX_REQUESTS, WINDOW_MS)
if (isLimited) {
  return NextResponse.json(
    { error: 'Rate limit exceeded', retryAfter: Math.ceil(retryAfterMs / 1000) },
    { status: 429, headers: { 'Retry-After': Math.ceil(retryAfterMs / 1000).toString() } },
  )
}
```

**Step 2: Commit**

```bash
git add app/api/parties/join/route.ts app/api/push/send/route.ts app/api/invites/claim/route.ts app/api/users/block/route.ts
git commit -m "security: add server-side rate limiting to unprotected API routes (S4)"
```

---

## Track C: UI/UX — Error Boundaries & PWA Components

### Task C1: Add React error boundaries

**Files:**

- Create: `app/error.tsx`
- Create: `app/party/[id]/error.tsx`

**Step 1: Create root error boundary**

```typescript
'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="text-text-muted mb-6">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Create party-specific error boundary**

```typescript
'use client'

import Link from 'next/link'

export default function PartyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Party Error</h1>
        <p className="text-text-muted mb-6">Something went wrong with this party. It may have expired or been removed.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-surface-700 text-white rounded-xl font-semibold hover:bg-surface-600 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/error.tsx app/party/\[id\]/error.tsx
git commit -m "feat: add React error boundaries for graceful error recovery"
```

---

### Task C2: Mount OfflineIndicator and InstallPrompt in providers

**Files:**

- Modify: `app/providers.tsx`

**Step 1: Import and render the components**

Change `app/providers.tsx` from:

```typescript
'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorProvider } from '@/contexts/ErrorContext'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorProvider>
      <AuthProvider>
        <ServiceWorkerRegistration />
        {children}
      </AuthProvider>
    </ErrorProvider>
  )
}
```

To:

```typescript
'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorProvider } from '@/contexts/ErrorContext'
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
        <ServiceWorkerRegistration />
        <OfflineIndicator />
        <InstallPrompt />
        {children}
      </AuthProvider>
    </ErrorProvider>
  )
}
```

**Step 2: Run build to verify no import issues**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/providers.tsx
git commit -m "feat: mount OfflineIndicator and InstallPrompt in Next.js app"
```

---

### Task C3: Add loading states for key routes

**Files:**

- Create: `app/loading.tsx`
- Create: `app/party/[id]/loading.tsx`

**Step 1: Create root loading state**

```typescript
export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
```

**Step 2: Create party loading state**

```typescript
export default function PartyLoading() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted">Loading party...</p>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/loading.tsx app/party/\[id\]/loading.tsx
git commit -m "feat: add loading states for root and party routes"
```

---

### Task C4: Remove legacy src/ directory references

**Files:**

- Note: Do NOT delete `src/` — just verify no Next.js code imports from it

**Step 1: Search for cross-directory imports**

Run: `grep -r "from.*\.\./src/" app/ lib/ components/ hooks/ contexts/ 2>/dev/null || echo "No cross-imports found"`
Run: `grep -r "from.*src/" app/ lib/ components/ hooks/ contexts/ 2>/dev/null | grep -v node_modules || echo "No src imports found"`

If no cross-imports are found, the `src/` directory is safely isolated dead code. Note it for future cleanup but do not delete in this plan (it's a larger change).

**Step 2: Skip commit — informational only**

---

## Track D: Database — RLS Tightening & Cleanup

### Task D1: Tighten RLS policies — remove auth.uid() IS NULL bypass

**Files:**

- Create: `supabase/migrations/025_tighten_rls_anonymous_access.sql`

**Step 1: Create new migration**

```sql
-- Migration 025: Tighten RLS policies — remove anonymous bypass
--
-- The OR auth.uid() IS NULL clauses in migration 014 allowed any
-- unauthenticated request to read/write party data. This tightens
-- write policies to require either authenticated user or valid session ID
-- from the request headers. Read policies remain open for party members.

-- ============================================
-- 1. party_members: Tighten UPDATE policy
-- ============================================
DROP POLICY IF EXISTS "Members can update own record" ON party_members;
CREATE POLICY "Members can update own record" ON party_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND session_id IS NOT NULL
      AND session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- ============================================
-- 2. party_members: Tighten DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Members can leave party" ON party_members;
CREATE POLICY "Members can leave party" ON party_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND session_id IS NOT NULL
      AND session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- ============================================
-- 3. queue_items: Tighten SELECT policy
-- ============================================
DROP POLICY IF EXISTS "Members can view queue items" ON queue_items;
CREATE POLICY "Members can view queue items" ON queue_items
  FOR SELECT USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- ============================================
-- 4. queue_items: Tighten UPDATE policy
-- ============================================
DROP POLICY IF EXISTS "Members can update queue items" ON queue_items;
CREATE POLICY "Members can update queue items" ON queue_items
  FOR UPDATE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );

-- ============================================
-- 5. queue_items: Tighten DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Members can delete queue items" ON queue_items;
CREATE POLICY "Members can delete queue items" ON queue_items
  FOR DELETE USING (
    party_id IN (
      SELECT pm.party_id FROM party_members pm
      WHERE pm.user_id = auth.uid()
        OR pm.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    )
  );
```

**Step 2: Test locally with `supabase db reset`**

Run: `npx supabase db reset`
Expected: All migrations apply cleanly.

**Step 3: Commit**

```bash
git add supabase/migrations/025_tighten_rls_anonymous_access.sql
git commit -m "security: tighten RLS policies — remove auth.uid() IS NULL bypass (S6)"
```

**Important post-deploy step:** After deploying, apply this migration to production via Supabase SQL Editor or `supabase db push`. Then verify with:

```sql
SELECT policyname, polcmd, polqual FROM pg_policies WHERE tablename IN ('party_members', 'queue_items');
```

---

### Task D2: Add notification cleanup to cron job

**Files:**

- Modify: `app/api/cron/cleanup/route.ts`

**Step 1: After the invite token cleanup (line 105), add notification cleanup**

Add before the final `console.log`:

```typescript
// Clean up old read notifications (older than 30 days)
let notificationsDeleted = 0
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
const { data: deletedNotifications, error: notifError } = await supabase
  .from('notifications')
  .delete()
  .eq('read', true)
  .lt('created_at', thirtyDaysAgo)
  .select('id')

if (notifError) {
  console.error('Failed to delete old notifications:', notifError)
} else {
  notificationsDeleted = deletedNotifications?.length ?? 0
}
```

Update the console.log to include notifications:

```typescript
console.log(
  `Cleanup complete: ${totalDeleted} parties, ${totalImagesDeleted} images, ${tokensDeleted} tokens, ${notificationsDeleted} notifications deleted`,
)
```

Update the response to include notifications:

```typescript
return NextResponse.json({
  success: true,
  deletedCount: totalDeleted,
  imagesDeleted: totalImagesDeleted,
  tokensDeleted,
  notificationsDeleted,
})
```

**Step 2: Commit**

```bash
git add app/api/cron/cleanup/route.ts
git commit -m "feat: add old notification cleanup to cron job"
```

---

### Task D3: Add index on parties.expires_at

**Files:**

- Create: `supabase/migrations/026_add_expires_at_index.sql`

**Step 1: Create migration**

```sql
-- Migration 026: Add index on parties.expires_at for cron cleanup performance
CREATE INDEX IF NOT EXISTS idx_parties_expires_at ON parties (expires_at);
```

**Step 2: Commit**

```bash
git add supabase/migrations/026_add_expires_at_index.sql
git commit -m "perf: add index on parties.expires_at for cleanup queries"
```

---

## Track E: Test Coverage — High-Priority Unit Tests

### Task E1: Unit tests for lib/validation.ts

**Files:**

- Create: `lib/validation.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest'
import { validateEmail, validatePassword, validateDisplayName } from './validation'

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true })
  })

  it('rejects empty string', () => {
    expect(validateEmail('')).toEqual({ valid: false, error: expect.any(String) })
  })

  it('rejects missing @', () => {
    expect(validateEmail('userexample.com')).toEqual({ valid: false, error: expect.any(String) })
  })

  it('rejects missing domain', () => {
    expect(validateEmail('user@')).toEqual({ valid: false, error: expect.any(String) })
  })
})

describe('validatePassword', () => {
  it('accepts valid password (8+ chars)', () => {
    expect(validatePassword('securepass123')).toEqual({ valid: true })
  })

  it('rejects short password', () => {
    expect(validatePassword('short')).toEqual({ valid: false, error: expect.any(String) })
  })

  it('rejects empty password', () => {
    expect(validatePassword('')).toEqual({ valid: false, error: expect.any(String) })
  })
})

describe('validateDisplayName', () => {
  it('accepts valid name', () => {
    expect(validateDisplayName('Alice')).toEqual({ valid: true })
  })

  it('rejects too short (< 2 chars)', () => {
    expect(validateDisplayName('A')).toEqual({ valid: false, error: expect.any(String) })
  })

  it('rejects too long (> 50 chars)', () => {
    expect(validateDisplayName('A'.repeat(51))).toEqual({ valid: false, error: expect.any(String) })
  })

  it('trims whitespace before validating', () => {
    expect(validateDisplayName('  Al  ')).toEqual({ valid: true })
  })
})
```

Note: Read `lib/validation.ts` first to confirm the exact function signatures and return types. Adjust assertions to match.

**Step 2: Run tests**

Run: `npx vitest run lib/validation.test.ts --reporter=verbose`
Expected: All pass.

**Step 3: Commit**

```bash
git add lib/validation.test.ts
git commit -m "test: add unit tests for lib/validation.ts"
```

---

### Task E2: Unit tests for lib/rateLimit.ts

**Files:**

- Create: `lib/rateLimit.test.ts`

**Step 1: Read lib/rateLimit.ts to understand exports**

Read the file first. It's a client-side module using localStorage. Tests will need to mock localStorage.

**Step 2: Write tests covering each exported function**

Key functions to test (adjust based on actual exports):

- `checkRateLimit(key)` — returns whether action is rate-limited
- `recordAttempt(key)` — records a timestamp
- `formatRetryTime(ms)` — formats milliseconds to human string
- `tryAction(key, action)` — combines check + record + execute

Mock `localStorage` with a simple Map-based mock:

```typescript
import { beforeEach, describe, it, expect, vi } from 'vitest'

// Mock localStorage
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

beforeEach(() => storage.clear())
```

Then test each function. Focus on:

- Rate limit detection (under limit returns false, at limit returns true)
- Time formatting (seconds, minutes)
- Storage persistence

**Step 3: Run tests**

Run: `npx vitest run lib/rateLimit.test.ts --reporter=verbose`
Expected: All pass.

**Step 4: Commit**

```bash
git add lib/rateLimit.test.ts
git commit -m "test: add unit tests for lib/rateLimit.ts"
```

---

### Task E3: Unit tests for lib/conflictResolver.ts

**Files:**

- Create: `lib/conflictResolver.test.ts`

**Step 1: Read lib/conflictResolver.ts to understand exports**

Key functions (pure, no dependencies):

- `detectConflict(localItem, remoteItem)` — detects position/content/status/completion conflicts
- `detectDeletion(localItems, remoteItems)` — finds items deleted remotely
- `mergeQueueState(localQueue, remoteQueue)` — last-write-wins merge

**Step 2: Write tests**

```typescript
import { describe, it, expect } from 'vitest'
import { detectConflict, detectDeletion, mergeQueueState } from './conflictResolver'

describe('detectConflict', () => {
  it('detects position conflict', () => {
    const local = { id: '1', position: 1 }
    const remote = { id: '1', position: 3 }
    const result = detectConflict(local, remote)
    expect(result).toBeTruthy()
    // Adjust based on actual return type
  })

  it('returns null for identical items', () => {
    const item = { id: '1', position: 1, status: 'pending' }
    expect(detectConflict(item, item)).toBeFalsy()
  })
})

// ... additional tests for detectDeletion, mergeQueueState
```

Adjust test shapes based on actual function signatures after reading the file.

**Step 3: Run tests**

Run: `npx vitest run lib/conflictResolver.test.ts --reporter=verbose`
Expected: All pass.

**Step 4: Commit**

```bash
git add lib/conflictResolver.test.ts
git commit -m "test: add unit tests for lib/conflictResolver.ts"
```

---

### Task E4: Unit tests for CSRF helper

**Files:**

- Create: `lib/csrf.test.ts`

**Step 1: Write tests for validateOrigin (created in Task A6)**

```typescript
import { describe, it, expect } from 'vitest'
import { validateOrigin } from './csrf'

function mockRequest(headers: Record<string, string>) {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as any
}

describe('validateOrigin', () => {
  it('allows requests with no origin/referer (direct API calls)', () => {
    expect(validateOrigin(mockRequest({}))).toBe(true)
  })

  it('allows requests from linkparty.app', () => {
    expect(validateOrigin(mockRequest({ origin: 'https://linkparty.app' }))).toBe(true)
  })

  it('allows requests from localhost:3000', () => {
    expect(validateOrigin(mockRequest({ origin: 'http://localhost:3000' }))).toBe(true)
  })

  it('rejects requests from unknown origins', () => {
    expect(validateOrigin(mockRequest({ origin: 'https://evil.com' }))).toBe(false)
  })

  it('checks referer as fallback', () => {
    expect(validateOrigin(mockRequest({ referer: 'https://linkparty.app/party/123' }))).toBe(true)
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run lib/csrf.test.ts --reporter=verbose`
Expected: All pass.

**Step 3: Commit**

```bash
git add lib/csrf.test.ts
git commit -m "test: add unit tests for lib/csrf.ts"
```

---

## Final Validation

After all 5 tracks are complete:

### Step 1: Run full test suite

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

### Step 2: Run E2E tests

```bash
npm run test:e2e
```

### Step 3: Create PR

Use `/pr-creator` skill to create the PR, monitor CI, and debug any failures.

---

## Summary

| Track             | Tasks | Can Parallel?                                 | Estimated Scope               |
| ----------------- | ----- | --------------------------------------------- | ----------------------------- |
| A: API Security   | 7     | Yes (independent of B-E)                      | 7 files modified, 1 created   |
| B: Infrastructure | 5     | Yes (independent of A,C-E)                    | 4 files modified, 3 created   |
| C: UI/UX          | 4     | Yes (independent of A-B,D-E)                  | 5 files created, 1 modified   |
| D: Database       | 3     | Yes (independent of A-C,E)                    | 2 migrations, 1 file modified |
| E: Tests          | 4     | Yes (independent of A-D but E4 depends on A6) | 4 test files created          |

**Total: 23 tasks across 5 parallel tracks**

**Note on Track E dependency:** Task E4 (csrf test) depends on Task A6 (csrf implementation). If running fully parallel, E4 should wait for A6 to complete, or the agent running Track E should create both the implementation and test together.
