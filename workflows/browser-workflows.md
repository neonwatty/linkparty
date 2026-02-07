# Browser Workflows

> Auto-generated workflow documentation for Link Party
> Last updated: 2026-02-07
> Base URL: https://linkparty.app (production) or http://localhost:3000 (development)
> Platform: Desktop web browsers (Chrome, Safari, Firefox, Edge)

## Quick Reference

| #   | Workflow               | Purpose                | Steps | Status |
| --- | ---------------------- | ---------------------- | ----- | ------ |
| 1   | App Launch (Fresh)     | First-time app open    | 4     | ✅     |
| 2   | Create a New Party     | Party creation flow    | 8     | ✅     |
| 3   | Join an Existing Party | Join with code         | 7     | ✅     |
| 4   | Join via Deep Link     | Join using URL param   | 4     | ⬜     |
| 5   | Leave Party            | Exit to home           | 4     | ⬜     |
| 6   | Add YouTube Content    | Add video to queue     | 7     | ⬜     |
| 7   | Add Tweet Content      | Add tweet to queue     | 7     | ⬜     |
| 8   | Add Reddit Content     | Add post to queue      | 7     | ⬜     |
| 9   | Add Simple Note        | Add text note          | 6     | ✅     |
| 10  | Add Note with Due Date | Add reminder           | 7     | ⬜     |
| 11  | Mark Note Complete     | Toggle completion      | 4     | ⬜     |
| 12  | View and Edit Note     | Open and modify note   | 8     | ⬜     |
| 13  | Add Image Content      | Upload image to queue  | 8     | ⬜     |
| 14  | View Image in Lightbox | Full-screen image view | 4     | ⬜     |
| 15  | Reorder Queue Items    | Move items up/down     | 6     | ⬜     |
| 16  | Show Item Next         | Bump to show next      | 5     | ✅     |
| 17  | Remove Queue Item      | Delete from queue      | 6     | ⬜     |
| 18  | TV Mode                | Enter TV display       | 5     | ⬜     |
| 19  | View History           | View past parties      | 4     | ⬜     |
| 20  | Google OAuth Login     | OAuth flow             | 5     | ⬜     |
| 21  | Keyboard Navigation    | Tab/Enter navigation   | 5     | ⬜     |
| 22  | Responsive Layout      | Test viewport sizes    | 4     | ⬜     |

**Legend:** ✅ Passed | ⚠️ Partial | ❌ Failed | ⬜ Not tested

---

## Browser Setup

**Prerequisites for testing:**

1. Modern browser (Chrome 90+, Safari 15+, Firefox 90+, Edge 90+)
2. Development server running (`npm run dev`) or production URL
3. Clear browser cache for fresh testing
4. Network access for Supabase connection

**Test URLs:**

- Development: http://localhost:3000
- Production: https://linkparty.app

---

## Visual Design Reference (Campfire Dark Theme)

The app uses a **dark "Campfire" theme** with deep navy backgrounds and warm orange/golden accents:

### Colors

| Token          | Hex     | Usage                        |
| -------------- | ------- | ---------------------------- |
| surface-950    | #1a1d2e | Main background (deep navy)  |
| surface-900    | #242838 | Card backgrounds (dark card) |
| surface-800    | #2d3244 | Elevated surfaces            |
| surface-700    | #3a3f52 | Borders, dividers            |
| primary        | #ff8a5c | Primary warm orange          |
| primary-hover  | #e86b3a | Darker orange (hover/active) |
| secondary      | #f4c95d | Golden yellow accent         |
| lavender       | #a8a4ce | Note/tertiary accent         |
| text-primary   | #f5f0e8 | Warm white (main text)       |
| text-secondary | #b8b2a8 | Muted cream                  |
| text-muted     | #7a756c | Dim text                     |

### Typography

| Font    | Family                        | Usage                     |
| ------- | ----------------------------- | ------------------------- |
| Display | Instrument Serif (Georgia)    | Headings, buttons, inputs |
| Body    | Inter (system-ui, sans-serif) | Body text, paragraphs     |

---

## Core Workflows

### Workflow 1: App Launch (Fresh)

> Tests first-time app launch and verifies home screen elements on desktop.

**Prerequisites:** Clear localStorage, fresh browser session

1. Navigate to the app
   - Open browser and navigate to https://linkparty.app (or localhost:3000)
   - Wait for page to fully load
   - Verify no loading spinner stuck

