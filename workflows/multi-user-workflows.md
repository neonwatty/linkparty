# Multi-User Browser Workflows

> Auto-generated multi-user workflow documentation for Link Party
> Last updated: 2026-03-02

**Target**: https://linkparty.app
**Execution**: Claude Code Agent Teams — Host agent (Tab 1) + Guest agent (Tab 2)

## Quick Reference

| #   | Workflow                              | Personas        | Purpose                                            | Steps |
| --- | ------------------------------------- | --------------- | -------------------------------------------------- | ----- |
| 1   | Create and Join Party                 | Host + Guest    | Basic party creation and joining                   | 8     |
| 2   | Realtime Content Sync                 | Host + Guest    | YouTube + note sync across users                   | 8     |
| 3   | Queue Advance Sync                    | Host + Guest    | NOW SHOWING sync across users                      | 8     |
| 4   | Toggle Completion Sync                | Host + Guest    | Complete/uncomplete sync both ways                 | 10    |
| 5   | Drag-and-Drop Reorder Sync            | Host + Guest    | Queue reorder sync                                 | 8     |
| 6   | Password-Protected Join               | Host + Guest    | Password gate on join                              | 9     |
| 7   | TV Mode Sync                          | Host + Guest    | TV mode advance + content add sync                 | 9     |
| 8   | Guest Leave and Rejoin                | Host + Guest    | Leave/rejoin member count sync                     | 9     |
| 9   | Deep Link Join                        | Host + Guest    | Pre-filled code from /join/CODE URL                | 6     |
| 10  | Simultaneous Content Adds             | Host + Guest    | Race condition: both add at once                   | 10    |
| 11  | Friend Request from Party Room        | User A + User B | Send/accept friend request in party                | 12    |
| 12  | In-App Notification Delivery          | User A + User B | Real-time notification bell sync                   | 10    |
| 13  | Block User Isolation                  | User A + User B | Block prevents friend request + removes friendship | 10    |
| 14  | Email Party Invite to Join            | Host + Invitee  | Email invite → join → auto-friendship              | 10    |
| 15  | Friends Active Parties on Home Screen | User A + User B | Visible party appears on friend's home             | 10    |
| 16  | Queue Deletion Sync                   | Host + Guest    | Delete item syncs across users                     | 8     |
| 17  | Note Edit Sync                        | Host + Guest    | Note content edit syncs across users               | 8     |

---

## Two-User Workflows

### Workflow 1: Create and Join Party

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Both users have existing accounts and are logged in
- App running at target URL

#### Steps

1. [User A] Navigate to /create
2. [User A] Type "Multi-User Test" in the party name field
3. [User A] Leave password empty
4. [User A] Click "Start a Party" button -> party room loads with party code visible in header
5. [User A] Verify: party code (6 uppercase characters) is displayed in the header
6. [User A] **SYNC → User B: party code**
7. [User B] Navigate to /join
8. [User B] Type the party code from User A in the code input field
9. [User B] Click "Join Party" button -> party room loads
10. [User B] Verify: party room displays with same party code in header
11. [User B] **SYNC → User A: joined successfully**
12. [User A] Verify: member count shows "2 watching" (cross-user sync)

---

### Workflow 2: Realtime Content Sync

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 1 completed (both users in same party)

#### Steps

1. [User A] Click the floating action button (FAB / + button) to add content
2. [User A] Select "Link" tab in the Add Content modal
3. [User A] Type "https://www.youtube.com/watch?v=dQw4w9WgXcQ" in the URL input
4. [User A] Click "Add to Queue" -> item appears in queue with YouTube thumbnail
5. [User A] Verify: YouTube item visible in queue with title and thumbnail
6. [User B] Verify: YouTube item appears in queue in real time (cross-user sync, wait up to 5s)
7. [User B] Click the FAB / + button to add content
8. [User B] Select "Note" tab in the Add Content modal
9. [User B] Type "Guest's test note" in the note text area
10. [User B] Click "Add to Queue" -> note appears in queue
11. [User B] Verify: note visible in queue
12. [User A] Verify: "Guest's test note" appears in queue in real time (cross-user sync, wait up to 5s)

---

### Workflow 3: Queue Advance Sync

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 2 completed (queue has at least 2 items)

#### Steps

1. [User A] Click "Show Next" button -> NOW SHOWING section appears with the first queue item
2. [User A] Verify: NOW SHOWING section displays the first queue item
3. [User B] Verify: NOW SHOWING section shows the same item as User A (cross-user sync, wait up to 5s)
4. [User A] Click "Show Next" again -> NOW SHOWING updates to the next item
5. [User A] Verify: NOW SHOWING displays the second queue item
6. [User B] Verify: NOW SHOWING updated to match User A's view (cross-user sync, wait up to 5s)

