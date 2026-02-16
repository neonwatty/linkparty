# Phase 2: Friendships Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add mutual friendships (send/accept/decline/remove friend requests) with UI in the profile page and party room.

**Architecture:** Directed-pair friendship model — two rows per friendship for O(1) "list my friends" queries. Client-side lib for reads (RLS-protected), API routes for mutations (service role key, transactional consistency). Profile page gets tabs for Friends and Requests.

**Tech Stack:** Next.js API routes, Supabase (PostgreSQL + RLS), React components with Tailwind CSS v4

---

### Task 1: Create friendships migration

**Files:**

- Create: `supabase/migrations/018_friendships.sql`

**What to build:**

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id),
  CHECK (status IN ('pending', 'accepted'))
);

CREATE INDEX idx_friendships_user ON friendships (user_id, status);
CREATE INDEX idx_friendships_friend ON friendships (friend_id, status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: users can see friendships where they are user_id or friend_id
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- INSERT: users can send friend requests (user_id must be self)
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- UPDATE: recipient can accept/update incoming requests
CREATE POLICY "Recipients can update incoming requests"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = friend_id);

-- DELETE: either party can delete a friendship row
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- updated_at trigger (reuse existing function from migration 008)
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Verification:** Review SQL for correct RLS policies, CHECK constraints, indexes.

---

### Task 2: Build lib/friends.ts — Client-side CRUD

**Files:**

- Create: `lib/friends.ts`
- Create: `lib/friends.test.ts`

**Pattern:** Follow `lib/profile.ts` — `'use client'`, import `supabase` from `@/lib/supabase`, return typed results.

**Functions to implement:**

```typescript
// Types
export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted'
  created_at: string
  updated_at: string
}

export interface FriendWithProfile {
  friendship_id: string
  user: UserProfile // from lib/profile.ts
  since: string // created_at of the friendship
}

export interface FriendRequest {
  friendship_id: string
  from: UserProfile // the sender's profile
  sent_at: string
}

// Read operations (client-side via RLS)
export async function listFriends(): Promise<FriendWithProfile[]>
// SELECT from friendships WHERE user_id = me AND status = 'accepted'
// JOIN user_profiles on friend_id to get profile data
// Note: Supabase doesn't support JOINs directly, so:
// 1. Get friendship rows
// 2. Get profile data for all friend_ids in a single query

export async function listIncomingRequests(): Promise<FriendRequest[]>
// SELECT from friendships WHERE friend_id = me AND status = 'pending'
// Get profiles for all user_ids (the senders)

export async function listOutgoingRequests(): Promise<FriendRequest[]>
// SELECT from friendships WHERE user_id = me AND status = 'pending'
// Get profiles for all friend_ids (the recipients)

export async function getFriendshipStatus(
  otherUserId: string,
): Promise<'none' | 'pending_sent' | 'pending_received' | 'accepted'>
// Check friendships table for any row between me and otherUserId

export async function searchUsers(query: string): Promise<UserProfile[]>
// Reuse searchProfiles from lib/profile.ts, excluding self and existing friends
```

**Mutation operations (call API routes):**

```typescript
export async function sendFriendRequest(friendId: string): Promise<{ error: string | null }>
// POST /api/friends/request  body: { friendId }

export async function acceptFriendRequest(friendshipId: string): Promise<{ error: string | null }>
// POST /api/friends/accept  body: { friendshipId }

export async function declineFriendRequest(friendshipId: string): Promise<{ error: string | null }>
// DELETE /api/friends/[friendshipId]?action=decline

export async function cancelFriendRequest(friendshipId: string): Promise<{ error: string | null }>
// DELETE /api/friends/[friendshipId]?action=cancel

export async function removeFriend(friendshipId: string): Promise<{ error: string | null }>
// DELETE /api/friends/[friendshipId]?action=unfriend
```

**Tests:** Mock supabase client, test each read function returns correct shape. Test mutation functions call fetch with correct URL/body.

---

### Task 3: Create API routes for friend mutations

**Files:**

- Create: `app/api/friends/request/route.ts`
- Create: `app/api/friends/accept/route.ts`
- Create: `app/api/friends/[id]/route.ts`
- Modify: `lib/errorMessages.ts` — add FRIENDS section

**Pattern:** Follow `app/api/queue/items/route.ts` — service role key, validation, error handling.

