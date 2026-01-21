# iOS Workflows

> Auto-generated workflow documentation for Remember Party
> Last updated: 2026-01-20
> Bundle ID: com.rememberparty.app

## Quick Reference

| # | Workflow | Purpose | Steps | Status |
|---|----------|---------|-------|--------|
| 1 | App Launch (Fresh) | First-time app open | 4 | ⬜ |
| 2 | Create a New Party | Party creation flow | 8 | ✅ Passed (2026-01-20) |
| 3 | Join an Existing Party | Join with code | 7 | ✅ Passed (2026-01-20) |
| 4 | Leave Party | Exit to home | 4 | ✅ Passed (2026-01-21) |
| 5 | Add YouTube Content | Add video to queue | 7 | ⬜ |
| 6 | Add Tweet Content | Add tweet to queue | 7 | ⬜ |
| 7 | Add Reddit Content | Add post to queue | 7 | ⬜ |
| 8 | Add Simple Note | Add text note | 6 | ✅ Passed (2026-01-20) |
| 9 | Add Note with Due Date | Add reminder | 7 | ✅ Passed (2026-01-21) - Note: due date saved but indicator not visible in queue list |
| 10 | Mark Note Complete | Toggle completion | 4 | ✅ Passed (2026-01-20) |
| 11 | View and Edit Note | Open and modify note | 8 | ✅ Passed (2026-01-21) |
| 12 | Reorder Queue Items | Move items up/down | 6 | ✅ Passed (2026-01-21) |
| 13 | Show Item Next | Bump to show next | 5 | ✅ Passed (2026-01-21) |
| 14 | Remove Queue Item | Delete from queue | 6 | ✅ Passed (2026-01-21) - Fixed action sheet overflow |
| 15 | TV Mode | Enter TV display | 5 | ✅ Passed (2026-01-21) |
| 16 | View History | View past parties | 4 | ✅ Passed (2026-01-21) |
| 17 | Google OAuth Login | [MANUAL] OAuth flow | 5 | ⬜ |

**Legend:** ✅ Passed | ⚠️ Partial | ❌ Failed | ⬜ Not tested

---

## Simulator Setup (One-Time)

**Prerequisites for automation:**
1. iOS Simulator booted with iPhone 15 Pro or similar
2. App built and installed via `npm run build:ios` and Xcode
3. Network access available for Supabase connection
4. Safari cookies cleared for fresh OAuth testing

**Bundle ID:** `com.rememberparty.app`

---

## Core Workflows

### Workflow 1: App Launch (Fresh)

> Tests first-time app launch and verifies home screen elements.

**Prerequisites:** App installed, no existing party in localStorage

1. Launch the app
   - Launch Remember Party (com.rememberparty.app)
   - Wait for splash/loading to complete
   - Verify home screen loads

2. Verify home screen branding
   - Verify "Remember Party" title is visible
   - Verify tagline text is displayed
   - Verify gradient background renders correctly

3. Verify primary CTAs
   - Verify "Start a Party" button is visible and tappable (44pt+ touch target)
   - Verify "Join with Code" button is visible and tappable

4. Verify navigation elements
   - Verify history icon button in top-right corner
   - Verify "Sign in" link at bottom of screen
   - Verify iOS platform conventions (no hamburger menu, proper button styling)

---

### Workflow 2: Create a New Party

> Tests the complete flow of creating a new party and entering the party room.

**Prerequisites:** On home screen, no active party

1. Navigate to create party screen
   - Tap "Start a Party" button
   - Verify "Create a Party" screen appears
   - Verify back button in top-left corner

2. Verify form elements
   - Verify "Your Name" input field is present
   - Verify "Party Name" optional input is present
   - Verify settings display shows queue limit (100) and rate limit (5/min)

3. Enter display name
   - Tap the "Your Name" text field
   - Type "TestUser1"
   - Verify text appears in field

4. Enter party name (optional)
   - Tap the "Party Name" text field
   - Type "Test Party"
   - Verify text appears in field

5. Create the party
   - Tap "Create Party" button
   - Verify loading state shows "Creating..."
   - Wait for creation to complete

6. Verify party room loads
   - Verify party room screen appears
   - Verify party name "Test Party" shows in header
   - Verify 6-character party code is displayed

7. Verify party room elements
   - Verify "Now Showing" section (empty state or content)
   - Verify "Members" section shows "TestUser1" with host badge
   - Verify "Up Next" queue section is present
   - Verify floating "+" button for adding content

8. Note the party code
   - Record the 6-character code displayed in header
   - This code will be used for Workflow 3

---

### Workflow 3: Join an Existing Party

> Tests joining a party using a 6-character code.

**Prerequisites:** On home screen, have a valid party code from Workflow 2