---

### Workflow 4: Toggle Completion Sync

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 1 completed (both users in same party)

#### Steps

1. [User B] Click the FAB / + button, select "Note" tab
2. [User B] Type "Toggle test note" in the note text area
3. [User B] Click "Add to Queue" -> note appears in queue
4. [User A] Verify: "Toggle test note" appears in queue (cross-user sync, wait up to 5s)
5. [User A] Click the checkbox next to "Toggle test note" -> strikethrough styling appears
6. [User A] Verify: note shows strikethrough styling
7. [User B] Verify: "Toggle test note" shows strikethrough styling (cross-user sync, wait up to 5s)
8. [User B] Click the checkbox to uncheck "Toggle test note" -> strikethrough removed
9. [User B] Verify: strikethrough removed
10. [User A] Verify: "Toggle test note" no longer has strikethrough (cross-user sync, wait up to 5s)

---

### Workflow 5: Drag-and-Drop Reorder Sync

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 1 completed (both users in same party)

#### Steps

1. [User A] Add a YouTube link: https://www.youtube.com/watch?v=dQw4w9WgXcQ
2. [User A] Add a note: "Note Alpha"
3. [User A] Add a note: "Note Beta"
4. [User A] Verify: all 3 items appear in queue in order
5. [User B] Verify: all 3 items appear in same order as User A (cross-user sync)
6. [User A] Drag "Note Beta" from the last position to the first position
7. [User A] Verify: queue order changed — "Note Beta" is now first
8. [User B] Verify: queue order matches User A's new order (cross-user sync, wait up to 5s)

---

### Workflow 6: Password-Protected Join

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Both users have existing accounts and are logged in

#### Steps

1. [User A] Navigate to /create
2. [User A] Type "Secret Party" in the party name field
3. [User A] Toggle password protection on, type "test123" in the password field
4. [User A] Click "Start a Party" -> party room loads
5. [User A] **SYNC → User B: party code only (NOT the password)**
6. [User B] Navigate to /join
7. [User B] Type the party code from User A
8. [User B] Click "Join Party" -> password field appears
9. [User B] Type "wrong" in the password field
10. [User B] Click "Join Party" -> error message "Incorrect party password." appears
11. [User B] Verify: error message is visible
12. [User B] Clear the password field, type "test123"
13. [User B] Click "Join Party" -> party room loads successfully
14. [User A] Verify: member count shows "2 watching" (cross-user sync)

---

### Workflow 7: TV Mode Sync

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 2 completed (queue has items, both users in party)

#### Steps

1. [User A] Click the TV mode button in the party room header
2. [User A] Verify: TV mode view loads (full-screen content display)
3. [User A] Click to advance to the next item in TV mode
4. [User A] Verify: content updates in TV mode view
5. [User B] Verify: NOW SHOWING section updated in regular party room view (cross-user sync, wait up to 5s)
6. [User B] Click the FAB / + button, select "Note" tab
7. [User B] Type "Added during TV mode" in the note text area
8. [User B] Click "Add to Queue" -> note added
9. [User A] Verify: queue count updated in TV mode view (cross-user sync)

---

### Workflow 8: Guest Leave and Rejoin

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 1 completed (both users in same party)

#### Steps

1. [User A] Verify: member count shows "2 watching"
2. [User B] Click "Leave Party" button -> redirected to home page
3. [User B] Verify: home page is displayed
4. [User A] Wait up to 5 seconds for real-time update
5. [User A] Verify: member count shows "1 watching" (cross-user sync)
6. [User B] Navigate to /join
7. [User B] Type the same party code
8. [User B] Click "Join Party" -> party room loads
9. [User A] Verify: member count shows "2 watching" (cross-user sync, wait up to 5s)

---

### Workflow 9: Deep Link Join

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Both users have existing accounts and are logged in

#### Steps

1. [User A] Navigate to /create
2. [User A] Type "Deep Link Test" in the party name field
3. [User A] Click "Start a Party" -> party room loads with party code visible
4. [User A] Note the party code (e.g., ABC123)
5. [User A] **SYNC → User B: party code for deep link URL**
6. [User B] Navigate directly to /join/CODE (using the code from User A)
7. [User B] Verify: party code is pre-filled in the code input field
8. [User B] Click "Join Party" -> party room loads
9. [User A] Verify: member count shows "2 watching" (cross-user sync)

---

### Workflow 10: Simultaneous Content Adds

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 1 completed (both users in same party)

#### Steps

