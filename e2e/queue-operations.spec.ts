import { test, expect, type Page } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

// Helper: finish CSS animations on a dialog to prevent WebKit stability issues
async function finishDialogAnimations(page: Page, role: string, namePattern?: RegExp): Promise<void> {
  const dialog = namePattern ? page.getByRole(role, { name: namePattern }) : page.getByRole(role)
  await dialog.evaluate((el) => el.getAnimations({ subtree: true }).forEach((a) => a.finish()))
}

// Helper: add a note to the queue and wait for modal to close
async function addNoteToQueue(page: Page, noteText: string): Promise<void> {
  await page.locator('.fab').click()
  const modal = page.getByRole('dialog', { name: /add content to queue/i })
  await expect(modal).toBeVisible()
  await finishDialogAnimations(page, 'dialog', /add content to queue/i)
  await page.getByRole('button', { name: /write a note/i }).click()
  await page.getByPlaceholder(/share a thought/i).fill(noteText)
  await page.getByRole('button', { name: /preview/i }).click()
  await page.getByRole('button', { name: /add to queue/i }).click()
  await expect(page.getByText('Added to queue!')).toBeVisible()
  await expect(modal).toBeHidden({ timeout: 10000 })
}

test.describe('Queue Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Inject fake auth cookie to pass auth middleware
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    // Clear localStorage and create a party first
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Navigate to create party (use .first() because desktop and mobile versions both exist)
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Create party (no display name input — derived from auth user)
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Wait for party room to load - look for party code
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })

  test('opens add content modal via FAB button', async ({ page }) => {
    // Click the FAB (floating action button) with the plus icon
    await page.locator('.fab').click()

    // The add content modal should be visible
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeVisible()
    await expect(page.getByText('Add to queue')).toBeVisible()

    // Should show the URL input and note/image options
    await expect(page.getByPlaceholder(/youtube, twitter/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /write a note/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /upload an image/i })).toBeVisible()
  })

  test('add a note to the queue', async ({ page }) => {
    // Open the add content modal
    await page.locator('.fab').click()
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeVisible()

    // Click "Write a note" button
    await page.getByRole('button', { name: /write a note/i }).click()

    // Should transition to the note editor step
    await expect(page.getByText('Write a note')).toBeVisible()

    // Type a note
    const noteText = 'This is an E2E test note for queue operations'
    await page.getByPlaceholder(/share a thought/i).fill(noteText)

    // Click "Preview" to go to the preview step
    await page.getByRole('button', { name: /preview/i }).click()

    // Should show the preview step with the note content
    await expect(page.getByText('Add to queue?')).toBeVisible()
    await expect(page.getByText('Your note')).toBeVisible()
    await expect(page.getByText(noteText)).toBeVisible()

    // Click "Add to Queue" to add the note
    await page.getByRole('button', { name: /add to queue/i }).click()

    // Should show success state
    await expect(page.getByText('Added to queue!')).toBeVisible()

    // Wait for modal to close (it closes after 1.5 seconds)
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeHidden({ timeout: 5000 })

    // The note should appear in the queue
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 5000 })
  })

  test('URL input detects YouTube URL type', async ({ page }) => {
    // Open the add content modal
    await page.locator('.fab').click()
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeVisible()

    // Type a YouTube URL
    await page.getByPlaceholder(/youtube, twitter/i).fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // The "Continue" button should become enabled
    const continueButton = page.getByRole('button', { name: /continue/i })
    await expect(continueButton).toBeEnabled()
  })

  test('URL input keeps Continue disabled for invalid URLs', async ({ page }) => {
    // Open the add content modal
    await page.locator('.fab').click()
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeVisible()

    // Type an invalid URL (not youtube, twitter, or reddit)
    await page.getByPlaceholder(/youtube, twitter/i).fill('https://www.google.com')

    // The "Continue" button should be disabled
    const continueButton = page.getByRole('button', { name: /continue/i })
    await expect(continueButton).toBeDisabled()
  })

  test('click a queue item to open actions sheet', async ({ page }) => {
    // Add two notes: the first occupies "NOW SHOWING", the second goes to "Up next" queue list
    await addNoteToQueue(page, 'First note occupies now showing')
    await addNoteToQueue(page, 'Test note for actions sheet')

    // Click on the queue item in "Up next" to open the actions sheet
    await page.getByText('Test note for actions sheet').click()

    // The actions sheet should be visible
    await expect(page.getByRole('dialog', { name: /queue item actions/i })).toBeVisible()

    // Should show available actions
    await expect(page.getByText('Show Next')).toBeVisible()
    await expect(page.getByText('Remove from Queue')).toBeVisible()

    // Note-specific actions
    await expect(page.getByText('Mark Complete')).toBeVisible()
    await expect(page.getByText('View Note')).toBeVisible()
    await expect(page.getByText('Edit Note')).toBeVisible()
  })

  test('delete a queue item via actions sheet', async ({ page }) => {
    // Add notes: first occupies "NOW SHOWING", others go to "Up next" queue list
    await addNoteToQueue(page, 'First note occupies now showing')
    await addNoteToQueue(page, 'Note to be deleted')
    await addNoteToQueue(page, 'Note to keep in queue')

    // Click on the item in "Up next" to open the actions sheet
    await page.getByText('Note to be deleted').click()

    // The actions sheet should be visible — finish its animation for WebKit stability
    const actionsSheet = page.getByRole('dialog', { name: /queue item actions/i })
    await expect(actionsSheet).toBeVisible()
    await finishDialogAnimations(page, 'dialog', /queue item actions/i)

    // Click "Remove from Queue"
    await page.getByText('Remove from Queue').click()

    // The delete confirmation dialog should appear — finish its animation too
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await finishDialogAnimations(page, 'alertdialog')
    await expect(page.getByText('Remove item?')).toBeVisible()

    // Click "Remove" to confirm deletion
    await page.getByRole('button', { name: /^remove$/i }).click()

    // Wait for the confirmation dialog to dismiss
    await expect(page.getByRole('alertdialog')).toBeHidden({ timeout: 10000 })

    // The item should be removed from the queue
    await expect(page.getByText('Note to be deleted')).toBeHidden({ timeout: 10000 })

    // Other items should still be visible
    await expect(page.getByText('Note to keep in queue')).toBeVisible()
  })

  test('cancel delete does not remove the item', async ({ page }) => {
    // Add two notes: first occupies "NOW SHOWING", second goes to "Up next"
    await addNoteToQueue(page, 'First note occupies now showing')
    await addNoteToQueue(page, 'Note for cancel delete test')

    // Click on the item to open the actions sheet
    await page.getByText('Note for cancel delete test').click()

    // Click "Remove from Queue"
    await page.getByText('Remove from Queue').click()

    // The delete confirmation dialog should appear
    await expect(page.getByRole('alertdialog')).toBeVisible()

    // Click "Cancel" to dismiss the dialog
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /cancel/i })
      .click()

    // The dialog should be dismissed
    await expect(page.getByRole('alertdialog')).toBeHidden()

    // The item should still be visible in the queue
    await expect(page.getByText('Note for cancel delete test')).toBeVisible()
  })

  test('close actions sheet with Cancel button', async ({ page }) => {
    // Add two notes: first occupies "NOW SHOWING", second goes to "Up next"
    await addNoteToQueue(page, 'First note occupies now showing')
    await addNoteToQueue(page, 'Note for close actions test')

    // Click on a queue item
    await page.getByText('Note for close actions test').click()

    // The actions sheet should be visible
    await expect(page.getByRole('dialog', { name: /queue item actions/i })).toBeVisible()

    // Click Cancel to close the actions sheet
    await page
      .getByRole('dialog', { name: /queue item actions/i })
      .getByRole('button', { name: /cancel/i })
      .click()

    // The actions sheet should be dismissed
    await expect(page.getByRole('dialog', { name: /queue item actions/i })).toBeHidden()
  })

  test('close add content modal with Escape key', async ({ page }) => {
    // Open the add content modal
    await page.locator('.fab').click()
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeVisible()

    // Press Escape to close
    await page.keyboard.press('Escape')

    // The modal should be dismissed
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeHidden()
  })

  test('note character counter updates as user types', async ({ page }) => {
    // Open the add content modal
    await page.locator('.fab').click()
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeVisible()

    // Click "Write a note"
    await page.getByRole('button', { name: /write a note/i }).click()

    // Type some text
    await page.getByPlaceholder(/share a thought/i).fill('Hello world')

    // The character counter should reflect the text length
    await expect(page.getByText('11/1000')).toBeVisible()
  })

  test('note Preview button is disabled when note is empty', async ({ page }) => {
    // Open the add content modal
    await page.locator('.fab').click()
    await expect(page.getByRole('dialog', { name: /add content to queue/i })).toBeVisible()

    // Click "Write a note"
    await page.getByRole('button', { name: /write a note/i }).click()

    // Without typing anything, the Preview button should be disabled
    await expect(page.getByRole('button', { name: /preview/i })).toBeDisabled()

    // Type something
    await page.getByPlaceholder(/share a thought/i).fill('Some text')

    // Now Preview should be enabled
    await expect(page.getByRole('button', { name: /preview/i })).toBeEnabled()
  })
})
