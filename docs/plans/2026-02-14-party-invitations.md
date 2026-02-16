# Phase 4: Party Invitations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the social layer (friendships + notifications) with the party system. Users can invite friends when creating or during a party, receive in-app + email notifications, and discover friends' active parties on the home page.

**Architecture:** New `visible_to_friends` column on parties. New API route for friend invitations (creates notification + sends email). FriendsPicker component for multi-select. "Friends are partying" section on home page with Realtime updates.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + RLS + Realtime), React 19, Tailwind CSS v4

---

### Task 1: Migration — add `visible_to_friends` to parties table

**Files:**

- Create: `supabase/migrations/022_party_visibility.sql`

**SQL:**

```sql
ALTER TABLE parties ADD COLUMN visible_to_friends BOOLEAN NOT NULL DEFAULT false;
```

No new RLS policies needed — existing parties policies handle visibility. The "friends' parties" query will be done server-side via service role.

---

### Task 2: API route — invite friends to party

**Files:**

- Create: `app/api/parties/invite-friends/route.ts`

**Endpoint:** `POST /api/parties/invite-friends`

**Request body:**

```typescript
{
  partyId: string
  partyCode: string
  partyName: string
  friendIds: string[]  // user IDs of friends to invite
}
```

**Logic:**

1. Auth: verify user via Bearer token (`supabase.auth.getUser(token)`)
2. Validate: friendIds is non-empty array, max 20 friends per invite batch
3. Verify party exists and is not expired
4. Verify each friendId is actually a friend (query friendships table for accepted pairs)
5. For each valid friend:
   a. Create `party_invite` notification via service role: `{ user_id: friendId, type: 'party_invite', title: '{inviterName} invited you to {partyName}', data: { partyId, partyCode, inviterName, inviterId } }`
   b. Look up friend's email from `auth.users` — send email invite via `sendPartyInvitation()` (fire-and-forget, don't block on email failure)
6. Return `{ success: true, invited: number }` or `{ error }` with status

**Auth pattern:** Bearer token from `Authorization` header, service role key for writes (same as friends API routes).

---

### Task 3: Build `FriendsPicker` component

**Files:**

- Create: `components/party/FriendsPicker.tsx`

**Props:**

```typescript
interface FriendsPickerProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  maxSelections?: number // default 20
}
```

**Requirements:**

- Fetches friends list on mount via `listFriends()` from `lib/friends.ts`
- Search input at top — filters by display_name or username (client-side filter)
- Each friend row: avatar emoji + display name + @username (if set) + checkbox
- Selected friends have highlighted background (accent color)
- Empty state: "No friends yet — add friends from your profile"
- Loading state: spinner while fetching
- Sort: alphabetical by display_name (party frequency sort deferred — needs analytics data we don't have yet)
- Mobile-friendly: scrollable list with max-height
- Uses `icon-btn` and existing card/surface styles

---

### Task 4: Integrate FriendsPicker into party creation flow

**Files:**

- Modify: `app/create/page.tsx`

**Changes:**

- Add new state: `selectedFriendIds: string[]`, `visibleToFriends: boolean`
- After the settings card (password/queue/rate limit), add new "Invite Friends" section:
  - Collapsible section with "Invite friends (optional)" header
  - FriendsPicker inside the section
  - "Visible to friends" toggle below FriendsPicker
- On create: after party is created successfully, if selectedFriendIds is non-empty, call `POST /api/parties/invite-friends` with the friend IDs (fire-and-forget — don't block navigation)
- Pass `visibleToFriends` to the create API body
- Modify `POST /api/parties/create` to accept and save `visibleToFriends` field

**Modified API:** `app/api/parties/create/route.ts` — add `visibleToFriends?: boolean` to body, include in INSERT

---

### Task 5: Integrate FriendsPicker into party room

**Files:**

- Modify: `components/party/InviteModal.tsx`

**Changes:**

- Add a tab/section toggle at the top: "Invite by Email" | "Invite Friends"
- "Invite by Email" tab: existing email form (unchanged)
- "Invite Friends" tab: FriendsPicker + "Send Invites" button
- On "Send Invites" click: call `POST /api/parties/invite-friends` → show success state
- `InviteModal` props: add `partyId: string` (already has `partyCode` and `partyName`)
- `PartyHeader` / `PartyRoomClient`: pass `partyId` to InviteModal

---

### Task 6: Verify notification "Join Party" action

**Files:**

- Read/verify: `components/notifications/NotificationItem.tsx`

**Verification:**

- NotificationItem already renders party_invite with "Join" link to `/join/{partyCode}`
- Verify the `data.partyCode` field is present in the notification created by Task 2
- Ensure clicking "Join" navigates correctly and marks notification as read

If any fixes needed, apply them. This task is primarily verification.

---

### Task 7: "Friends are partying" section on home page

**Files:**

- Create: `app/api/parties/friends-active/route.ts`
- Modify: `components/landing/AppHome.tsx`

**API route:** `GET /api/parties/friends-active`

**Logic:**

1. Auth: verify user via Bearer token
2. Query accepted friendships for current user → get friend IDs
3. Query parties where `host_session_id` maps to a friend's user AND `visible_to_friends = true` AND `expires_at > NOW()`
   - Need to join through `party_members` to find parties where friend is host (or any member with matching user_id)
   - Actually simpler: query `party_members` WHERE `user_id IN (friendIds)` AND party `visible_to_friends = true` AND party not expired
   - Return party info + host display_name + member count
4. Return `{ parties: [{ id, code, name, hostName, memberCount, expiresAt }] }`

**AppHome changes:**

- Call the API on mount (only if user is authenticated)
- If parties returned, show "Friends are partying" section between greeting and CTA buttons
- Each party card: party name (or "Unnamed party"), host name, member count badge, "Join" button → navigates to `/join/CODE`
- Empty state: don't show the section at all (no "no friends partying" message)
- Auto-refresh: poll every 30 seconds or use Realtime subscription on parties table

---

### Task 8: E2E tests for party invitations

**Files:**

- Create: `e2e/party-invitations.spec.ts`

**Tests (mock mode):**

1. Create page shows "Invite friends" section
2. Create page shows "Visible to friends" toggle
3. Party room invite modal has "Invite Friends" tab
4. FriendsPicker shows empty state when no friends

**Tests (requires real Supabase — skipped in mock mode):** 5. Invite friends during party creation sends notifications 6. Invite friends from party room sends notifications 7. Friends' active parties appear on home page