1. [User A] Click the FAB / + button
2. [User A] Select "Link" tab
3. [User A] Type "https://www.youtube.com/watch?v=jNQXAC9IVRw" in the URL input
4. [User A] Do NOT click "Add to Queue" yet
5. [User B] Click the FAB / + button
6. [User B] Select "Note" tab
7. [User B] Type "Simultaneous guest note" in the note text area
8. [User A] Click "Add to Queue"
9. [User B] Click "Add to Queue"
10. [User A] Wait 3 seconds, verify: queue contains both items (YouTube link + note)
11. [User B] Wait 3 seconds, verify: queue contains both items (cross-user sync)

---

## Social & Notification Workflows

### Workflow 11: Friend Request from Party Room

#### Personas

- User A: Authenticated user (party host)
- User B: Authenticated user (party guest, NOT a friend of User A)

#### Prerequisites

- Both users have accounts and are logged in
- Users are NOT already friends
- Neither user has blocked the other
- Both users are in the same party (Workflow 1 completed)

#### Steps

1. [User A] Look at the members list in the party room
2. [User A] Verify: User B's name appears in the member list with a "+ " (add friend) button
3. [User A] Click the "+ " button next to User B's name -> button changes to "Sent" state
4. [User A] Verify: the button shows "Sent" (friend request pending)
5. [User B] Verify: notification bell in the header shows a badge count of "1" (cross-user sync, wait up to 5s)
6. [User B] Click the notification bell icon -> notification dropdown opens
7. [User B] Verify: dropdown shows a "friend_request" notification from User A with Accept/Decline buttons
8. [User B] Click "Accept" on the notification -> notification updates to accepted state
9. [User B] Verify: notification is marked as read or removed
10. [User A] Verify: notification bell shows a badge count (friend_accepted notification, cross-user sync, wait up to 5s)
11. [User A] Click the notification bell icon
12. [User A] Verify: dropdown shows a "friend_accepted" notification from User B

---

### Workflow 12: In-App Notification Delivery

#### Personas

- User A: Authenticated user
- User B: Authenticated user (accepted friend of User A)

#### Prerequisites

- Both users have accounts and are logged in
- Users are already accepted friends
- User A has created a party

#### Steps

1. [User A] Navigate to the party room
2. [User A] Click the "Invite" or share button to open the invite modal
3. [User A] Switch to the "Friends" tab in the invite modal
4. [User A] Select User B from the friends list
5. [User A] Click "Send Invite" -> confirmation appears
6. [User B] Verify: notification bell badge count increases (cross-user sync, wait up to 5s)
7. [User B] Click the notification bell icon -> dropdown opens
8. [User B] Verify: dropdown shows a "party_invite" notification from User A with a "Join" action
9. [User B] Click "Join" on the notification -> navigated to the party room
10. [User A] Verify: member count increases in the party room (cross-user sync, wait up to 5s)

---

### Workflow 13: Block User Isolation

#### Personas

- User A: Authenticated user
- User B: Authenticated user (currently a friend of User A)

#### Prerequisites

- Both users have accounts and are logged in
- Users are currently accepted friends

#### Steps

1. [User A] Navigate to /profile
2. [User A] Click the "Friends" tab
3. [User A] Verify: User B appears in the friends list
4. [User A] Click the block action on User B's row -> confirmation appears
5. [User A] Confirm the block -> User B is removed from friends list and added to blocked list
6. [User A] Click the "Blocked" tab
7. [User A] Verify: User B appears in the blocked list
8. [User B] Navigate to /profile
9. [User B] Click the "Friends" tab
10. [User B] Verify: User A no longer appears in the friends list (friendship was removed by the block)

---

### Workflow 14: Email Party Invite to Join

#### Personas

- User A: Party host (authenticated)
- User B: Invited user (authenticated, has account with known email)

#### Prerequisites

- Both users have accounts
- User A has created a party
- User B's email address is known to User A

#### Steps

1. [User A] Navigate to the party room
2. [User A] Click the "Invite" or share button -> invite modal opens
3. [User A] Verify: "Email" tab is active by default
4. [User A] Type User B's email address in the email input field
5. [User A] Click "Send Invite" -> confirmation message appears
6. [User A] Verify: "Invite sent" confirmation is displayed
7. [User B] Navigate to /join/CODE?inviter=USER_A_UUID (simulating clicking the email link)
8. [User B] Verify: party code is pre-filled from the URL
9. [User B] Click "Join Party" -> party room loads, invite claim fires (auto-friendship)
10. [User A] Verify: member count increases (cross-user sync, wait up to 5s)

---

### Workflow 15: Friends Active Parties on Home Screen

#### Personas

