# Multi-User Browser Workflows

**Target**: https://linkparty.app
**Execution**: Claude Code Agent Teams — Host agent (Tab 1) + Guest agent (Tab 2)
**Last updated**: 2026-02-13

---

## Workflow 1: Create and Join Party

### 1.1 [HOST] Create a new party

- Navigate to linkparty.app/create
- Enter party name "Multi-User Test"
- Leave password empty
- Click "Start a Party"
- Verify party room loads with party code visible
- Screenshot: party room with code
- **SYNC → GUEST: party code and party URL**

### 1.2 [GUEST] Join the party

- Navigate to linkparty.app/join
- Enter display name "Guest Tester"
- Enter party code received from HOST
- Click "Join Party"
- Verify party room loads
- Screenshot: guest's party room view

### 1.3 [GUEST] Confirm joined

- **SYNC → HOST: joined successfully**

### 1.4 [HOST] Verify guest appeared

- Verify member count shows "2 watching"
- Screenshot: member count showing 2

---

## Workflow 2: Realtime Content Sync

_Prerequisite: Workflow 1 completed (both users in same party)_

### 2.1 [HOST] Add a YouTube link

- Click the + button to add content
- Select "Link" tab
- Enter YouTube URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
- Click "Add to Queue"
- Verify item appears in queue with YouTube thumbnail
- Screenshot: HOST queue with YouTube item
- **SYNC → GUEST: YouTube link added**

### 2.2 [GUEST] Verify YouTube link appeared

- Verify queue shows the YouTube item added by HOST
- Screenshot: GUEST queue showing YouTube item

### 2.3 [GUEST] Add a note

- Click the + button to add content
- Select "Note" tab
- Enter note text: "Guest's test note"
- Click "Add to Queue"
- Verify note appears in queue
- Screenshot: GUEST queue with both items
- **SYNC → HOST: note added**

### 2.4 [HOST] Verify note appeared

- Verify queue shows both items (YouTube + note)
- Screenshot: HOST queue with both items

---

## Workflow 3: Queue Advance Sync

_Prerequisite: Workflow 2 completed (queue has items)_

### 3.1 [HOST] Advance queue

- Click "Show Next" button
- Verify NOW SHOWING section displays the first queue item
- Screenshot: HOST view with NOW SHOWING
- **SYNC → GUEST: queue advanced**

### 3.2 [GUEST] Verify NOW SHOWING

- Verify NOW SHOWING section matches what HOST sees
- Screenshot: GUEST view with NOW SHOWING

### 3.3 [HOST] Advance again

- Click "Show Next" again
- Verify NOW SHOWING updates to next item
- Screenshot: HOST view with updated NOW SHOWING
- **SYNC → GUEST: advanced again**

### 3.4 [GUEST] Verify second advance

- Verify NOW SHOWING updated to match HOST
- Screenshot: GUEST view with updated NOW SHOWING

---

## Workflow 4: Toggle Completion Sync

_Prerequisite: Workflow 1 completed_

### 4.1 [GUEST] Add a note to toggle

- Click + button, select "Note" tab
- Enter note text: "Toggle test note"
- Click "Add to Queue"
- Verify note appears in queue
- **SYNC → HOST: note added for toggle test**

### 4.2 [HOST] Verify note appeared

- Verify "Toggle test note" is in the queue

### 4.3 [HOST] Mark note complete

- Click the checkbox next to "Toggle test note"
- Verify note shows strikethrough styling
- Screenshot: HOST view with completed note
- **SYNC → GUEST: note marked complete**

### 4.4 [GUEST] Verify completion synced

- Verify "Toggle test note" shows strikethrough styling
- Screenshot: GUEST view with completed note

### 4.5 [GUEST] Uncheck the note

- Click the checkbox to uncheck "Toggle test note"
- Verify strikethrough removed
- **SYNC → HOST: note unchecked**

### 4.6 [HOST] Verify unchecked synced

- Verify "Toggle test note" no longer has strikethrough
- Screenshot: HOST view with restored note

---

## Workflow 5: Drag-and-Drop Reorder Sync

_Prerequisite: Workflow 1 completed_

### 5.1 [HOST] Add three items

- Add a YouTube link: https://www.youtube.com/watch?v=dQw4w9WgXcQ
- Add a note: "Note Alpha"
- Add a note: "Note Beta"
- Verify all 3 items appear in queue in order
- Screenshot: HOST queue with 3 items
- **SYNC → GUEST: 3 items added**

### 5.2 [GUEST] Verify 3 items

- Verify queue shows all 3 items in same order as HOST
- Screenshot: GUEST queue with 3 items

### 5.3 [HOST] Reorder via drag-and-drop

- Drag the last item ("Note Beta") to the first position
- Verify queue order changed
- Screenshot: HOST queue with new order
- **SYNC → GUEST: reorder complete**

### 5.4 [GUEST] Verify reorder synced

- Verify queue order matches HOST's new order
- Screenshot: GUEST queue with synced order

---

## Workflow 6: Password-Protected Join

### 6.1 [HOST] Create password-protected party

