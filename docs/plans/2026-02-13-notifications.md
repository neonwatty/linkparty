# Phase 3: Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add in-app notifications (bell icon with badge, dropdown list) with Realtime updates for friend requests, friend accepted, and party invitations.

**Architecture:** New `notifications` table with RLS. Client-side lib for reads, API routes for creating notifications. Supabase Realtime subscription for live bell badge updates. NotificationBell component in app header. Email integration deferred to Phase 4 (party invitations trigger emails).

**Tech Stack:** Next.js, Supabase (PostgreSQL + RLS + Realtime), React, Tailwind CSS v4

---

### Task 1: Create notifications migration

**Files:**

- Create: `supabase/migrations/020_notifications.sql`

**SQL:**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'friend_request' | 'friend_accepted' | 'party_invite'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,  -- { friendshipId?, partyId?, partyCode?, senderName?, senderId? }
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE read = FALSE;
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- UPDATE: users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT: service role only (API routes create notifications)
-- No INSERT policy for authenticated — prevents client-side spam

-- DELETE: users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable Realtime for live notification updates
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- CHECK constraint on type
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('friend_request', 'friend_accepted', 'party_invite'));
```

---

### Task 2: Build lib/notifications.ts

**Files:**

- Create: `lib/notifications.ts`
- Create: `lib/notifications.test.ts`

**Functions:**

Read operations (client-side via RLS):

- `getUnreadCount()` — count of unread notifications for current user
- `getNotifications(limit?)` — list notifications ordered by created_at DESC, default limit 50
- `markAsRead(notificationId)` — update single notification read=true
- `markAllAsRead()` — update all unread for current user

Types:

```typescript
export interface Notification {
  id: string
  user_id: string
  type: 'friend_request' | 'friend_accepted' | 'party_invite'
  title: string
  body: string | null
  data: Record<string, string> | null
  read: boolean
  created_at: string
}
```

---

### Task 3: Create notification API route

**Files:**

- Create: `app/api/notifications/route.ts`

**Endpoints:**

- POST — create a notification (service role key, called internally from friend accept/request routes)
  - Body: `{ userId, type, title, body?, data? }`
  - Auth: service role key only (internal API)
- No GET needed — reads go through client-side lib

Also modify existing friend API routes to create notifications:

- `app/api/friends/request/route.ts` — after INSERT, create notification for recipient (type: friend_request)
- `app/api/friends/accept/route.ts` — after UPDATE+INSERT, create notification for sender (type: friend_accepted)

---

### Task 4: Build NotificationBell component

**Files:**

- Create: `components/notifications/NotificationBell.tsx`

**Requirements:**

- Bell SVG icon (simple outline, 20x20)
- Unread badge: red dot with count if > 0, positioned top-right
- Click opens/closes notification dropdown
- Uses the `icon-btn` class (matching UserIcon and HistoryIcon in AppHome)

---

### Task 5: Build NotificationDropdown and NotificationItem

**Files:**

- Create: `components/notifications/NotificationDropdown.tsx`
- Create: `components/notifications/NotificationItem.tsx`

**NotificationDropdown:**

- Positioned absolute below the bell icon
- Max height with scroll
- Header: "Notifications" + "Mark all read" button
- List of NotificationItem components
- Empty state: "No notifications"
- Click outside closes dropdown

**NotificationItem:**

- Renders based on type:
  - friend_request: "[Name] sent you a friend request" + Accept/Decline buttons
  - friend_accepted: "[Name] accepted your friend request"
  - party_invite: "[Name] invited you to [Party]" + "Join" button
- Unread items have slightly different background (bg-surface-700 vs bg-surface-800)
- Timestamp (relative: "2m ago", "1h ago", "Yesterday")
- Click marks as read

---

### Task 6: Wire up NotificationBell with Realtime

**Files:**

- Create: `hooks/useNotifications.ts`
- Modify: `components/landing/AppHome.tsx` — add NotificationBell to header

**useNotifications hook:**

- Fetches unread count on mount
- Subscribes to Supabase Realtime on notifications table (filter: user_id=me)
- On INSERT event: increment unread count, add to notifications list
- On UPDATE event (mark read): update in list, decrement count
- Returns: { unreadCount, notifications, markAsRead, markAllAsRead, loading }
- Cleanup: unsubscribe on unmount

**AppHome header integration:**

- Add NotificationBell between UserIcon and HistoryIcon

---

### Task 7: E2E tests for notifications

**Files:**

- Create: `e2e/notifications.spec.ts`

**Tests (mock mode):**

- NotificationBell renders in the home page header
- Clicking bell opens dropdown
- Dropdown shows "No notifications" empty state
- Clicking outside closes dropdown

---

### Task 8: Integrate notifications into friend API routes

**Files:**

- Modify: `app/api/friends/request/route.ts` — create notification for recipient
- Modify: `app/api/friends/accept/route.ts` — create notification for sender

After successful friend request: insert notification row for the recipient.
After successful accept: insert notification row for the original sender.

Use the service role Supabase client (already available in these routes) to insert directly into the notifications table.
