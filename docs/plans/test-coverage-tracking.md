# Test Coverage Tracking

Automated tracking of test coverage improvements. Target: >= 80% across all metrics.

---

## Iteration Log

### Iteration 1 (2026-02-28)

**Files Tested:** 7
**Coverage:** lines 84.05%, branches 77.77%, functions 80.16%, statements 83.27%
**Remaining P0-P5 Untested:** branches still below 80% threshold (60 more branches needed)

#### Tests Written

- [x] `src/middleware.test.ts` (priority: P4, 17 tests) — new file, auth middleware branches
- [x] `lib/friends.test.ts` (priority: P1, 22 new tests) — blockUser, unblockUser, listBlockedUsers, isBlocked, error branches
- [x] `lib/notificationTriggers.test.ts` (priority: P1, 10 new tests) — reddit/note/image getItemTitle branches, insert error, mock mode
- [x] `app/api/queue/items/[id]/route.test.ts` (priority: P0, 14 new tests) — validatePatchBody/validateDeleteBody branches
- [x] `app/api/queue/items/reorder/route.test.ts` (priority: P0, 8 new tests) — validateReorderRequest branches
- [x] `app/api/queue/items/route.test.ts` (priority: P0, 9 new tests) — text length limits, position, type-specific validation
- [x] `app/api/queue/items/advance/route.test.ts` (priority: P0, 5 new tests) — validate function branches

#### Coverage Progress

| Metric     | Before | After  | Change |
| ---------- | ------ | ------ | ------ |
| Lines      | 80.93% | 84.05% | +3.12  |
| Branches   | 73.46% | 77.77% | +4.31  |
| Functions  | 78.89% | 80.16% | +1.27  |
| Statements | 81.87% | 83.27% | +1.40  |

### Iteration 2 (2026-02-28)

**Files Tested:** 7
**Coverage:** lines 85.82%, branches 80.30%, functions 82.04%, statements 85.12%
**Remaining P0-P5 Untested:** ALL metrics >= 80% threshold reached

#### Tests Written

- [x] `app/api/queue/items/route.handler.test.ts` (priority: P0, 15 tests) — new file, handler logic: rate limiting, queue size, image limit, insert error
- [x] `lib/profile.test.ts` (priority: P1, 5 new tests) — getMyProfile error, validation error, 23514 error, generic error, searchProfiles edge cases
- [x] `src/lib/supabase.test.ts` (priority: P1, 7 new tests) — getAvatar, getCurrentParty, setCurrentParty, clearCurrentParty
- [x] `src/lib/logger.test.ts` (priority: P1, 22 tests) — new file, all logger functions and formatMessage branches
- [x] `utils/contentHelpers.test.ts` (priority: P1, 9 tests) — new file, detectContentType, getContentTypeBadge
- [x] `components/icons/icons.test.tsx` (priority: Skip→tested, 32 tests) — new file, all icon component renders
- [x] `vitest.config.ts` (config change) — added utils/ to test include patterns

#### Coverage Progress

| Metric     | Before | After  | Change |
| ---------- | ------ | ------ | ------ |
| Lines      | 84.05% | 85.82% | +1.77  |
| Branches   | 77.77% | 80.30% | +2.53  |
| Functions  | 80.16% | 82.04% | +1.88  |
| Statements | 83.27% | 85.12% | +1.85  |