1. Navigate to join party screen
   - Tap "Join with Code" button
   - Verify "Join a Party" screen appears
   - Verify back button in top-left corner

2. Verify form elements
   - Verify "Your Name" input field is present
   - Verify 6-character code input field is present
   - Verify code input shows monospace styling

3. Enter display name
   - Tap the "Your Name" text field
   - Type "TestUser2"
   - Verify text appears in field

4. Enter party code
   - Tap the party code input field
   - Type the 6-character code (e.g., "ABC123")
   - Verify code appears in uppercase
   - Verify code field shows all 6 characters

5. Join the party
   - Verify "Join Party" button becomes enabled
   - Tap "Join Party" button
   - Verify loading state shows "Joining..."
   - Wait for join to complete

6. Verify party room loads
   - Verify party room screen appears
   - Verify party name matches expected
   - Verify party code matches entered code

7. Verify membership
   - Verify "Members" section shows both "TestUser1" (host) and "TestUser2"
   - Verify correct host badge placement

---

### Workflow 4: Leave Party

> Tests leaving a party and returning to home screen.

**Prerequisites:** In an active party room

1. Initiate leave
   - Tap the back button (chevron) in top-left of party room
   - Note: May show confirmation dialog in future versions

2. Verify transition
   - Verify party room closes
   - Verify home screen appears

3. Verify home state
   - Verify "Start a Party" and "Join with Code" buttons visible
   - Verify no party code displayed
   - Verify clean home screen state

4. Verify session cleared
   - Close and reopen app
   - Verify app opens to home screen (not party room)

---

## Content Workflows

### Workflow 5: Add YouTube Content

> Tests adding a YouTube video to the party queue.

**Prerequisites:** In an active party room

1. Open add content modal
   - Tap the floating "+" button (bottom-right)
   - Verify bottom sheet modal slides up
   - Verify URL input field is present
   - Verify "Write a note" button is present

2. Enter YouTube URL
   - Tap the URL input field
   - Type "https://youtube.com/watch?v=dQw4w9WgXcQ"
   - Verify URL appears in field

3. Detect content type
   - Verify YouTube icon/indicator appears (content type detected)
   - Verify "Continue" button becomes enabled

4. Submit URL
   - Tap "Continue" button
   - Verify loading state appears
   - Wait for content to be fetched

5. Verify preview
   - Verify preview shows YouTube thumbnail
   - Verify video title is displayed
   - Verify channel name is shown
   - Verify duration is shown

6. Add to queue
   - Tap "Add to Queue" button
   - Verify success message appears
   - Verify modal closes automatically

7. Verify in queue
   - Verify YouTube item appears in "Up Next" queue
   - Verify thumbnail, title visible in queue item
   - Verify "Added by [Your Name]" shown

---

### Workflow 6: Add Tweet Content

> Tests adding a Twitter/X post to the party queue.

**Prerequisites:** In an active party room

1. Open add content modal
   - Tap the floating "+" button
   - Verify bottom sheet modal slides up

2. Enter Tweet URL
   - Tap the URL input field
   - Type "https://twitter.com/user/status/123456789"
   - Verify URL appears in field

3. Detect content type
   - Verify Twitter/X icon appears (content type detected)
   - Verify "Continue" button becomes enabled

4. Submit URL
   - Tap "Continue" button
   - Verify loading state appears
   - Wait for content fetch

5. Verify preview
   - Verify preview shows tweet author name
   - Verify tweet handle (@username) displayed
   - Verify tweet content text shown
   - Verify timestamp shown

6. Add to queue
   - Tap "Add to Queue" button
   - Verify success message
   - Verify modal closes

7. Verify in queue
   - Verify Tweet item appears in queue
   - Verify tweet preview visible in queue item

---

### Workflow 7: Add Reddit Content

> Tests adding a Reddit post to the party queue.

**Prerequisites:** In an active party room

1. Open add content modal
   - Tap the floating "+" button
   - Verify bottom sheet modal slides up

2. Enter Reddit URL
   - Tap the URL input field
   - Type "https://reddit.com/r/funny/comments/abc123/post_title"
   - Verify URL appears in field

3. Detect content type
   - Verify Reddit icon appears (content type detected)
   - Verify "Continue" button becomes enabled

4. Submit URL
   - Tap "Continue" button
   - Wait for content fetch

5. Verify preview
   - Verify subreddit name (r/funny) displayed
   - Verify post title shown
   - Verify upvote count displayed
   - Verify comment count shown

6. Add to queue
   - Tap "Add to Queue" button
   - Verify success message
   - Verify modal closes

7. Verify in queue
   - Verify Reddit item appears in queue
   - Verify subreddit and title visible

---

### Workflow 8: Add Simple Note

> Tests adding a basic text note without due date.

**Prerequisites:** In an active party room