#### POST /api/friends/request

- Body: `{ friendId: string }`
- Auth: extract user from Supabase auth (use `request.headers.get('Authorization')`)
- Validate: friendId is valid UUID, not self
- Check: no existing friendship (pending or accepted) between these users
- INSERT: `(user_id=me, friend_id=friendId, status='pending')`
- Return: `{ success: true, friendship }` or `{ error }` with status code

#### POST /api/friends/accept

- Body: `{ friendshipId: string }`
- Auth: verify current user is the `friend_id` on the friendship row (recipient)
- UPDATE: set status='accepted' on the original row
- INSERT: create reverse row `(user_id=me, friend_id=original.user_id, status='accepted')`
- Return: `{ success: true }` or `{ error }`

#### DELETE /api/friends/[id]

- Path param: friendship ID
- Query param: `action` = 'decline' | 'cancel' | 'unfriend'
- Auth: verify current user is involved in the friendship
- For 'decline': DELETE the single pending row (I am friend_id)
- For 'cancel': DELETE the single pending row (I am user_id)
- For 'unfriend': DELETE both rows (accepted friendship)
- Return: `{ success: true }` or `{ error }`

**Error messages to add:**

```typescript
export const FRIENDS = {
  ALREADY_FRIENDS: 'You are already friends with this user.',
  REQUEST_EXISTS: 'A friend request already exists.',
  REQUEST_NOT_FOUND: 'Friend request not found.',
  CANNOT_FRIEND_SELF: 'You cannot send a friend request to yourself.',
  NOT_AUTHORIZED: 'You are not authorized to perform this action.',
} as const
```

---

### Task 4: Build FriendsList component

**Files:**

- Create: `components/profile/FriendsList.tsx`

**What to build:**

- Input: list of `FriendWithProfile[]`
- Search filter input (filters locally by display name or username)
- Each friend row: avatar emoji + display name + @username (if set) + "Remove" button
- Empty state: "No friends yet. Add friends from the party room!"
- Remove button shows confirmation before calling `removeFriend()`
- Loading state while fetching

**UI pattern:** Follow existing component style (Tailwind classes from ProfileEditor, surface-800 backgrounds, text-text-secondary labels).

---

### Task 5: Build FriendRequests component

**Files:**

- Create: `components/profile/FriendRequests.tsx`

**What to build:**

- Two sections: "Incoming" and "Sent"
- Incoming: list of `FriendRequest[]` with Accept/Decline buttons per row
- Sent: list of outgoing requests with Cancel button per row
- Each row: avatar + display name + action buttons
- Empty states for each section
- Loading state while fetching
- Badge count for incoming requests (passed as prop for parent to use)

---

### Task 6: Add "Add as friend" to MembersList

**Files:**

- Modify: `components/party/MembersList.tsx`
- Modify: `components/party/index.ts` (if needed)

**What to change:**

- MemberItem gets a new optional `onAddFriend` callback + `friendshipStatus` prop
- If `friendshipStatus === 'none'` and not current user: show small "+" button
- If `friendshipStatus === 'pending_sent'`: show "Pending" label (muted)
- If `friendshipStatus === 'accepted'`: show nothing (already friends)
- Parent (PartyRoomClient) fetches friendship status for all members and passes it down

**Important:** Member interface gets optional `userId?: string` field (for logged-in members). The friendship check uses userId, not sessionId.

---

### Task 7: Wire up /profile page with friends tabs

**Files:**

- Modify: `app/profile/page.tsx`
- Create: `components/profile/ProfileTabs.tsx`

**What to build:**

- Add tab bar below "Profile" heading: "Profile" | "Friends" | "Requests"
- Default tab: "Profile" (shows ProfileEditor as before)
- "Friends" tab: shows FriendsList
- "Requests" tab: shows FriendRequests with badge count
- Tab state managed with useState
- Badge on "Requests" tab shows count of incoming pending requests

---

### Task 8: E2E tests for friendship flows

**Files:**

- Create: `e2e/friendships.spec.ts`

**What to test (mock mode):**

- Profile page tabs render correctly
- Friends tab shows empty state
- Requests tab shows empty state
- Tab switching works
- Profile tab still shows ProfileEditor

**Note:** Full friend request send/accept/decline flows require real Supabase — document as skipped test outlines like in `e2e/multi-user.spec.ts`.