2. Verify home screen branding
   - Verify "Link Party" title is visible
   - Verify tagline text is displayed
   - Verify dark navy background (#1a1d2e) with animated stars renders correctly
   - Verify fonts load properly (Instrument Serif for headings, Inter for body)

3. Verify primary CTAs
   - Verify "Start a Party" button is visible (warm orange #ff8a5c)
   - Verify "Join with Code" button is visible (secondary style)
   - Verify buttons have hover states (test by hovering - darker orange #e86b3a)

4. Verify navigation elements
   - Verify history icon button in top-right corner
   - Verify "Sign in" link visible
   - Verify no hamburger menu (good web convention)

---

### Workflow 2: Create a New Party

> Tests the complete flow of creating a new party and entering the party room.

**Prerequisites:** On home screen, no active party

1. Navigate to create party screen
   - Click "Start a Party" button
   - Verify "Create a Party" screen appears
   - Verify back button (chevron) in top-left corner
   - Verify URL does not change (SPA behavior)

2. Verify form elements
   - Verify "Your Name" input field has focus (autofocus)
   - Verify "Party Name" optional input is present
   - Verify settings display shows queue limit (100) and rate limit (5/min)
   - Verify inputs use dark theme styling with warm text (#f5f0e8)

3. Enter display name
   - Click the "Your Name" text field
   - Type "TestUser1"
   - Verify text appears in field
   - Verify input has orange focus ring styling (#ff8a5c)

4. Enter party name (optional)
   - Click the "Party Name" text field
   - Type "Test Party"
   - Verify text appears in field

5. Create the party
   - Click "Create Party" button
   - Verify button shows loading state "Creating..."
   - Wait for creation to complete

6. Verify party room loads
   - Verify party room screen appears
   - Verify party name "Test Party" shows in header
   - Verify 6-character party code is displayed

7. Verify party room elements
   - Verify "Now Showing" section (empty state or content)
   - Verify "Members" section shows "TestUser1" with host badge
   - Verify "Up Next" queue section is present
   - Verify floating "+" button for adding content (warm orange with glow)

8. Note the party code
   - Record the 6-character code displayed in header
   - This code will be used for Workflow 3

---

### Workflow 3: Join an Existing Party

> Tests joining a party using a 6-character code.

**Prerequisites:** On home screen, have a valid party code from Workflow 2

1. Navigate to join party screen
   - Click "Join with Code" button
   - Verify "Join a Party" screen appears
   - Verify back button in top-left corner

2. Verify form elements
   - Verify "Your Name" input field is present and focused
   - Verify 6-character code input field is present
   - Verify code input shows monospace styling

3. Enter display name
   - Click the "Your Name" text field
   - Type "TestUser2"
   - Verify text appears in field

4. Enter party code
   - Click the party code input field
   - Type the 6-character code (e.g., "ABC123")
   - Verify code appears in uppercase
   - Verify code field shows all 6 characters

5. Join the party
   - Verify "Join Party" button becomes enabled
   - Click "Join Party" button
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

### Workflow 4: Join via Deep Link

> Tests joining a party using URL query parameter.

**Prerequisites:** Have a valid party code

1. Navigate to join URL
   - Open browser and navigate to https://linkparty.app/join/ABC123 (replace with real code)
   - Wait for page to load

2. Verify auto-navigation
   - Verify app automatically navigates to join screen
   - Verify party code field is pre-populated with the code
   - Verify name field is ready for input

3. Enter name and join
   - Type display name in "Your Name" field
   - Click "Join Party" button
   - Wait for join to complete

4. Verify party room
   - Verify party room loads successfully
   - Verify joined the correct party

---

### Workflow 5: Leave Party

> Tests leaving a party and returning to home screen.

**Prerequisites:** In an active party room

1. Initiate leave
   - Click the back button (chevron) in top-left of party room
   - Note: May show confirmation dialog in future versions

2. Verify transition
   - Verify party room closes
   - Verify home screen appears

3. Verify home state
   - Verify "Start a Party" and "Join with Code" buttons visible
   - Verify no party code displayed
   - Verify clean home screen state

4. Verify session cleared
   - Refresh the page (F5 or Cmd+R)
   - Verify app opens to home screen (not party room)

---

## Content Workflows

### Workflow 6: Add YouTube Content

> Tests adding a YouTube video to the party queue.

**Prerequisites:** In an active party room

1. Open add content modal
   - Click the floating "+" button (bottom-right, warm orange)
   - Verify bottom sheet modal slides up
   - Verify URL input field has focus (autofocus)
   - Verify "Write a note" and "Upload an image" buttons present

2. Enter YouTube URL
   - Type "https://youtube.com/watch?v=dQw4w9WgXcQ"
   - Verify URL appears in field
   - Verify YouTube icon indicator appears (red badge)

3. Detect content type
   - Verify YouTube badge shown (content type detected)
   - Verify "Continue" button becomes enabled

4. Submit URL
   - Click "Continue" button
   - Verify loading state appears
   - Wait for content to be fetched

5. Verify preview
   - Verify preview shows YouTube thumbnail
   - Verify video title is displayed
   - Verify channel name is shown
   - Verify duration is shown

6. Add to queue
   - Click "Add to Queue" button
   - Verify success message appears
   - Verify modal closes automatically

7. Verify in queue
   - Verify YouTube item appears in "Up Next" queue
   - Verify thumbnail, title visible in queue item
   - Verify "Added by [Your Name]" shown

---

### Workflow 7: Add Tweet Content

> Tests adding a Twitter/X post to the party queue.

**Prerequisites:** In an active party room

1. Open add content modal
   - Click the floating "+" button
   - Verify bottom sheet modal slides up

2. Enter Tweet URL
   - Type "https://twitter.com/user/status/123456789"
   - Verify URL appears in field

3. Detect content type
   - Verify Twitter/X icon appears (blue badge, content type detected)
   - Verify "Continue" button becomes enabled

4. Submit URL
   - Click "Continue" button
   - Verify loading state appears
   - Wait for content fetch

5. Verify preview
   - Verify preview shows tweet author name
   - Verify tweet handle (@username) displayed
   - Verify tweet content text shown
   - Verify timestamp shown

6. Add to queue
   - Click "Add to Queue" button
   - Verify success message
   - Verify modal closes

7. Verify in queue
   - Verify Tweet item appears in queue
   - Verify tweet preview visible in queue item

---

### Workflow 8: Add Reddit Content

> Tests adding a Reddit post to the party queue.

**Prerequisites:** In an active party room

1. Open add content modal
   - Click the floating "+" button
   - Verify bottom sheet modal slides up

2. Enter Reddit URL
   - Type "https://reddit.com/r/funny/comments/abc123/post_title"
   - Verify URL appears in field

3. Detect content type
   - Verify Reddit icon appears (orange badge, content type detected)
   - Verify "Continue" button becomes enabled

4. Submit URL
   - Click "Continue" button
   - Wait for content fetch

5. Verify preview
   - Verify subreddit name (r/funny) displayed
   - Verify post title shown
   - Verify upvote count displayed
   - Verify comment count shown

6. Add to queue
   - Click "Add to Queue" button
   - Verify success message
   - Verify modal closes

7. Verify in queue
   - Verify Reddit item appears in queue
   - Verify subreddit and title visible

---

### Workflow 9: Add Simple Note

> Tests adding a basic text note without due date.

**Prerequisites:** In an active party room

1. Open add content modal
   - Click the floating "+" button
   - Verify bottom sheet modal slides up

2. Switch to note mode
   - Click "Write a note" button
   - Verify note writing UI appears
   - Verify textarea has focus
   - Verify "Due date (optional)" field visible

3. Enter note content
   - Type "Remember to buy groceries for dinner"
   - Verify text appears in textarea
   - Verify character count updates (e.g., "38/1000")

4. Preview note
   - Click "Preview" button
   - Verify note preview displays entered text
   - Verify "Your note" header with note icon (gray badge)
   - Verify no due date indicator shown

5. Add to queue
   - Click "Add to Queue" button
   - Verify success message
   - Verify modal closes

6. Verify in queue
   - Verify note item appears in queue with note icon
   - Verify checkbox (CheckCircle) appears for note item
   - Verify note preview text visible

---

### Workflow 10: Add Note with Due Date

> Tests adding a reminder note with a due date.

**Prerequisites:** In an active party room

1. Open add content modal
   - Click the floating "+" button
   - Verify bottom sheet modal slides up

2. Switch to note mode
   - Click "Write a note" button
   - Verify note writing UI appears

3. Enter note content
   - Type "Call mom for her birthday"
   - Verify text appears

4. Add due date
   - Click the due date input field
   - Select a date/time (tomorrow at 10:00 AM)
   - Verify selected date appears in field
   - Verify "Clear due date" link appears

5. Preview note
   - Click "Preview" button
   - Verify note preview displays text
   - Verify due date indicator is shown

6. Add to queue
   - Click "Add to Queue" button
   - Verify success message
   - Verify modal closes

7. Verify in queue
   - Verify note item appears
   - Verify completion checkbox visible

---

### Workflow 11: Mark Note Complete

> Tests toggling the completion status of a note.

**Prerequisites:** In party room with at least one note in queue

1. Locate note in queue
   - Find a note item in the "Up Next" queue
   - Verify checkbox (CheckCircle) icon is visible
   - Verify checkbox is unfilled/empty state

2. Toggle completion
   - Click the checkbox icon on the note item
   - Verify checkbox fills with green color
   - Verify note text may show strikethrough styling

3. Verify completion state
   - Verify completed state persists
   - If due date exists, verify it no longer shows as overdue

4. Toggle back to incomplete
   - Click the checkbox icon again
   - Verify checkbox returns to empty state
   - Verify normal text styling returns

---

### Workflow 12: View and Edit Note

> Tests opening a note to view and then editing its content.

**Prerequisites:** In party room with at least one note in queue

1. Select note item
   - Click on a note item in the queue (not the checkbox)
   - Verify action sheet/modal slides up from bottom

2. View note option
   - Verify "View Note" option is present (note items only)
   - Click "View Note"
   - Verify note view modal opens

3. Verify view modal
   - Verify full note text is displayed
   - Verify "Edit" button is present
   - Verify "Done" button is present

4. Open edit mode
   - Click "Edit" button
   - Verify edit modal opens with textarea
   - Verify existing note text is in textarea

5. Edit the note
   - Clear existing text or add to it
   - Type "Updated note content here"
   - Verify character count updates (if shown)

6. Save changes
   - Click "Save Note" button
   - Verify modal closes

7. Verify changes
   - Click on the same note item again
   - Click "View Note"
   - Verify updated text is displayed

8. Close and return
   - Click "Done" button
   - Verify back in party room

---

### Workflow 13: Add Image Content

> Tests uploading an image to the party queue with optional caption.

**Prerequisites:** In an active party room

1. Open add content modal
   - Click the floating "+" button
   - Verify bottom sheet modal slides up
   - Verify "Upload an image" button is visible
   - Verify file type hint "JPG, PNG, GIF, WebP up to 5MB"

2. Initiate image upload
   - Click "Upload an image" button
   - Verify file picker dialog opens

3. Select an image
   - Select a JPG, PNG, GIF, or WebP image (under 5MB)
   - Verify modal shows preview step
   - Verify selected image preview is displayed
   - Verify filename is shown below preview

4. Add optional caption
   - Click the caption textarea (below preview)
   - Type "This is my test image caption"
   - Verify character count shows (e.g., "32/200")

5. Verify preview state
   - Verify purple "Your image" badge at top
   - Verify image thumbnail is displayed
   - Verify caption text is visible in textarea

6. Add to queue
   - Click "Add to Queue" button
   - Verify upload progress toast appears (if image needs optimization)
   - Wait for upload to complete
   - Verify success message appears

7. Verify modal closes
   - Verify modal closes automatically
   - Verify back in party room

8. Verify in queue
   - Verify image item appears in "Up Next" queue
   - Verify image thumbnail visible in queue item
   - Verify caption text shown (if provided)
   - Verify "Added by [Your Name]" attribution

---

### Workflow 14: View Image in Lightbox

> Tests viewing an uploaded image in full-screen lightbox.

**Prerequisites:** In party room with at least one image in queue or now showing

1. Display image in now showing
   - Ensure an image is currently in "Now Showing" section
   - OR click an image item and select "Show Next" to display it

2. Open lightbox
   - Click on the image in the "Now Showing" display area
   - Verify full-screen lightbox opens
   - Verify dark overlay background

3. Verify lightbox content
   - Verify image displayed at full resolution
   - Verify caption displayed below image (if any)
   - Verify close button (X) visible in corner

4. Close lightbox
   - Click the X button or click outside the image
   - Verify lightbox closes
   - Verify returns to party room view
   - Alternative: Press Escape key to close

---

## Queue Management Workflows

### Workflow 15: Reorder Queue Items

> Tests moving items up and down in the queue.

**Prerequisites:** In party room with at least 3 items in queue

1. Note initial order
   - Observe current queue order
   - Remember positions of items 1, 2, 3

2. Select middle item
   - Click on item 2 in the queue
   - Verify action sheet opens

3. Move item up
   - Click "Move Up" option
   - Verify action sheet closes
   - Verify item 2 is now in position 1
   - Verify previous item 1 is now in position 2

4. Select same item again
   - Click on the item (now in position 1)
   - Verify action sheet opens
   - Verify "Move Up" may be disabled (already first)

5. Move item down
   - Click "Move Down" option
   - Verify item moves back down
   - Verify queue reorders appropriately

6. Cancel action
   - Click on any queue item
   - Click "Cancel" button in action sheet
   - Verify action sheet closes without changes

---

### Workflow 16: Show Item Next

> Tests bumping an item to play immediately after the current item.

**Prerequisites:** In party room with multiple items, one currently showing

1. Verify current state
   - Note which item is in "Now Showing" section
   - Note order of items in "Up Next" queue

2. Select item to bump
   - Click on an item that is NOT first in queue
   - Verify action sheet opens

3. Show next
   - Click "Show Next" option
   - Verify action sheet closes
   - Verify selected item moves to position 1 in queue

4. Verify new order
   - Verify bumped item is now first in "Up Next"
   - Verify other items shifted down accordingly

5. Advance queue (optional)
   - If host, click advance/next button (if available)
   - Verify the bumped item becomes "Now Showing"

---

### Workflow 17: Remove Queue Item

> Tests deleting an item from the queue with confirmation.

**Prerequisites:** In party room with at least one item in queue

1. Select item to remove
   - Click on any item in the queue
   - Verify action sheet opens

2. Initiate removal
   - Click "Remove from Queue" option (red text)
   - Verify confirmation modal appears
   - Verify "Are you sure?" or similar message

3. Cancel removal
   - Click "Cancel" button
   - Verify confirmation modal closes
   - Verify item still in queue

4. Confirm removal
   - Click on same item again
   - Click "Remove from Queue" option
   - Click "Remove" confirmation button

5. Verify removal
   - Verify item no longer in queue
   - Verify queue count decremented

6. Verify real-time sync
   - If second browser tab connected, verify item removed on both

---

## Additional Feature Workflows

### Workflow 18: TV Mode

> Tests entering and exiting TV display mode.

**Prerequisites:** In party room

1. Enter TV mode
   - Click the TV icon button in party room header
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
   - If Image: verify large image display (clickable for lightbox)
   - If empty: verify "No content showing" message

4. Exit TV mode
   - Click "Exit" button in top-left corner
   - Verify returns to party room screen

5. Verify state preserved
   - Verify same party, same queue
   - Verify all content intact

---

### Workflow 19: View History

> Tests viewing past party sessions (currently mock data).

**Prerequisites:** On home screen

1. Open history
   - Click history icon button in top-right of home screen
   - Verify history screen opens

2. Verify history list
   - Verify list of past parties displayed
   - Verify each card shows: party name, date, member count, item count

3. Verify mock data
   - Verify "Game Night" (Jan 10, 2025) appears
   - Verify "New Years Eve" (Dec 31, 2024) appears
   - Verify cards have staggered fade-in animation

4. Return to home
   - Click back button in top-left
   - Verify returns to home screen

---

### Workflow 20: Google OAuth Login

> Tests Google OAuth sign-in flow.

**Prerequisites:** On home screen, Google account available

1. Navigate to login
   - Click "Sign in" link at bottom of home screen
   - Verify login screen appears

2. Initiate Google OAuth
   - Click "Continue with Google" button
   - Verify browser redirects to Google sign-in

3. Complete Google sign-in
   - Enter Google credentials or select account
   - Complete any 2FA if required
   - Approve app permissions if prompted

4. Verify redirect
   - Verify app receives OAuth callback
   - Verify returns to app

5. Verify authenticated state
   - Verify user is signed in
   - Verify any user-specific UI updates

---

### Workflow 21: Keyboard Navigation

> Tests accessibility via keyboard navigation.

**Prerequisites:** On home screen

1. Tab through home screen
   - Press Tab key repeatedly
   - Verify focus moves to "Start a Party" button
   - Verify focus ring is visible (sage green outline)
   - Press Tab to move to "Join with Code"
   - Press Tab to move to history icon

2. Activate via Enter
   - Focus on "Start a Party" button
   - Press Enter key
   - Verify create party screen opens

3. Form navigation
   - Press Tab to move between form fields
   - Verify focus order is logical (name → party name → button)
   - Verify all inputs are keyboard accessible

4. Escape to close
   - Open add content modal
   - Press Escape key
   - Verify modal closes

5. Return navigation
   - Use browser back button
   - Note: SPA may not support browser back
   - Verify back button in UI works

---

### Workflow 22: Responsive Layout

> Tests app layout at different viewport sizes.

**Prerequisites:** Browser with DevTools

1. Test desktop (1920px)
   - Set viewport to 1920x1080
   - Verify layout looks good
   - Verify content is centered with max-width (430px container)
   - Verify no horizontal scroll

2. Test laptop (1280px)
   - Set viewport to 1280x800
   - Verify layout adapts appropriately
   - Verify all content visible

3. Test tablet (768px)
   - Set viewport to 768x1024
   - Verify mobile-optimized layout
   - Verify touch targets are adequate

4. Test mobile (375px)
   - Set viewport to 375x667 (iPhone SE)
   - Verify mobile layout works
   - Verify no content cut off
   - Verify FAB is visible and accessible

---

## Web Platform UX Verification

When testing workflows, verify these web conventions are followed:

### Navigation

- Uses URL-based navigation where appropriate (deep links work)
- Browser back button behavior is intuitive
- No hamburger menu on desktop (good)
- Clear visual hierarchy for CTAs

### Hover States

- All interactive elements have hover states
- Buttons show cursor: pointer
- Primary buttons darken on hover (orange #ff8a5c → darker #e86b3a)
- Cards/list items have hover feedback

### Focus States

- All focusable elements have visible focus rings (orange)
- Tab order is logical
- Keyboard navigation works throughout

### Responsive Design

- Layout adapts to different viewport sizes
- Content is readable at all sizes
- Touch targets adequate on mobile (44px+ minimum)
- No horizontal scrolling

### Performance

- Fast initial load (<3 seconds)
- No layout shifts during load
- Images lazy load appropriately
- Fonts load without FOUT/FOIT issues (Instrument Serif + Inter)

### Accessibility

- Color contrast meets WCAG AA (light text on dark navy background)
- All images have alt text
- Form inputs have labels
- Screen reader announces state changes

---

## Workflow Dependencies

Some workflows require state from previous workflows:

| Workflow               | Depends On                          |
| ---------------------- | ----------------------------------- |
| 3 (Join Party)         | 2 (Create Party) - needs party code |
| 4 (Join via Deep Link) | 2 (Create Party) - needs party code |
| 5 (Leave Party)        | 2 or 3 (active party)               |
| 6-13 (Content)         | 2 or 3 (active party)               |
| 14 (Image Lightbox)    | 13 (image in queue)                 |
| 15-17 (Queue Mgmt)     | 6-13 (items in queue)               |
| 18 (TV Mode)           | 2 or 3 (active party)               |

**Suggested execution order:** 1 → 2 → 6 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 5 → 3 → 4 → 19 → 20 → 21 → 22

---

## Test Results Log

### 2026-02-07: Multi-User Realtime Testing (Production)

**Environment:** Chrome (Host) + Playwright (Guest) on https://linkparty.app
**Party:** "Realtime Test Party" (KXE3NY)

| Test                                  | Result | Notes                                                   |
| ------------------------------------- | ------ | ------------------------------------------------------- |
| Create party (Host)                   | PASS   | Party created, code generated, room loaded              |
| Join party (Guest)                    | PASS   | Joined via code, member list updated on both            |
| Add note (Guest)                      | PASS   | INSERT event received by Host in real-time              |
| Queue advance (Host clicks Next)      | PASS   | UPDATE event received by Guest in real-time             |
| Full cycle (Guest add + Host advance) | PASS   | Both INSERT and UPDATE propagate instantly              |
| Member presence                       | PASS   | Both browsers show "2 watching" with correct identities |
| notification_logs INSERT              | PASS   | No 403 errors after RLS policy fix                      |

**Infrastructure fixes applied during testing:**

1. `.trim()` on env vars in `lib/supabase.ts` — fixed WebSocket 401 from trailing `\n` in anon key
2. `REPLICA IDENTITY FULL` on parties, party_members, queue_items — enables UPDATE/DELETE realtime events
3. INSERT RLS policy on notification_logs — fixes 403 on queue item addition