1. Open add content modal
   - Tap the floating "+" button
   - Verify bottom sheet modal slides up

2. Switch to note mode
   - Tap "Write a note" button
   - Verify note writing UI appears
   - Verify textarea is present
   - Verify "Add due date" option is visible

3. Enter note content
   - Tap the note textarea
   - Type "Remember to buy groceries for dinner"
   - Verify text appears in textarea

4. Preview note
   - Tap "Preview" button
   - Verify note preview displays entered text
   - Verify no due date indicator shown

5. Add to queue
   - Tap "Add to Queue" button
   - Verify success message
   - Verify modal closes

6. Verify in queue
   - Verify note item appears in queue with note icon
   - Verify checkbox (CheckCircle) appears for note item
   - Verify note preview text visible

---

### Workflow 9: Add Note with Due Date

> Tests adding a reminder note with a due date.

**Prerequisites:** In an active party room

1. Open add content modal
   - Tap the floating "+" button
   - Verify bottom sheet modal slides up

2. Switch to note mode
   - Tap "Write a note" button
   - Verify note writing UI appears

3. Enter note content
   - Tap the note textarea
   - Type "Call mom for her birthday"
   - Verify text appears

4. Add due date
   - Tap the due date input field
   - Select a date/time (tomorrow at 10:00 AM)
   - Verify selected date appears in field
   - Verify "Clear" link appears to remove due date

5. Preview note
   - Tap "Preview" button
   - Verify note preview displays text
   - Verify due date indicator is shown

6. Add to queue
   - Tap "Add to Queue" button
   - Verify success message
   - Verify modal closes

7. Verify in queue
   - Verify note item appears with calendar icon indicator
   - Verify due date text displayed on item
   - Verify completion checkbox visible

---

### Workflow 10: Mark Note Complete

> Tests toggling the completion status of a note.

**Prerequisites:** In party room with at least one note in queue

1. Locate note in queue
   - Find a note item in the "Up Next" queue
   - Verify checkbox (CheckCircle) icon is visible
   - Verify checkbox is unfilled/empty state

2. Toggle completion
   - Tap the checkbox icon on the note item
   - Verify checkbox fills with green color
   - Verify note text may show strikethrough styling

3. Verify completion state
   - Verify completed state persists
   - If due date exists, verify it no longer shows as overdue

4. Toggle back to incomplete
   - Tap the checkbox icon again
   - Verify checkbox returns to empty state
   - Verify normal text styling returns

---

## Note Management Workflows

### Workflow 11: View and Edit Note

> Tests opening a note to view and then editing its content.

**Prerequisites:** In party room with at least one note in queue

1. Select note item
   - Tap on a note item in the queue (not the checkbox)
   - Verify action sheet slides up from bottom

2. View note option
   - Verify "View Note" option is present (note items only)
   - Tap "View Note"
   - Verify note view modal opens

3. Verify view modal
   - Verify full note text is displayed
   - Verify "Edit" button is present
   - Verify "Done" button is present

4. Open edit mode
   - Tap "Edit" button
   - Verify edit modal opens with textarea
   - Verify existing note text is in textarea

5. Edit the note
   - Clear existing text or add to it
   - Type "Updated note content here"
   - Verify character count updates (if shown)

6. Save changes
   - Tap "Save Note" button
   - Verify modal closes

7. Verify changes
   - Tap on the same note item again
   - Tap "View Note"
   - Verify updated text is displayed

8. Close and return
   - Tap "Done" button
   - Verify back in party room

---

## Queue Management Workflows

### Workflow 12: Reorder Queue Items

> Tests moving items up and down in the queue.

**Prerequisites:** In party room with at least 3 items in queue

1. Note initial order
   - Observe current queue order
   - Remember positions of items 1, 2, 3

2. Select middle item
   - Tap on item 2 in the queue
   - Verify action sheet opens

3. Move item up
   - Tap "Move Up" option
   - Verify action sheet closes
   - Verify item 2 is now in position 1
   - Verify previous item 1 is now in position 2

4. Select same item again
   - Tap on the item (now in position 1)
   - Verify action sheet opens
   - Verify "Move Up" may be disabled (already first)

5. Move item down
   - Tap "Move Down" option
   - Verify item moves back down
   - Verify queue reorders appropriately

6. Cancel action
   - Tap on any queue item
   - Tap "Cancel" button in action sheet
   - Verify action sheet closes without changes

---

### Workflow 13: Show Item Next

> Tests bumping an item to play immediately after the current item.

**Prerequisites:** In party room with multiple items, one currently showing

1. Verify current state
   - Note which item is in "Now Showing" section
   - Note order of items in "Up Next" queue

2. Select item to bump
   - Tap on an item that is NOT first in queue
   - Verify action sheet opens

