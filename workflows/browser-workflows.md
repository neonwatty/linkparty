# Browser Workflows

> Auto-generated workflow documentation for Link Party
> Last updated: 2026-02-16
> Base URL: https://linkparty.app (production) or http://localhost:3000 (development)
> Platform: Desktop web browsers (Chrome, Safari, Firefox, Edge)
> Auth: All pages require authentication (auth wall via middleware). Users must sign in before any workflow.

## Quick Reference

| #   | Workflow                   | Purpose                        | Steps | Status |
| --- | -------------------------- | ------------------------------ | ----- | ------ |
| 1   | App Launch (Authenticated) | Verify home screen after login | 5     | ✅     |
| 2   | Create a New Party         | Party creation flow            | 7     | ✅     |
| 3   | Join an Existing Party     | Join with code                 | 5     | ✅     |
| 4   | Join via Deep Link         | Join using /join/CODE URL      | 4     | ✅     |
| 5   | Leave Party                | Exit to home                   | 4     | ✅     |
| 6   | Add YouTube Content        | Add video to queue             | 7     | ⬜     |
| 7   | Add Tweet Content          | Add tweet to queue             | 7     | ⬜     |
| 8   | Add Reddit Content         | Add post to queue              | 7     | ⬜     |
| 9   | Add Simple Note            | Add text note                  | 6     | ✅     |
| 10  | Add Note with Due Date     | Add reminder                   | 7     | ⬜     |
| 11  | Mark Note Complete         | Toggle completion              | 4     | ⬜     |
| 12  | View and Edit Note         | Open and modify note           | 8     | ⬜     |
| 13  | Add Image Content          | Upload image to queue          | 8     | ⬜     |
| 14  | View Image in Lightbox     | Full-screen image view         | 4     | ⬜     |
| 15  | Reorder Queue Items        | Move items up/down             | 6     | ⬜     |
| 16  | Show Item Next             | Bump to show next              | 5     | ✅     |
| 17  | Remove Queue Item          | Delete from queue              | 6     | ⬜     |
| 18  | TV Mode                    | Enter TV display               | 5     | ✅     |
| 19  | View History               | View past parties              | 4     | ✅     |
| 20  | Sign Up & Login            | Email signup + Google OAuth    | 8     | ⬜     |
| 21  | Keyboard Navigation        | Tab/Enter navigation           | 5     | ⬜     |
| 22  | Responsive Layout          | Test viewport sizes            | 4     | ⬜     |
| 23  | Profile Setup              | Edit name/username/avatar      | 7     | ✅     |
| 24  | Send Friend Request        | Add friend from party          | 5     | ⬜     |
| 25  | Accept Friend Request      | Accept from Requests tab       | 6     | ⬜     |
| 26  | Decline/Cancel Request     | Decline or cancel request      | 5     | ⬜     |
| 27  | Remove Friend              | Remove with confirmation       | 5     | ⬜     |
| 28  | Block and Unblock User     | Block/unblock flow             | 7     | ⬜     |
| 29  | Notification Bell          | View & mark read               | 6     | ⬜     |
| 30  | Act on Notification        | Accept/join from notif         | 5     | ⬜     |
| 31  | Invite Friends (Create)    | Invite during creation         | 6     | ⬜     |
| 32  | Invite from Party Room     | Email & friend invites         | 7     | ⬜     |
| 33  | Friends' Active Parties    | View & join from home          | 5     | ⬜     |
| 34  | Password-Protected Party   | Create & join w/ password      | 7     | ⬜     |
| 35  | Party Creation Limit       | Max 5 parties enforcement      | 5     | ⬜     |
| 36  | Email Events Dashboard     | Admin email monitoring         | 5     | ⬜     |

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

### Workflow 1: App Launch (Authenticated)

> Tests app launch for an authenticated user and verifies home screen elements on desktop.

**Prerequisites:** Signed in (all pages require authentication via auth wall middleware)