- Navigate to linkparty.app/create
- Enter party name "Secret Party"
- Enter password "test123"
- Click "Start a Party"
- Verify party room loads
- Screenshot: party room
- **SYNC → GUEST: party code (but NOT the password)**

### 6.2 [GUEST] Try joining without password

- Navigate to linkparty.app/join
- Enter display name "Guest Tester"
- Enter party code from HOST
- Click "Join Party"
- Verify password field appears
- Screenshot: password prompt

### 6.3 [GUEST] Enter wrong password

- Enter password "wrong"
- Click "Join Party"
- Verify error message "Incorrect party password." appears
- Screenshot: error message

### 6.4 [GUEST] Enter correct password

- Clear password field
- Enter password "test123"
- Click "Join Party"
- Verify party room loads successfully
- Screenshot: GUEST in party room
- **SYNC → HOST: joined with correct password**

### 6.5 [HOST] Verify guest joined

- Verify member count shows "2 watching"
- Screenshot: member count

---

## Workflow 7: TV Mode Sync

_Prerequisite: Workflow 2 completed (queue has items)_

### 7.1 [HOST] Enter TV mode

- Click the TV mode button
- Verify TV mode view loads (full-screen content display)
- Screenshot: HOST TV mode view
- **SYNC → GUEST: HOST is in TV mode**

### 7.2 [HOST] Advance in TV mode

- Click to advance to next item in TV mode
- Verify content updates
- Screenshot: HOST TV mode with next item
- **SYNC → GUEST: advanced in TV mode**

### 7.3 [GUEST] Verify TV mode advance synced

- Verify NOW SHOWING section updated in regular view
- Screenshot: GUEST regular view showing synced item

### 7.4 [GUEST] Add content while HOST is in TV mode

- Click + button, add a note: "Added during TV mode"
- Click "Add to Queue"
- **SYNC → HOST: content added during TV mode**

### 7.5 [HOST] Verify content in TV mode

- Verify queue count updated in TV mode view
- Screenshot: HOST TV mode showing updated queue

---

## Workflow 8: Guest Leave and Rejoin

_Prerequisite: Workflow 1 completed_

### 8.1 [HOST] Confirm starting state

- Verify member count shows "2 watching"
- Screenshot: member count at 2

### 8.2 [GUEST] Leave the party

- Click "Leave Party" button
- Verify redirected to home page
- Screenshot: GUEST on home page
- **SYNC → HOST: left the party**

### 8.3 [HOST] Verify member count decreased

- Wait up to 5 seconds for realtime update
- Verify member count shows "1 watching"
- Screenshot: member count at 1
- **SYNC → GUEST: verified count decreased**

### 8.4 [GUEST] Rejoin the party

- Navigate to linkparty.app/join
- Enter display name "Guest Tester"
- Enter the same party code
- Click "Join Party"
- Verify party room loads
- **SYNC → HOST: rejoined**

### 8.5 [HOST] Verify member count restored

- Verify member count shows "2 watching"
- Screenshot: member count back at 2

---

## Workflow 9: Deep Link Join

### 9.1 [HOST] Create a party

- Navigate to linkparty.app/create
- Enter party name "Deep Link Test"
- Click "Start a Party"
- Verify party room loads
- Note the party code (e.g., ABC123)
- Screenshot: party room with code
- **SYNC → GUEST: party code for deep link**

### 9.2 [GUEST] Join via deep link

- Navigate directly to linkparty.app/join/CODE (using code from HOST)
- Verify party code is pre-filled in the input
- Enter display name "Deep Link Guest"
- Click "Join Party"
- Verify party room loads
- Screenshot: GUEST in party room
- **SYNC → HOST: joined via deep link**

### 9.3 [HOST] Verify deep link join

- Verify member count shows "2 watching"
- Screenshot: member count

---

## Workflow 10: Simultaneous Content Adds

_Prerequisite: Workflow 1 completed_

### 10.1 [HOST] Prepare to add content

- Click the + button
- Select "Link" tab
- Enter YouTube URL: https://www.youtube.com/watch?v=jNQXAC9IVRw
- Do NOT click "Add to Queue" yet
- **SYNC → GUEST: ready to add simultaneously**

### 10.2 [GUEST] Prepare to add content

- Click the + button
- Select "Note" tab
- Enter note text: "Simultaneous guest note"
- **SYNC → HOST: ready to add simultaneously**

### 10.3 [HOST] Submit content

- Click "Add to Queue"
- **SYNC → GUEST: submitted**

### 10.4 [GUEST] Submit content

- Click "Add to Queue"

### 10.5 [HOST] Verify both items appeared

- Wait 3 seconds for realtime sync
- Verify queue contains both items (YouTube link + note)
- Screenshot: HOST queue with both items

### 10.6 [GUEST] Verify both items appeared

- Wait 3 seconds for realtime sync
- Verify queue contains both items
- Screenshot: GUEST queue with both items

---

## Test Results Log

| Workflow | Date | Host Result | Guest Result | Notes |
| -------- | ---- | ----------- | ------------ | ----- |
|          |      |             |              |       |