3. Show next
   - Tap "Show Next" option
   - Verify action sheet closes
   - Verify selected item moves to position 1 in queue

4. Verify new order
   - Verify bumped item is now first in "Up Next"
   - Verify other items shifted down accordingly

5. Advance queue (optional)
   - If host, tap advance/next button (if available)
   - Verify the bumped item becomes "Now Showing"

---

### Workflow 14: Remove Queue Item

> Tests deleting an item from the queue with confirmation.

**Prerequisites:** In party room with at least one item in queue

1. Select item to remove
   - Tap on any item in the queue
   - Verify action sheet opens

2. Initiate removal
   - Tap "Remove from Queue" option (red text)
   - Verify confirmation modal appears
   - Verify "Are you sure?" or similar message

3. Cancel removal
   - Tap "Cancel" button
   - Verify confirmation modal closes
   - Verify item still in queue

4. Confirm removal
   - Tap on same item again
   - Tap "Remove from Queue" option
   - Tap "Remove" confirmation button

5. Verify removal
   - Verify item no longer in queue
   - Verify queue count decremented

6. Verify real-time sync
   - If second device connected, verify item removed on both

---

## Additional Feature Workflows

### Workflow 15: TV Mode

> Tests entering and exiting TV display mode.

**Prerequisites:** In party room

1. Enter TV mode
   - Tap the TV icon button in party room header
   - Verify full-screen TV mode activates
   - Verify dark background with large content display

2. Verify TV mode layout
   - Verify "Now Showing" content displayed large
   - Verify "Up Next" sidebar shows queued items
   - Verify party code visible at bottom
   - Verify member count displayed

3. Verify content display
   - If YouTube: verify large thumbnail with play icon
   - If Tweet: verify formatted tweet card
   - If Reddit: verify formatted post card
   - If Note: verify large text display
   - If empty: verify "No content showing" message

4. Exit TV mode
   - Tap "Exit" button in top-left corner
   - Verify returns to party room screen

5. Verify state preserved
   - Verify same party, same queue
   - Verify all content intact

---

### Workflow 16: View History

> Tests viewing past party sessions (currently mock data).

**Prerequisites:** On home screen

1. Open history
   - Tap history icon button in top-right of home screen
   - Verify history screen opens

2. Verify history list
   - Verify list of past parties displayed
   - Verify each card shows: party name, date, member count, item count

3. Verify mock data
   - Verify "Game Night" (Jan 10, 2025) appears
   - Verify "New Years Eve" (Dec 31, 2024) appears
   - Verify cards have staggered fade-in animation

4. Return to home
   - Tap back button in top-left
   - Verify returns to home screen

---

### Workflow 17: Google OAuth Login

> Tests Google OAuth sign-in flow.

**Prerequisites:** On home screen, Google account available

**Note:** [MANUAL] OAuth requires browser redirect that cannot be fully automated

1. Navigate to login
   - Tap "Sign in" link at bottom of home screen
   - Verify login screen appears

2. Initiate Google OAuth
   - [MANUAL] Tap "Continue with Google" button
   - [MANUAL] Verify browser/webview opens to Google sign-in

3. Complete Google sign-in
   - [MANUAL] Enter Google credentials or select account
   - [MANUAL] Complete any 2FA if required
   - [MANUAL] Approve app permissions if prompted

4. Verify redirect
   - [MANUAL] Verify app receives OAuth callback
   - [MANUAL] Verify returns to app

5. Verify authenticated state
   - Verify user is signed in
   - Verify any user-specific UI updates

---

## iOS Platform UX Verification

When testing workflows, verify these iOS conventions are followed:

### Navigation
- Primary navigation uses appropriate iOS patterns (not hamburger menu)
- Back buttons show chevron with previous screen title or just chevron
- Modals use bottom sheets (iOS 15+ style) with drag handle

### Touch Targets
- All interactive elements are at least 44x44pt
- Buttons have adequate padding for touch
- Form fields are properly sized for mobile input

### Visual Design
- Uses native-feeling iOS components
- Proper safe area handling for notch/Dynamic Island
- Appropriate use of blur effects and transparency
- Dark theme with proper contrast ratios

### Interactions
- Scroll behavior feels native
- Keyboard dismisses appropriately
- Loading states provide feedback
- Success/error states are clear

---

## Workflow Dependencies

Some workflows require state from previous workflows:

| Workflow | Depends On |
|----------|------------|
| 3 (Join Party) | 2 (Create Party) - needs party code |
| 4 (Leave Party) | 2 or 3 (active party) |
| 5-10 (Content) | 2 or 3 (active party) |
| 11-14 (Queue Mgmt) | 5-9 (items in queue) |
| 15 (TV Mode) | 2 or 3 (active party) |

**Suggested execution order:** 1 → 2 → 5 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 4 → 3 → 16 → 17