1. Navigate to the app
   - Open browser and navigate to https://linkparty.app (or localhost:3000)
   - If not signed in, verify redirect to /login page
   - Sign in with Google OAuth or email/password
   - Wait for home page to fully load

2. Verify home screen branding
   - Verify greeting "Hey, {displayName}" is visible
   - Verify tagline text is displayed
   - Verify dark navy background (#1a1d2e) with animated twinkling stars renders correctly
   - Verify fonts load properly (Instrument Serif for headings, Inter for body)

3. Verify primary CTAs
   - Verify "Start a Party" link button is visible (warm orange #ff8a5c) → /create
   - Verify "Join with Code" link button is visible (secondary style) → /join
   - Verify buttons have hover states (test by hovering - darker orange #e86b3a)

4. Verify navigation elements (top header)
   - Verify "Sign out" button in top-left corner
   - Verify profile icon button → /profile
   - Verify notification bell icon with unread badge (if any)
   - Verify history icon button → /history
   - Verify no hamburger menu (good web convention)

5. Verify friends' active parties section (if applicable)
   - If user has friends with visible active parties, verify "Friends are partying" section
   - Verify party cards show: party name, host name, member count, "Join" link
   - If no friends' parties active, verify the section is hidden

---

### Workflow 2: Create a New Party

> Tests the complete flow of creating a new party and entering the party room.

**Prerequisites:** Signed in, on home screen

1. Navigate to create party screen
   - Click "Start a Party" link
   - Verify URL changes to /create
   - Verify "Start a party" heading appears
   - Verify "Create a room and invite your friends" subtitle
   - Verify back button (chevron) in top-left corner

2. Verify form elements
   - Verify "Party name (optional)" input field is present
   - Verify settings card shows: Password protect toggle, Queue limit (100), Rate limit (5/min)
   - Verify "Invite friends" collapsible section (if user has friends)
   - Verify "Create Party" button at bottom
   - Note: Display name is auto-populated from authenticated user profile (no name input)

3. Enter party name (optional)
   - Click the "Party name" text field
   - Type "Test Party"
   - Verify text appears in field
   - Verify character count appears (e.g., "10/100")

4. Create the party
   - Click "Create Party" button
   - Verify button shows loading state "Creating..."
   - Wait for creation to complete

5. Verify party room loads
   - Verify party room screen appears at /party/{id}
   - Verify 6-character party code is displayed prominently
   - Verify "Party expires in 23h left" countdown

6. Verify party room elements
   - Verify "Now Showing" section (empty state)
   - Verify member count shows "1 watching"
   - Verify "Up Next" queue section is present (empty)
   - Verify floating "+" button for adding content (warm orange with glow)
   - Verify header buttons: Leave (chevron), TV mode, Invite by email, Share party

7. Note the party code
   - Record the 6-character code displayed in header
   - This code will be used for Workflow 3

---

### Workflow 3: Join an Existing Party

> Tests joining a party using a 6-character code.

**Prerequisites:** Signed in, on home screen, have a valid party code from Workflow 2

1. Navigate to join party screen
   - Click "Join with Code" link
   - Verify URL changes to /join
   - Verify "Join a party" heading appears
   - Verify "Enter the code from your host" subtitle
   - Verify back button (chevron) in top-left corner
   - Note: Display name is auto-populated from authenticated user profile (no name input)

2. Enter party code
   - Click the party code input field (placeholder "ABC123")
   - Type the 6-character code (e.g., "ABC123")
   - Verify code appears in uppercase with letter-spacing
   - Verify code field is centered, monospace, large text

3. Join the party
   - Verify "Join Party" button becomes enabled when code is 6 characters
   - Click "Join Party" button
   - Verify loading state shows "Joining..."
   - Wait for join to complete

4. Verify party room loads
   - Verify party room screen appears at /party/{id}
   - Verify party code matches entered code
   - Verify member count increased

5. Verify membership
   - Verify member count shows correct number (e.g., "2 watching")
   - Verify current user appears in member list

---

### Workflow 4: Join via Deep Link

> Tests joining a party using /join/CODE URL path.

**Prerequisites:** Signed in, have a valid party code

1. Navigate to join URL
   - Open browser and navigate to https://linkparty.app/join/ABC123 (replace with real code)
   - Wait for page to load

2. Verify pre-filled state
   - Verify "Join a party" heading appears
   - Verify "Confirm the code and join" subtitle
   - Verify party code field is pre-populated with the code from URL
   - Verify "Join Party" button is enabled (code already has 6 characters)
   - Note: Display name auto-populated from auth profile (no name input)

3. Join the party
   - Click "Join Party" button
   - Verify loading state shows "Joining..."
   - Wait for join to complete

4. Verify party room
   - Verify party room loads successfully at /party/{id}
   - Verify joined the correct party (code matches)

---

### Workflow 5: Leave Party

> Tests leaving a party and returning to home screen.

**Prerequisites:** Signed in, in an active party room

1. Initiate leave
   - Click the "Leave party" button (back chevron, aria-label="Leave party") in top-left of party room
   - Verify party_members row is deleted (member count decreases for other users)

2. Verify transition
   - Verify party room closes
   - Verify home screen appears at /

3. Verify home state
   - Verify "Start a Party" and "Join with Code" links visible
   - Verify greeting "Hey, {displayName}" visible
   - Verify navigation elements (Sign out, Profile, Notifications, History)

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

> Tests viewing past party sessions from real Supabase data.

**Prerequisites:** Signed in, on home screen

1. Open history
   - Click history icon button in top-right of home screen
   - Verify URL changes to /history
   - Verify "Party History" heading and "Your past watch sessions" subtitle

2. Verify history list (if parties exist)
   - Verify list of past parties displayed (last 10 joined)
   - Verify each card shows: party name (or "Party {code}"), date, member count, item count
   - Verify lock icon for password-protected parties
   - Verify cards are clickable (link to /party/{id} for rejoin)

3. Verify empty state (if no history)
   - Verify "No party history yet" message
   - Verify "Join or create a party to get started!" subtitle

4. Return to home
   - Click back button (chevron) in top-left
   - Verify returns to home screen

---

### Workflow 20: Sign Up & Login

> Tests email signup, email login, Google OAuth, and password reset flows.

**Prerequisites:** Browser with no active session (sign out first if needed)

1. Navigate to login page
   - Open https://linkparty.app (any page)
   - Verify redirect to /login (auth wall)
   - Verify "Welcome back" heading
   - Verify email input, password input, "Sign In" button
   - Verify "Continue with Google" button
   - Verify "Don't have an account? Sign up" link

2. Test email signup
   - Click "Sign up" link
   - Verify URL changes to /signup
   - Verify "Create your account" heading
   - Verify fields: Display name, Email, Password
   - Fill in test credentials
   - Click "Create Account"
   - Verify redirect or confirmation email message

3. Test email login
   - Navigate to /login
   - Enter email and password
   - Click "Sign In"
   - Verify redirect to home page
   - Verify "Hey, {displayName}" greeting

4. Test Google OAuth
   - Click "Continue with Google" button
   - [MANUAL] Complete Google sign-in flow (browser popup)
   - Verify callback redirect to /auth/callback
   - Verify redirect to home page
   - Verify authenticated state

5. Test password reset
   - Navigate to /login
   - Click "Forgot password?" link
   - Verify /reset-password page loads
   - Enter email address
   - Click "Send Reset Link"
   - [MANUAL] Check email for reset link

6. Verify authenticated home state
   - Verify greeting "Hey, {displayName}" visible
   - Verify Sign out, Profile, Notifications, History buttons
   - Verify "Start a Party" and "Join with Code" links

7. Test sign out
   - Click "Sign out" button (top-left)
   - Verify redirect to /login
   - Verify cannot access / directly (redirects to /login)

8. Verify session persistence
   - Sign in again
   - Close browser tab
   - Reopen https://linkparty.app
   - Verify still signed in (cookie-based session)

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

## Social & Profile Workflows

### Workflow 23: Profile Setup

> Tests editing user profile: display name, username, and avatar emoji.

**Prerequisites:** Signed in, on home screen

1. Navigate to profile page
   - Click the profile icon button (person silhouette) in top-right header
   - Verify profile page loads with "Profile" tab active
   - Verify four tabs visible: Profile, Friends, Requests, Blocked

2. Verify profile editor loads
   - Verify avatar picker shows current emoji (default: 🎉) displayed large
   - Verify 16 emoji options in a grid (🎉 🎸 🎭 🎪 🎵 🌟 🔥 🎯 🦊 🐻 🦁 🐱 🐶 🦄 🌈 🍕)
   - Verify "Display name" input with current name
   - Verify "Username" input with @-prefix

3. Change avatar
   - Click a different emoji (e.g., 🦊)
   - Verify selected emoji gets accent ring highlight and scales up
   - Verify large preview updates to show the new emoji

4. Edit display name
   - Clear the display name field
   - Type "New Display Name"
   - Verify text appears in field

5. Set username
   - Click the username field
   - Type "testuser123"
   - Verify input auto-lowercases and strips invalid characters
   - Wait for "Checking availability..." text
   - Verify either "Username available" (teal) or "Username already taken" (red) appears

6. Save profile
   - Click "Save Profile" button
   - Verify button shows loading spinner
   - Verify "Profile saved!" success message appears (teal text)
   - Verify success message disappears after 3 seconds

7. Return to home
   - Click back button (chevron) in top-left
   - Verify home screen shows updated greeting "Hey, New Display Name"

---

### Workflow 24: Send Friend Request from Party Room

> Tests adding a party member as a friend using the "+" button in the members list.

**Prerequisites:** In a party room with at least one other signed-in member

1. Locate add friend button
   - Find the "Members" section showing member count (e.g., "2 watching")
   - Identify a member who is NOT the current user and NOT already a friend
   - Verify a small "+" button appears next to their name

2. Send friend request
   - Click the "+" button next to the member's name
   - Verify the "+" button changes to show "Sent" label (muted text)

3. Verify request was sent
   - Navigate to /profile
   - Click "Requests" tab
   - Verify "Sent" section shows the outgoing request with the member's name

4. Verify from recipient side
   - In a second browser session (the other member), navigate to /profile
   - Click "Requests" tab
   - Verify "Incoming" section shows the friend request

5. Return to party
   - Navigate back to the party room
   - Verify the member still shows "Sent" label (not "+" button)

---

### Workflow 25: Accept Friend Request

> Tests accepting an incoming friend request from the profile Requests tab.

**Prerequisites:** Signed in, have an incoming friend request pending

1. Navigate to profile
   - Click profile icon in home screen header
   - Verify profile page loads

2. Check Requests tab badge
   - Verify "Requests" tab shows a badge count (e.g., orange circle with "1")
   - Click "Requests" tab

3. Verify incoming request
   - Verify "Incoming" section shows the friend request
   - Verify sender's avatar emoji, display name, and @username visible
   - Verify "Accept" and "Decline" buttons present

4. Accept the request
   - Click "Accept" button
   - Verify the request disappears from the Incoming section
   - Verify badge count decrements (or disappears if was 1)

5. Verify friendship created
   - Click "Friends" tab
   - Verify the accepted user now appears in the friends list
   - Verify their avatar, display name, and @username shown

6. Verify bidirectional
   - In the other user's session, navigate to /profile → Friends tab
   - Verify the accepting user appears in their friends list too

---

### Workflow 26: Decline/Cancel Friend Request

> Tests declining an incoming request and canceling an outgoing request.

**Prerequisites:** Signed in with both incoming and outgoing friend requests

1. Navigate to Requests tab
   - Click profile icon → click "Requests" tab
   - Verify both "Incoming" and "Sent" sections visible

2. Decline incoming request
   - Find an incoming request
   - Click "Decline" button
   - Verify the request disappears from the Incoming section
   - Verify badge count decrements

3. Verify decline effect
   - The declined user should be able to send a new request later
   - The declined user should NOT appear in the Friends tab

4. Cancel outgoing request
   - Find a sent/outgoing request in the "Sent" section
   - Click "Cancel" button
   - Verify the request disappears from the Sent section

5. Verify cancel effect
   - The target user's Requests tab should no longer show the incoming request

---

### Workflow 27: Remove Friend

> Tests removing an existing friend from the Friends tab with confirmation.

**Prerequisites:** Signed in, have at least one friend

1. Navigate to Friends tab
   - Click profile icon → click "Friends" tab
   - Verify friends list shows at least one friend

2. Locate friend to remove
   - Find a friend in the list
   - Verify avatar emoji, display name, @username, "Remove" and "Block" buttons visible

3. Initiate removal
   - Click "Remove" button
   - Verify button text changes to "Sure?" (confirmation state)

4. Confirm removal
   - Click "Sure?" button
   - Verify the friend disappears from the list

5. Verify removal
   - Verify friend count decremented
   - In the other user's session, verify the friendship is also removed from their Friends tab
   - Verify both users can send new friend requests to each other again

---

### Workflow 28: Block and Unblock User

> Tests blocking a user from the Friends tab, then unblocking from the Blocked tab.

**Prerequisites:** Signed in, have at least one friend

1. Navigate to Friends tab
   - Click profile icon → click "Friends" tab
   - Verify at least one friend visible

2. Locate block button
   - Find a friend in the list
   - Verify "Block" button visible next to "Remove"

3. Initiate block
   - Click "Block" button
   - Verify button text changes to "Block?" (confirmation state)

4. Confirm block
   - Click "Block?" button
   - Verify the user disappears from the Friends list
   - Verify friendship is removed (blocking auto-removes friendship)

5. Verify blocked user appears in Blocked tab
   - Click "Blocked" tab
   - Verify the blocked user appears in the list
   - Verify their avatar, display name, and @username shown
   - Verify "Unblock" button visible

6. Unblock user
   - Click "Unblock" button
   - Verify the user disappears from the Blocked list
   - Verify empty state shows "No blocked users" if list is now empty

7. Verify unblock effect
   - Click "Friends" tab
   - Verify the user does NOT appear (unblocking does not restore friendship)
   - Verify both users can now send friend requests to each other again

---

## Notification Workflows

### Workflow 29: Notification Bell and Dropdown

> Tests the notification bell icon, unread badge, and dropdown behavior.

**Prerequisites:** Signed in, on home screen

1. Locate notification bell
   - Verify bell icon visible in top-right header (between profile icon and history icon)
   - Note whether an unread badge (red circle with count) is present

2. Open notification dropdown
   - Click the bell icon
   - Verify dropdown appears below the bell
   - Verify "Notifications" header visible
   - If unread notifications exist: verify "Mark all read" button visible

3. Review notification list
   - Verify notifications listed in reverse chronological order
   - Verify each notification shows: icon (emoji), title text, relative timestamp (e.g., "5m ago")
   - Verify unread notifications have a slightly different background (darker)
   - If no notifications: verify "No notifications" empty state

4. Mark single notification as read
   - Click on an unread notification
   - Verify its background changes to the read state
   - Verify unread badge count decrements

5. Mark all as read
   - If unread notifications remain, click "Mark all read" button
   - Verify all notifications switch to read state
   - Verify unread badge disappears from the bell icon
   - Verify "Mark all read" button disappears

6. Close dropdown
   - Click outside the dropdown (or click the bell icon again)
   - Verify dropdown closes
   - Verify back to normal home screen view

---

### Workflow 30: Act on Notification

> Tests taking action on notifications: accepting friend requests and joining party invites.

**Prerequisites:** Signed in, have notifications with actionable items (friend request and/or party invite)

1. Open notifications
   - Click bell icon to open dropdown

2. Act on friend request notification
   - Find a notification of type "friend_request" (shows 👋 emoji and "sent you a friend request")
   - Verify "Accept" and "Decline" buttons visible inline
   - Click "Accept"
   - Verify the notification updates (buttons removed, marked as read)
   - Verify friendship is created (can verify in Friends tab later)

3. Act on party invite notification
   - Find a notification of type "party_invite" (shows 🎉 emoji and "invited you to [Party]")
   - Verify "Join" link visible
   - Click "Join"
   - Verify navigation to /join/[code] with the party code pre-filled

4. Verify friend accepted notification
   - After accepting a friend request, the sender should receive a "friend_accepted" notification
   - Verify it shows 🤝 emoji and "[Name] accepted your friend request"
   - Verify it has no action buttons (informational only)

5. Close notifications
   - Click outside dropdown to close
   - Verify dropdown closes

---

## Invitation Workflows

### Workflow 31: Invite Friends During Party Creation

> Tests using the FriendsPicker on the create party page to invite friends when creating a new party.

**Prerequisites:** Signed in, have at least one friend

1. Navigate to create party
   - Click "Start a Party" on home screen
   - Verify "Start a party" heading and form appears

2. Open invite friends section
   - Click "Invite friends" dropdown toggle (shows users icon + chevron)
   - Verify FriendsPicker expands below
   - Verify friend list appears with search input
   - Verify "Visible to friends" toggle visible below the picker

3. Select friends to invite
   - Click on a friend to select them
   - Verify accent border and checkmark indicator appears on selected friend
   - Verify "Invite friends (1)" count updates in the toggle label
   - Select additional friends if available

4. Enable visibility toggle
   - Toggle "Visible to friends" switch ON
   - Verify switch turns orange (active state)

5. Create the party
   - Enter a party name (optional)
   - Click "Create Party"
   - Verify party creation succeeds and navigates to party room

6. Verify invites sent
   - Selected friends should receive party_invite notifications
   - In a friend's session, click bell icon
   - Verify "invited you to [Party]" notification appears with "Join" link

---

### Workflow 32: Invite Friends from Party Room

> Tests the InviteModal in the party room with both Email and Friends tabs.

**Prerequisites:** In an active party room, signed in, have at least one friend

1. Open invite modal
   - Click the mail icon button in the party room header
   - Verify "Invite a Friend" modal slides up from bottom
   - Verify two tabs: "Email" and "Friends"
   - Verify Email tab is active by default

2. Send email invite
   - Verify email input field with placeholder "friend@example.com"
   - Type a valid email address (e.g., "test@example.com")
   - Verify optional personal message textarea visible
   - Type a personal message (optional)
   - Click "Send Invite" button
   - Verify button shows "Sending..." loading state
   - Verify "Invite sent!" success banner with checkmark
   - Verify modal auto-closes after ~1.5 seconds

3. Reopen modal for friend invite
   - Click the mail icon button again
   - Click "Friends" tab

4. Select friends
   - Verify FriendsPicker shows friend list with search
   - Click on friends to select them
   - Verify checkmark indicators on selected friends
   - Verify "Send Invites (N)" button shows count

5. Send friend invites
   - Click "Send Invites (N)" button
   - Verify "Sending..." loading state
   - Verify "Invites sent!" success banner
   - Verify modal auto-closes

6. Verify email invite deduplication
   - Reopen modal, go to Email tab
   - Enter the same email address used in step 2
   - Click "Send Invite"
   - Verify error message: "This person has already been invited to this party."

7. Cancel invite
   - Reopen modal
   - Click "Cancel" button
   - Verify modal closes without sending

---

### Workflow 33: Friends' Active Parties Feed

> Tests viewing and joining friends' visible active parties from the home screen.

**Prerequisites:** Signed in, have a friend who has an active party with "Visible to friends" enabled

1. Verify friends' parties section
   - On home screen, verify "Friends are partying" section heading visible
   - Verify party cards displayed below the heading

2. Review party card
   - Verify each card shows: 🎉 emoji icon, party name (or "Unnamed party"), host name, member count (e.g., "Alice · 3 watching")
   - Verify "Join" label on the right side of the card

3. Join friend's party
   - Click on a friend's party card
   - Verify navigation to /join/[code] with the party code pre-filled
   - Complete the join flow (enter name if needed, click Join)
   - Verify party room loads

4. Verify auto-refresh
   - Return to home screen
   - Verify the party list updates (joined party may now show updated member count)
   - Note: feed refreshes every 30 seconds automatically

5. Verify no section when empty
   - If no friends have visible active parties, verify the "Friends are partying" section is NOT shown
   - Home screen shows only the hero section with "Start a Party" and "Join with Code"

---

## Abuse Prevention Workflows

### Workflow 34: Password-Protected Party

> Tests creating a party with a password and joining it with the correct/incorrect password.

**Prerequisites:** Signed in, on home screen

1. Create password-protected party
   - Click "Start a Party"
   - Enter a party name (e.g., "Secret Party")
   - Toggle "Password protect" switch ON (turns orange)
   - Verify password input field appears below the toggle
   - Type "mypassword" in the password field
   - Click "Create Party"
   - Verify party room loads

2. Note the party code
   - Record the 6-character code from the party header

3. Attempt to join without password (second session)
   - In a second browser session, navigate to /join
   - Enter the party code
   - Click "Join Party"
   - Verify the server responds with a password prompt (needsPassword: true)
   - Verify password input field appears

4. Enter wrong password
   - Type "wrongpassword" in the password field
   - Click "Join Party"
   - Verify "Incorrect party password." error message appears

5. Enter correct password
   - Clear the password field
   - Type "mypassword"
   - Click "Join Party"
   - Verify party room loads successfully

6. Verify membership
   - Verify the joining user appears in the members list
   - Verify host sees updated member count

7. Re-join skips password
   - Leave the party and re-join with the same session
   - Verify re-join succeeds without requiring password again (existing member upsert)

---

### Workflow 35: Party Creation Limit

> Tests that users cannot create more than 5 active parties.

**Prerequisites:** Signed in, no active parties (or close existing ones)

1. Create parties up to limit
   - Create 5 parties in succession using "Start a Party" flow
   - Note each party code for reference
   - Verify each party creates successfully

2. Attempt 6th party
   - Click "Start a Party" again
   - Fill in party name
   - Click "Create Party"
   - Verify error message: "You can have at most 5 active parties. Close or let one expire first."
   - Verify party is NOT created

3. Verify error display
   - Verify error appears as red text below the form
   - Verify the form is still editable (can retry after closing a party)

4. Verify limit resets after expiry
   - Wait for a party to expire (24h default) or manually note this behavior
   - After expiry, creating a new party should succeed

5. Verify member limit display
   - Note: Member limit (20) and image limit (20) are enforced server-side
   - These limits show as errors only when the limit is actually hit during join or image upload

### Workflow 36: Email Events Dashboard

> Tests the admin email monitoring dashboard for viewing delivery stats and events.

**Prerequisites:** Signed in, navigate to /admin/emails

1. Navigate to email dashboard
   - Navigate to https://linkparty.app/admin/emails
   - Verify "Email Events" heading loads
   - Verify stats cards at top: Delivery rate, Open rate, Total sent, Bounced

2. Review event list
   - Verify table/list of email events displayed
   - Verify each event shows: recipient, event type, timestamp
   - Verify event types include: sent, delivered, bounced, opened, clicked

3. Filter events
   - Use search field to filter by recipient email
   - Verify filtered results update
   - Use event type filter (if available)
   - Verify filter correctly narrows results

4. Verify pagination
   - If more than 20 events, verify pagination controls
   - Click next page
   - Verify new events load

5. Return home
   - Navigate back to home screen
   - Verify normal home screen loads

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

| Workflow                      | Depends On                                      |
| ----------------------------- | ----------------------------------------------- |
| 3 (Join Party)                | 2 (Create Party) - needs party code             |
| 4 (Join via Deep Link)        | 2 (Create Party) - needs party code             |
| 5 (Leave Party)               | 2 or 3 (active party)                           |
| 6-13 (Content)                | 2 or 3 (active party)                           |
| 14 (Image Lightbox)           | 13 (image in queue)                             |
| 15-17 (Queue Mgmt)            | 6-13 (items in queue)                           |
| 18 (TV Mode)                  | 2 or 3 (active party)                           |
| 23 (Profile Setup)            | 20 (Google OAuth) or signed in                  |
| 24 (Send Friend Request)      | 2 or 3 (active party with 2+ signed-in members) |
| 25 (Accept Friend Request)    | 24 (pending incoming request)                   |
| 26 (Decline/Cancel Request)   | 24 (pending requests)                           |
| 27 (Remove Friend)            | 25 (accepted friendship)                        |
| 28 (Block/Unblock)            | 25 (accepted friendship)                        |
| 29 (Notification Bell)        | 24 or 25 (notifications from friend actions)    |
| 30 (Act on Notification)      | 24 + 31 or 32 (actionable notifications)        |
| 31 (Invite Friends - Create)  | 25 (has friends)                                |
| 32 (Invite from Party Room)   | 2 or 3 (active party) + 25 (has friends)        |
| 33 (Friends' Active Parties)  | 25 (has friends) + friend has visible party     |
| 34 (Password-Protected Party) | None (standalone)                               |
| 35 (Party Creation Limit)     | None (standalone, but creates 5 parties)        |
| 36 (Email Events Dashboard)   | None (standalone, requires sent emails)         |

**Suggested execution order:**

_Auth & setup:_ 20 → 1 → 23

_Core flows:_ 2 → 6 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 5 → 3 → 4 → 19 → 21 → 22

_Social flows (requires 2 users):_ 24 → 25 → 29 → 30 → 27 → 26 → 28

_Invitation flows:_ 31 → 32 → 33

_Abuse prevention:_ 34 → 35

_Admin:_ 36

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

---

### 2026-02-16: Post-Security-Hardening Smoke Test (Production)

**Environment:** Chrome (claude-in-chrome) on https://linkparty.app
**Context:** After PR #59 (security/perf hardening) and S8 hotfix (ac07c95)
**Party:** WP6GCU (id: 27124d1c-5f60-4485-9a7d-10ada210f7f8)

| Workflow                | Result | Notes                                                       |
| ----------------------- | ------ | ----------------------------------------------------------- |
| WF1: App Launch         | PASS   | Home loads, all nav elements visible                        |
| WF2: Create Party       | PASS   | Party WP6GCU created, room loaded with all elements         |
| WF9: Add Simple Note    | PASS   | Note added to queue, visible in Now Showing                 |
| WF18: TV Mode           | PASS   | Note displayed in TV mode, exit works                       |
| WF4: Join via Deep Link | PASS   | /join/WP6GCU pre-fills code, join succeeds                  |
| WF5: Leave Party        | PASS   | Navigates to home, member count decrements                  |
| WF19: View History      | PASS   | History page loads, shows empty state correctly             |
| Profile Page            | PASS   | 4 tabs (Profile, Friends, Requests, Blocked), all fields OK |

**Key findings:**

1. S8 Bearer token requirement works correctly — create/join pages pass auth headers
2. Auth wall enforced — all pages redirect to /login when unauthenticated
3. No regressions from security hardening in core user flows
4. Profile social tabs (Friends, Requests, Blocked) fully functional
