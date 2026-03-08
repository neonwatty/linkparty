# Link Party

Collaborative real-time party coordination app — create parties, share content (notes, images, YouTube videos), manage queues, and display in TV mode.

## Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS v4
- **Hosting**: Vercel
- **Mobile**: Capacitor (iOS)
- **Email**: Resend (via Supabase edge functions)
- **Secrets**: Doppler (source of truth — never use redundant secret storage)
- **Drag-and-drop**: @dnd-kit

## Dev Commands

```bash
npm run dev            # Next.js with Doppler + Turbopack
npm run dev:local      # Next.js without Doppler (local Supabase)
npm run build          # Production build
npm run start          # Production server
npm run lint           # ESLint
npm run format         # Prettier (write)
npm run format:check   # Prettier (check only)
npm run knip           # Dead code detection
npm run test           # Unit tests (Vitest, single run)
npm run test:watch     # Unit tests (watch mode)
npm run test:coverage  # Unit tests with coverage
npm run test:e2e       # E2E tests (Playwright)
npm run test:e2e:ui    # E2E with UI runner
npm run build:ios      # Build for iOS (static export + cap sync)
npm run ios            # Build + open in Xcode
```

## Architecture

### App Router Structure

```
app/
  api/                  # API routes
    emails/invite/      # Email invite sending
    emails/events/      # Email event handling
    queue/items/        # Queue item CRUD
    webhooks/resend/    # Resend webhook handler
  admin/                # Admin pages
  create/               # Create party flow
  join/                 # Join party flow
  login/                # Auth: login
  signup/               # Auth: signup
  reset-password/       # Auth: password reset
  party/                # Party room (realtime)
  history/              # Party history
  layout.tsx            # Root layout
  page.tsx              # Home page
  providers.tsx         # Context providers
  globals.css           # Global styles + Tailwind
```

### Key Libraries

```
lib/
  auth.ts               # Supabase auth helpers, session handling
  supabase.ts           # Database client (server + browser)
  rateLimit.ts          # Server-side rate limiting
  validation.ts         # Input validation (shared)
  contentMetadata.ts    # URL metadata extraction (YouTube/Twitter/Reddit)
  imageUpload.ts        # Image upload handler
  conflictResolver.ts   # Offline conflict resolution
  email.ts              # Email templates
  errorMessages.ts      # Centralized error strings
  logger.ts             # Logging utility
  notificationTriggers.ts  # Push notification triggers
```

### Contexts

- `AuthContext.tsx` — Supabase auth state
- `ErrorContext.tsx` — Global error handling

### Hooks

- `useParty.ts` — Party state + realtime subscriptions
- `useOnlineStatus.ts` — Network connectivity
- `useImageUpload.ts` — Image upload with progress
- `usePWAInstall.ts` — PWA install prompt

## Patterns

### Supabase

- **Server client**: `import { createClient } from '@/lib/supabase'` with SSR cookie handling
- **RLS**: All tables enforce ownership via policies with `auth.uid()`
- **Migrations**: In `supabase/migrations/` — never edit existing ones, create new ones
- **Edge functions**: `supabase/functions/` — deploy with `supabase functions deploy`
- **Mock mode**: Activates when Supabase URL contains "placeholder" — provides sample data

### API Route Pattern

```typescript
import { createClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // validate input, query database, return response
}
```

### Component Conventions

- Use `'use client'` for interactive components
- Tailwind v4 with CSS custom properties in `globals.css`
- `@/` path alias maps to project root

## LSP Usage

When navigating code, always prefer the LSP tool (`goToDefinition`, `findReferences`, `documentSymbol`, `hover`) over Grep/Glob for symbol lookup. Use Grep only for text patterns that are not code symbols (e.g. string literals, comments, config values).

If the LSP tool is unavailable or returns errors, stop and inform the user. Either the `typescript-lsp` plugin needs to be reinstalled (`/plugin` → Discover → `typescript-lsp`) or the language server binary is missing (`npm install -g typescript-language-server typescript`). Do not silently fall back to Grep.

## Code Quality

### Prettier (`.prettierrc`)

```json
{ "printWidth": 120, "singleQuote": true, "semi": false, "trailingComma": "all" }
```

### ESLint (`eslint.config.js`)

- Flat config with TypeScript, React hooks, security plugin, Prettier compat
- Limits: 300 lines/file (warn), 150 lines/function (warn)

### Path Alias

`@/*` maps to project root (configured in `tsconfig.json`)

## Testing

- **Unit tests**: Vitest — files at `app/**/*.test.ts`, `lib/**/*.test.ts`
- **E2E tests**: Playwright — files at `e2e/*.spec.ts`
- **Browsers**: Chromium, Firefox, WebKit + mobile (Pixel 5, iPhone 12)
- **CI retries**: 0 locally, 2 on CI

## Database

Supabase with 9 migrations:

1. `001_initial_schema.sql` — parties, party_members, queue_items
2. `002_add_completion_fields.sql` — user tracking
3. `003_database_security.sql` — RLS policies
4. `004_push_notifications.sql` — notification tables
5. `005_fix_rls_policies.sql`
6. `006_add_due_date_column.sql`
7. `007_add_image_fields.sql`
8. `008_add_updated_at.sql`
9. `009_add_email_events.sql`