- User A: Party host (authenticated)
- User B: Authenticated user (accepted friend of User A)

#### Prerequisites

- Both users have accounts and are logged in
- Users are already accepted friends

#### Steps

1. [User A] Navigate to /create
2. [User A] Type "Visible Party" in the party name field
3. [User A] Toggle "Visible to friends" ON (checkbox/toggle in the create form)
4. [User A] Click "Start a Party" -> party room loads
5. [User B] Navigate to the home screen (/)
6. [User B] Wait up to 30 seconds (friends' active parties polls every 30s)
7. [User B] Verify: "Visible Party" appears in the friends' active parties section on the home screen
8. [User A] Verify: party room is active
9. [User B] Click on the "Visible Party" entry -> navigated to join or view the party
10. [User B] Verify: party room loads or join form with pre-filled code appears

---

## Content Sync Workflows

### Workflow 16: Queue Deletion Sync

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 1 completed (both users in same party)

#### Steps

1. [User A] Click the FAB / + button, select "Note" tab
2. [User A] Type "Delete me" in the note text area
3. [User A] Click "Add to Queue" -> note appears in queue
4. [User B] Verify: "Delete me" appears in queue (cross-user sync, wait up to 5s)
5. [User A] Click on the "Delete me" queue item to open the actions sheet
6. [User A] Click "Delete" in the actions sheet -> item is removed from queue
7. [User A] Verify: "Delete me" is no longer in the queue
8. [User B] Verify: "Delete me" disappears from the queue in real time (cross-user sync, wait up to 5s)

---

### Workflow 17: Note Edit Sync

#### Personas

- User A: Party host (authenticated)
- User B: Party guest (authenticated)

#### Prerequisites

- Workflow 1 completed (both users in same party)

#### Steps

1. [User A] Click the FAB / + button, select "Note" tab
2. [User A] Type "Original note text" in the note text area
3. [User A] Click "Add to Queue" -> note appears in queue
4. [User B] Verify: "Original note text" appears in queue (cross-user sync, wait up to 5s)
5. [User A] Click on the "Original note text" queue item to open the actions sheet
6. [User A] Click "Edit" in the actions sheet -> edit mode opens
7. [User A] Clear the text and type "Updated note text"
8. [User A] Click "Save" or confirm the edit -> note content updates
9. [User A] Verify: note now shows "Updated note text" in the queue
10. [User B] Verify: note content updated to "Updated note text" in real time (cross-user sync, wait up to 5s)

---

## Test Results Log

| Workflow                           | Date       | Host Result | Guest Result | Notes                                                                |
| ---------------------------------- | ---------- | ----------- | ------------ | -------------------------------------------------------------------- |
| 1. Create and Join Party           | 2026-02-13 | PASS        | PASS         | Party created, guest joined, 2 watching confirmed                    |
| 2. Realtime Content Sync           | 2026-02-13 | PASS        | PASS         | YouTube + note synced bidirectionally via realtime                   |
| 3. Queue Advance Sync              | 2026-02-13 | PASS        | PASS         | NOW SHOWING updated on both tabs after advance                       |
| 4. Toggle Completion Sync          | 2026-02-13 | PASS        | PASS         | Chrome Host + Playwright Guest: complete/uncomplete synced both ways |
| 5. Drag-and-Drop Reorder           | 2026-02-13 | SKIP        | SKIP         | @dnd-kit PointerSensor cannot be triggered by browser automation     |
| 6. Password-Protected Join         | 2026-02-13 | PASS        | PASS         | Wrong password rejected, correct password accepted                   |
| 7. TV Mode Sync                    | 2026-02-13 | PASS        | PASS         | Chrome Host TV mode + Playwright Guest: advance + content add synced |
| 8. Guest Leave and Rejoin          | 2026-02-13 | PASS        | PASS         | Leave navigated home, rejoin worked with password                    |
| 9. Deep Link Join                  | 2026-02-13 | PASS        | PASS         | /join/CODE pre-filled party code, join succeeded                     |
| 10. Simultaneous Content Adds      | 2026-02-13 | PASS        | PASS         | Both items appeared on both tabs within 3s via realtime              |
| 11. Friend Request from Party Room |            |             |              |                                                                      |
| 12. In-App Notification Delivery   |            |             |              |                                                                      |
| 13. Block User Isolation           |            |             |              |                                                                      |
| 14. Email Party Invite to Join     |            |             |              |                                                                      |
| 15. Friends Active Parties on Home |            |             |              |                                                                      |
| 16. Queue Deletion Sync            |            |             |              |                                                                      |
| 17. Note Edit Sync                 |            |             |              |                                                                      |