## Guardrails

### General

- When a tool or approach fails 3+ times in a row (e.g., simulator crashes, browser click failures), stop retrying and suggest an alternative approach or escalate to the user instead of repeating the same failing command.
- Before starting, review this file for project constraints. If unsure about the approach, present 2-3 options with tradeoffs BEFORE implementing.

### Debugging

- When debugging auth/webhook 401 errors, check infrastructure-level blocks first (Vercel Authentication, Cloudflare bot protection, iframe restrictions) before assuming application-level secret mismatches.
- When debugging build or runtime errors, check environment configuration before blaming application code.

### Environment & Secrets

- This project uses Doppler for secrets management. Always ensure the session/environment is started with `doppler run` when Supabase, Vercel, or other service credentials are needed. Never suggest redundant secret storage across Doppler and Vercel — Doppler is the source of truth.

### CI/CD

- When CI/E2E tests require secrets or credentials, always verify they are configured before running. Never let CI jobs run indefinitely with placeholder credentials — fail fast with clear error messages.
- Always run `prettier --write` on changed files before committing. Ensure all reformatted files are included in commits.

### Database

- When deploying database changes, always verify migrations are applied to ALL environments (production AND staging). After applying migrations, verify the schema cache is refreshed and RLS policies are updated.
- Never edit existing migration files — create new ones instead.

## Claude Code Automations

### MCP Servers (`.mcp.json`)

- **context7** — Live documentation lookup for React, Next.js, Supabase, Tailwind, @dnd-kit. Use when referencing library APIs or looking up framework patterns.
- **Supabase MCP** — Direct database operations, schema inspection, and migration management.

### Subagents (`.claude/agents/`)

- **security-reviewer** — Run after implementing auth, API routes, or data access changes. Checks for XSS, CSRF, RLS bypass, and secret exposure.
- **performance-analyzer** — Run after implementing React components, realtime subscriptions, or drag-and-drop features. Checks for re-render issues, subscription leaks, bundle size, and network efficiency.

### Skills (`.claude/skills/`)

- `/gen-test <file>` — Generate Vitest unit tests for a source file following project conventions.
- `/db-migrate <description>` — Scaffold a new numbered Supabase migration file (never edits existing migrations).
- `/new-component <Name> [party|ui]` — Scaffold a new React component with barrel file export.
- `/monitor-ci` — Monitor GitHub Actions CI status for the current branch.
- `/ship` — Check CI, merge PR, pull main, and verify Vercel deployment. Use after PR is approved and CI passes.
- `/validate` — Run all local checks (lint, typecheck, format, tests, dead code). Available via installed plugin.

### Installed Plugin Skills

#### CI & Deployment (used every PR cycle)

- `/pr-creator` — Create a PR from current changes, monitor GitHub CI, and debug failures until CI passes. Does NOT merge — stops when CI is green and provides the PR link. Use this to open PRs; use `/ship` to merge them.
- `/validator` — Auto-detect language/framework and run linting, type checking, tests, and dead code detection. Runs the same checks as `npm run lint && tsc && vitest run && knip`.

#### Browser Workflow Pipeline (QA testing)

- `/browser-workflow-generator` — Explore the codebase and generate comprehensive browser workflow files at `workflows/browser-workflows.md`. Creates numbered workflows with substeps covering all user-facing features.
- `/browser-workflow-executor` — Execute workflows from `workflows/browser-workflows.md` using Claude-in-Chrome. Tests each step, captures before/after screenshots, generates HTML reports.
- `/browser-workflow-to-playwright` — Translate refined browser workflows into Playwright E2E tests for CI. Use after workflows pass manual execution to promote them to automated CI tests.
- iOS equivalents: `/ios-workflow-generator`, `/ios-workflow-executor`, `/ios-workflow-to-playwright`

#### Debugging & Investigation

- `/systematic-debugging` (superpowers) — Structured bug investigation: reproduce → hypothesize → test → isolate → fix. Use before proposing fixes for non-trivial bugs.
- `/bug-interview` — Interview-style bug triage. Asks probing questions about reproduction steps, environment, patterns, and context before investigating. Use when reporting or receiving a bug.

#### Development Workflow

- `/dispatching-parallel-agents` (superpowers) — Run 2+ independent tasks in parallel with separate agents. Use for PRs that touch multiple unrelated concerns (e.g., lint + tests + feature work).
- `/verification-before-completion` (superpowers) — Require running verification commands and confirming output before claiming work is done. Prevents "it should work" without evidence.
- `/code-review` — Review a pull request against the plan and coding standards.
- `/feature-interview` — Deep interview about a feature idea before implementation. Asks about technical approach, edge cases, tradeoffs, and constraints.

### Hooks (`.claude/settings.json`)

- **PreToolUse (Edit|Write)**: `protect-files.sh` blocks edits to `.env`, `package-lock.json`, and existing migration files.
- **PostToolUse (Edit|Write)**: Auto-runs `eslint --fix` then `prettier --write` on changed `.ts/.tsx/.js/.jsx` files.

## Git Conventions

Commit format: `<type>: <description>`

Types: `feat`, `fix`, `test`, `docs`, `chore`, `security`, `perf`
